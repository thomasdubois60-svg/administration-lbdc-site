import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { loyalty, sb, tables } from '../../../../lib/supabase';
import { rpc, sb, tables } from '../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
function extractCode(value) {
  const raw = String(value || '').trim();
  try { const url = new URL(raw); return (url.searchParams.get('code') || url.pathname.split('/').filter(Boolean).pop() || '').toUpperCase(); }
  catch { return raw.replace(/^LBDC[:\s-]*/i, '').toUpperCase(); }
}

export async function POST(request) {
  if (!hasAnyRole(request, allowed)) return NextResponse.json({ error: 'Accès Fidélité requis' }, { status: 403 });
  try {
    const { value } = await request.json();
    const code = extractCode(value);
    if (!code) return NextResponse.json({ error: 'QR Code ou code membre vide' }, { status: 400 });
    const members = await sb(`${tables.members}?personal_code=ilike.${encodeURIComponent(code)}&select=id&limit=1`);
    if (!members[0]) return NextResponse.json({ error: 'Aucun membre ne correspond à ce code' }, { status: 404 });
    const member = await rpc('club_add_stamp', { p_member_id: members[0].id, p_note: 'Tampon ajouté par scan QR Code' });
    return NextResponse.json({ member, stamped: true });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
