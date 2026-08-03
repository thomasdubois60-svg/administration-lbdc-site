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

  const candidates = [];
  const addCandidateValue = (candidate) => addCandidate(candidates, candidate);
  const tryParseUrl = (input) => {
    try {
      const url = new URL(input);
      const hash = decode(url.hash.slice(1)).trim();
      const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash.replace(/^\?/, '');
      const hashParameters = hashQuery.includes('=') ? new URLSearchParams(hashQuery) : null;
      for (const [_, paramValue] of url.searchParams.entries()) addCandidateValue(paramValue);
      for (const [_, paramValue] of hashParameters?.entries() || []) addCandidateValue(paramValue);
      addCandidateValue(hash);
      addCandidateValue(lastPathCode(hash));
      addCandidateValue(lastPathCode(url.pathname));
      url.pathname.split('/').filter(Boolean).forEach(addCandidateValue);
    } catch {}
  };

  addCandidateValue(raw);
  addCandidateValue(decode(raw));
  tryParseUrl(raw);

  const plainSegments = decode(raw)
    .split(/[/?#=&]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  plainSegments.forEach(addCandidateValue);

  return candidates;
}

function buildIdentifierCandidates(identifier) {
  const trimmed = String(identifier || '').trim();
  if (!trimmed) return [];
  if (isUuid(trimmed)) return [{ field: 'id', value: trimmed }];

  const candidates = [
    { field: 'personal_code', value: trimmed },
    { field: 'code', value: trimmed },
    { field: 'email', value: trimmed }
  ];

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    candidates.push({ field: 'first_name', value: tokens[0] });
    candidates.push({ field: 'last_name', value: tokens[tokens.length - 1] });
  } else {
    candidates.push({ field: 'first_name', value: trimmed });
    candidates.push({ field: 'last_name', value: trimmed });
  }

  return candidates;
}

async function findMember(identifier) {
  const candidates = buildIdentifierCandidates(identifier);
  for (const candidate of candidates) {
    const encoded = encodeURIComponent(candidate.value);
    const filter = `${candidate.field}=eq.${encoded}`;
    const members = await sb(`${tables.members}?${filter}&select=id&limit=1`);
    if (members[0]) return members[0];
  }
  return null;
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
