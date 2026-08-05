import { NextResponse } from 'next/server';
import { hasRole, ROLES } from '../../../lib/auth';
import { sb, tables } from '../../../lib/supabase';
import { ensurePromotionCoupons, listPromotionCoupons } from '../../../lib/promotion-coupons';
import { decodeProductLabel, encodeProductLabel } from '../../../lib/product-pricing';

const publicPromotion=promotion=>{const product=decodeProductLabel(promotion?.product_label);return{...promotion,product_label:product.label,reference_price_ttc:product.referencePrice,price_customized:product.customPrice}};

function cleanPromotion(value) {
  const title = String(value?.title || '').trim();
  const description = String(value?.description || '').trim();
  const startAt = new Date(value?.start_at || value?.startAt || '');
  const endAt = new Date(value?.end_at || value?.endAt || '');
  const rawRate = value?.discount_rate ?? value?.discountRate;
  const discountRate = rawRate === '' || rawRate == null ? null : Number(rawRate);
  if (!title) throw new Error('Titre obligatoire.');
  if (!description) throw new Error('Description obligatoire.');
  if (Number.isNaN(startAt.getTime())) throw new Error('Date de début invalide.');
  if (Number.isNaN(endAt.getTime())) throw new Error('Date de fin invalide.');
  if (endAt <= startAt) throw new Error('La date de fin doit être postérieure à la date de début.');
  if (discountRate != null && (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100)) throw new Error('La remise doit être comprise entre 0 et 100.');
  return {
    title,
    description,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    discount_rate: discountRate,
    discount_label: String(value?.discount_label || value?.discountLabel || '').trim(),
    product_label: encodeProductLabel(value?.product_label || value?.productLabel,value?.reference_price_ttc??value?.referencePrice,Boolean(value?.price_customized??value?.customPrice)),
    active: Boolean(value?.active),
    coupon_enabled: Boolean(value?.coupon_enabled ?? value?.couponEnabled)
  };
}

export async function GET(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis' }, { status: 403 });
  try {
    const [promotions, coupons] = await Promise.all([
      sb(`${tables.promotions}?select=*&order=created_at.desc`),
      listPromotionCoupons()
    ]);
    return NextResponse.json({ promotions:promotions.map(publicPromotion), coupons });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis' }, { status: 403 });
  try {
    const body = cleanPromotion(await request.json());
    const rows = await sb(tables.promotions, { method: 'POST', body: { ...body, created_at: new Date().toISOString() } });
    const promotion = rows[0];
    try {
      const coupons = await ensurePromotionCoupons(promotion);
      return NextResponse.json({ ok: true, promotion:publicPromotion(promotion), coupons });
    } catch (error) {
      return NextResponse.json({ ok: false, reason: 'coupon_sync_failed', promotion:publicPromotion(promotion), error: error.message }, { status: 207 });
    }
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis' }, { status: 403 });
  try {
    const input = await request.json();
    const id = String(input?.id || '').trim();
    if (!id) return NextResponse.json({ ok: false, error: 'Promotion manquante.' }, { status: 400 });
    const body = typeof input.active === 'boolean' && Object.keys(input).every((key) => ['id', 'active'].includes(key))
      ? { active: input.active }
      : cleanPromotion(input);
    const rows = await sb(`${tables.promotions}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body });
    const promotion = rows[0];
    if (!promotion) return NextResponse.json({ ok: false, error: 'Promotion introuvable.' }, { status: 404 });
    try {
      const coupons = await ensurePromotionCoupons(promotion);
      return NextResponse.json({ ok: true, promotion:publicPromotion(promotion), coupons });
    } catch (error) {
      return NextResponse.json({ ok: false, reason: 'coupon_sync_failed', promotion:publicPromotion(promotion), error: error.message }, { status: 207 });
    }
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
