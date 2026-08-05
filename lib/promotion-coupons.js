import { randomBytes } from 'node:crypto';
import { sb, tables, loyalty } from './supabase';
import { decodeProductLabel } from './product-pricing';

export async function listPromotionCoupons() {
  const [coupons, members] = await Promise.all([
    sb(`${loyalty.coupons}?select=*&order=created_at.desc&limit=5000`),
    sb(`${tables.members}?select=id,first_name,last_name,email&limit=10000`)
  ]);
  const memberById = new Map(members.map((member) => [member.id, member]));
  return coupons.map((coupon) => ({ ...coupon, member: memberById.get(coupon.member_id) || null }));
}

export async function ensurePromotionCoupons(promotion) {
  if (!promotion?.id || !promotion.active || !promotion.coupon_enabled) return { created: 0 };

  const [members, existing] = await Promise.all([
    sb(`${tables.members}?select=id&limit=10000`),
    sb(`${loyalty.coupons}?promotion_id=eq.${encodeURIComponent(promotion.id)}&select=member_id,token&limit=10000`)
  ]);
  const existingMemberIds = new Set(existing.map((coupon) => coupon.member_id).filter(Boolean));
  const missing = members.filter((member) => !existingMemberIds.has(member.id));
  const product=decodeProductLabel(promotion.product_label);
  if (!missing.length) { await syncUnusedPromotionCoupons(promotion.id,product.label,product.referencePrice); return { created: 0 }; }

  const rows = missing.map((member) => ({
    promotion_id: promotion.id,
    member_id: member.id,
    token: randomBytes(24).toString('hex'),
    expires_at: promotion.end_at,
    discount_rate: Number(promotion.discount_rate || 0),
    product_label: product.label || null,
    original_amount_ttc: product.referencePrice
  }));

  await sb(`${loyalty.coupons}?on_conflict=promotion_id,member_id`, {
    method: 'POST',
    body: rows,
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }
  });
  await syncUnusedPromotionCoupons(promotion.id,product.label,product.referencePrice);
  return { created: rows.length };
}

export async function syncUnusedPromotionCoupons(promotionId,productLabel,referencePrice){await sb(`${loyalty.coupons}?promotion_id=eq.${encodeURIComponent(promotionId)}&used_at=is.null`,{method:'PATCH',body:{product_label:productLabel||null,original_amount_ttc:referencePrice}})}
