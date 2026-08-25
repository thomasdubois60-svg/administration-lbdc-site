import { NextResponse } from 'next/server';
import { hasRole, ROLES } from '../../../../lib/auth';
import { configured, loyalty, sb, tables } from '../../../../lib/supabase';

const dayKey=value=>new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));

export async function GET(request) {
  if (!hasRole(request, ROLES.EMPLOYEE)) return NextResponse.json({ error: 'Accès Administration requis' }, { status: 403 });
  if (!configured()) return NextResponse.json({ configured:false,members:0,newMembersToday:0,newMembers7Days:0,passagesToday:0,passages7Days:0,promotionsActive:0,subscribers:0,couponsUsedToday:0,promotionRevenueToday:0,promotionDiscountsToday:0,promotionUsage30Days:0 });
  try {
    const [members, history, promos, subs, coupons] = await Promise.all([
      sb(`${tables.members}?select=id,created_at&limit=10000`),
      sb(`${tables.history}?select=event_type,event_day,created_at&order=created_at.desc&limit=10000`),
      sb(`${tables.promotions}?select=id,active,start_at,end_at`),
      sb(`${tables.subscriptions}?select=id&limit=10000`),
      sb(`${loyalty.coupons}?select=created_at,used_at,final_amount_ttc,discount_amount_ttc&limit=10000`),
    ]);
    const now=new Date(),today=dayKey(now),sevenDaysAgo=now.getTime()-7*86400000,thirtyDaysAgo=now.getTime()-30*86400000;
    const passages=history.filter(item=>item.event_type==='passage'),usedToday=coupons.filter(coupon=>coupon.used_at&&dayKey(coupon.used_at)===today),coupons30Days=coupons.filter(coupon=>new Date(coupon.created_at).getTime()>=thirtyDaysAgo),used30Days=coupons30Days.filter(coupon=>coupon.used_at&&new Date(coupon.used_at).getTime()>=thirtyDaysAgo);
    return NextResponse.json({configured:true,members:members.length,newMembersToday:members.filter(member=>dayKey(member.created_at)===today).length,newMembers7Days:members.filter(member=>new Date(member.created_at).getTime()>=sevenDaysAgo).length,passagesToday:passages.filter(item=>dayKey(item.created_at||item.event_day)===today).length,passages7Days:passages.filter(item=>new Date(item.created_at||item.event_day).getTime()>=sevenDaysAgo).length,promotionsActive:promos.filter(promo=>promo.active&&new Date(promo.start_at)<=now&&new Date(promo.end_at)>=now).length,subscribers:subs.length,couponsUsedToday:usedToday.length,promotionRevenueToday:usedToday.reduce((sum,coupon)=>sum+Number(coupon.final_amount_ttc||0),0),promotionDiscountsToday:usedToday.reduce((sum,coupon)=>sum+Number(coupon.discount_amount_ttc||0),0),promotionUsage30Days:coupons30Days.length?Math.round(used30Days.length/coupons30Days.length*100):0});
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
