import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { loyalty, rpc } from '../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
export async function POST(request) {
  if (!hasAnyRole(request, allowed)) return NextResponse.json({ error: 'Accès Fidélité requis' }, { status: 403 });
  try {
    const { memberId, action, note = '' } = await request.json();
    if (!memberId) return NextResponse.json({ error: 'Membre manquant' }, { status: 400 });
    let member;
    if (action === 'stamp' || action === 'add') member = await rpc('club_add_stamp', { p_member_id: memberId, p_note: note });
    else if (action === 'reward') member = await rpc('club_validate_reward', { p_member_id: memberId, p_required: loyalty.stampsRequired, p_note: note });
    else return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    return NextResponse.json({ member, stampsRequired: loyalty.stampsRequired });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
