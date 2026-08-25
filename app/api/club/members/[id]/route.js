import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../../lib/auth';
import { loyalty, sb, tables } from '../../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
export async function GET(request, { params }) {
  if (!hasAnyRole(request, allowed)) return NextResponse.json({ error: 'Accès Fidélité requis' }, { status: 403 });
  try {
    const id = encodeURIComponent(params.id);
    const [members, events, rawCoupons] = await Promise.all([
      sb(`${tables.members}?id=eq.${id}&select=*`),
      sb(`${tables.history}?member_id=eq.${id}&select=*&order=created_at.desc&limit=2000`),
      sb(`${loyalty.coupons}?member_id=eq.${id}&select=*,club_promotions(title)&order=created_at.desc`),
    ]);
    const source = members[0];
    if (!source) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    const history = events.slice(0,100).map((event) => ({ ...event, action: event.event_type === 'passage' ? 'stamp' : 'reward' }));
    const coupons = rawCoupons.map((coupon) => ({ ...coupon, code: coupon.token, label: coupon.club_promotions?.title || coupon.product_label || 'Coupon promotionnel', status: coupon.used_at ? 'redeemed' : coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now() ? 'expired' : 'available', issued_at: coupon.created_at, redeemed_at: coupon.used_at }));
    const passages=events.filter((event)=>event.event_type==='passage'),usedCoupons=coupons.filter((coupon)=>coupon.used_at),lastUsedCoupon=usedCoupons.reduce((latest,coupon)=>new Date(coupon.used_at)>new Date(latest?.used_at||0)?coupon:latest,null);
    const member = {
      ...source,
      name: [source.first_name, source.last_name].filter(Boolean).join(' ') || source.email || source.personal_code,
      code: source.personal_code,
      stamps: Number(source.loyalty_points) || 0,
      phone: source.phone || source.telephone || source.phone_number || '',
      visits: passages.length,
      last_passage_at: passages[0]?.created_at || passages[0]?.event_day || null,
      rewards_count: events.filter((event) => event.event_type === 'reward').length,
      coupons_available: coupons.filter((coupon) => coupon.status === 'available').length,
      coupons_used: usedCoupons.length,
      promotion_savings: usedCoupons.reduce((sum,coupon)=>sum+Number(coupon.discount_amount_ttc||0),0),
      last_promotion_used: lastUsedCoupon?{label:lastUsedCoupon.label,used_at:lastUsedCoupon.used_at}:null,
    };
    return NextResponse.json({ member, history, coupons, stampsRequired: loyalty.stampsRequired, rewardLabel: loyalty.rewardLabel });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
