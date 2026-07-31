import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../../lib/auth';
import { loyalty, sb, tables } from '../../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
export async function GET(request, { params }) {
  if (!hasAnyRole(request, allowed)) return NextResponse.json({ error: 'Accès Fidélité requis' }, { status: 403 });
  try {
    const id = encodeURIComponent(params.id);
    const [members, history, coupons] = await Promise.all([
      sb(`${tables.members}?id=eq.${id}&select=*`),
      sb(`${tables.history}?member_id=eq.${id}&select=*&order=created_at.desc&limit=100`),
      sb(`${loyalty.coupons}?member_id=eq.${id}&select=*&order=issued_at.desc`),
    ]);
    if (!members[0]) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    return NextResponse.json({ member: members[0], history, coupons, stampsRequired: loyalty.stampsRequired, rewardLabel: loyalty.rewardLabel });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
