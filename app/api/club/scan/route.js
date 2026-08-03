import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { sb, tables } from '../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
const isUuid = (value) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const qrParameters = ['id', 'memberId', 'member', 'code', 'personal_code', 'email'];
const genericSegments = new Set(['club', 'fidélité', 'fidelite', 'membre', 'member', 'carte']);
const decode = (value) => { try { return decodeURIComponent(value); } catch { return value; } };
const usableCode = (value) => {
  const code = decode(String(value || '')).trim();
  return code && !genericSegments.has(code.toLocaleLowerCase('fr-FR')) ? code : '';
};
const lastPathCode = (value) => usableCode(String(value || '').split('?')[0].split('/').filter(Boolean).pop());
const addCandidate = (candidates, value) => {
  const candidate = usableCode(value);
  if (candidate && !candidates.includes(candidate)) candidates.push(candidate);
};

function extractCodes(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  try {
    const url = new URL(raw);
    const candidates = [];
    const hash = decode(url.hash.slice(1)).trim();
    const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash.replace(/^\?/, '');
    const hashParameters = hashQuery.includes('=') ? new URLSearchParams(hashQuery) : null;
    for (const parameter of qrParameters) {
      addCandidate(candidates, url.searchParams.get(parameter));
      addCandidate(candidates, hashParameters?.get(parameter));
    }
    if (hash) {
      const hashCode = lastPathCode(hash);
      if (hashCode && !hashCode.includes('=')) addCandidate(candidates, hashCode);
    }
    addCandidate(candidates, lastPathCode(url.pathname));
    return candidates;
  } catch {
    const candidate = usableCode(raw);
    return candidate ? [candidate] : [];
  }
}

function buildMemberSearchFilter(identifier) {
  const encoded = encodeURIComponent(identifier);
  if (isUuid(identifier)) return `id=eq.${encoded}`;
  const clauses = [
    `personal_code.eq.${encoded}`,
    `personal_code.ilike.*${encoded}*`,
    `email.ilike.*${encoded}*`,
    `first_name.ilike.*${encoded}*`,
    `last_name.ilike.*${encoded}*`
  ];
  const tokens = identifier.split(/\s+/).filter(Boolean);
  tokens.forEach((token) => {
    const tokenEncoded = encodeURIComponent(token);
    clauses.push(`first_name.ilike.*${tokenEncoded}*`, `last_name.ilike.*${tokenEncoded}*`);
  });
  return `or=(${clauses.join(',')})`;
}

async function findMember(identifier) {
  const filter = buildMemberSearchFilter(identifier);
  const members = await sb(`${tables.members}?${filter}&select=id&limit=1`);
  return members[0] || null;
}

export async function POST(request) {
  if (!hasAnyRole(request, allowed)) return NextResponse.json({ error: 'Accès Fidélité requis' }, { status: 403 });
  try {
    const { value } = await request.json();
    const identifiers = extractCodes(value);
    if (!identifiers.length) return NextResponse.json({ error: 'QR Code ou code membre vide' }, { status: 400 });
    for (const identifier of identifiers) {
      const member = await findMember(identifier);
      if (member) return NextResponse.json({ member, stamped: false });
    }
    return NextResponse.json({ error: 'Aucun membre ne correspond à ce code' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
