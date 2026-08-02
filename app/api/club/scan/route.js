import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { sb, tables } from '../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
const isUuid = (value) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const qrParameters = ['id', 'code', 'member', 'memberId', 'personal_code'];

function extractCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    for (const parameter of qrParameters) {
      const code = url.searchParams.get(parameter)?.trim();
      if (code) return code;
    }
    return '';
  } catch {
    return raw;
  }
}

export async function POST(request) {
  if (!hasAnyRole(request, allowed)) return NextResponse.json({ error: 'Accès Fidélité requis' }, { status: 403 });
  try {
    const { value } = await request.json();
    const code = extractCode(value);
    if (!code) return NextResponse.json({ error: 'QR Code ou code membre vide' }, { status: 400 });
    const encoded = encodeURIComponent(code);
    const filter = isUuid(code)
      ? `id=eq.${encoded}`
      : `personal_code=eq.${encoded}`;
    const members = await sb(`${tables.members}?${filter}&select=id&limit=1`);
    if (!members[0]) return NextResponse.json({ error: 'Aucun membre ne correspond à ce code' }, { status: 404 });
    return NextResponse.json({ member: members[0], stamped: false });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
