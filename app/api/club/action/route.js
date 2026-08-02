import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { loyalty, rpc, sb, tables } from '../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
export async function POST(request) {
  if (!hasAnyRole(request, allowed)) return NextResponse.json({ error: 'Accès Fidélité requis' }, { status: 403 });
  try {
    const { memberId, action, note = '' } = await request.json();
    if (!memberId) return NextResponse.json({ error: 'Membre manquant' }, { status: 400 });
    let member;
    if (action === 'stamp' || action === 'add') {
      const encodedId = encodeURIComponent(memberId);
      const beforeRows = await sb(`${tables.members}?id=eq.${encodedId}&select=id,loyalty_points&limit=1`);
      const before = beforeRows[0];
      if (!before) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
      const previousPoints = Number(before.loyalty_points);
      if (!Number.isFinite(previousPoints)) return NextResponse.json({ error: 'Valeur de tampons invalide avant ajout' }, { status: 409 });
      await rpc('club_add_stamp', { p_member_id: before.id, p_note: note });
      const afterRows = await sb(`${tables.members}?id=eq.${encodedId}&select=id,loyalty_points&limit=1`);
      member = afterRows[0];
      const newPoints = Number(member?.loyalty_points);
      if (!member || newPoints !== previousPoints + 1) {
        return NextResponse.json({ error: 'Le tampon n’a pas été confirmé par la base de données' }, { status: 409 });
      }
      return NextResponse.json({ member, loyalty_points: newPoints, stampsRequired: loyalty.stampsRequired });
    } else if (action === 'reward') member = await rpc('club_validate_reward', { p_member_id: memberId, p_required: loyalty.stampsRequired, p_note: note });
    else return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    return NextResponse.json({ member, stampsRequired: loyalty.stampsRequired });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
