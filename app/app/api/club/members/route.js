import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { loyalty, sb, tables } from '../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
const clean = (value) => String(value || '').replace(/[,*()]/g, ' ').trim();
const isUuid = (value) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const memberName = (member) => [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || member.personal_code;

export async function GET(request) {
  if (!hasAnyRole(request, allowed)) return NextResponse.json({ error: 'Accès Fidélité requis' }, { status: 403 });
  const query = clean(request.nextUrl.searchParams.get('q'));
  const page = Math.max(0, Number(request.nextUrl.searchParams.get('page')) || 0);
  const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 50));
  try {
    const encoded = encodeURIComponent(query);
    const filter = !query
      ? ''
      : isUuid(query)
        ? `&id=eq.${encoded}`
        : `&or=(personal_code.ilike.*${encoded}*,email.ilike.*${encoded}*,first_name.ilike.*${encoded}*,last_name.ilike.*${encoded}*)`;
    const rows = await sb(`${tables.members}?select=id,personal_code,first_name,last_name,email,birthday,loyalty_points,reward_available,created_at,updated_at&order=created_at.desc&offset=${page * pageSize}&limit=${pageSize}${filter}`);
    const ids = rows.map((member) => member.id);
    let events = [], coupons = [];
    if (ids.length) {
      const idFilter = ids.join(',');
      [events, coupons] = await Promise.all([
        sb(`${tables.history}?member_id=in.(${idFilter})&select=member_id,event_type`),
        sb(`${loyalty.coupons}?member_id=in.(${idFilter})&select=member_id,used_at,expires_at`),
      ]);
    }
    const now = Date.now();
    const members = rows.map((member) => ({
      ...member, name: memberName(member), code: member.personal_code,
      stamps: Number(member.loyalty_points) || 0,
      visits: events.filter((event) => event.member_id === member.id && event.event_type === 'passage').length,
      rewards_count: events.filter((event) => event.member_id === member.id && event.event_type === 'reward').length,
      coupons_available: coupons.filter((coupon) => coupon.member_id === member.id && !coupon.used_at && (!coupon.expires_at || new Date(coupon.expires_at).getTime() >= now)).length,
    }));
    return NextResponse.json({ members, page, pageSize, hasMore: rows.length === pageSize, stampsRequired: loyalty.stampsRequired });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
