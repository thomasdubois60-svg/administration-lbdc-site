import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { sb, tables } from '../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
const isUuid = (value) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const qrParameters = ['id', 'code', 'member', 'memberId', 'personal_code'];
const genericSegments = new Set(['club', 'fidélité', 'fidelite', 'membre', 'member', 'carte']);
const decode = (value) => { try { return decodeURIComponent(value); } catch { return value; } };
const usableCode = (value) => {
  const code = decode(String(value || '')).trim();
  return code && !genericSegments.has(code.toLocaleLowerCase('fr-FR')) ? code : '';
};
const lastPathCode = (value) => usableCode(String(value || '').split('?')[0].split('/').filter(Boolean).pop());

function extractCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    for (const parameter of qrParameters) {
      const code = usableCode(url.searchParams.get(parameter));
      if (code) return code;
    }
    const hash = decode(url.hash.slice(1)).trim();
    if (hash) {
      const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash.replace(/^\?/, '');
      if (hashQuery.includes('=')) {
        const hashParameters = new URLSearchParams(hashQuery);
        for (const parameter of qrParameters) {
          const code = usableCode(hashParameters.get(parameter));
          if (code) return code;
        }
      }
      const hashCode = lastPathCode(hash);
      if (hashCode && !hashCode.includes('=')) return hashCode;
    }
    return lastPathCode(url.pathname);
  } catch {
    return usableCode(raw);
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
