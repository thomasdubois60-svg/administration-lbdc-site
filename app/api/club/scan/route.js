import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { sb, tables } from '../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
const isUuid = (value) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const decode = (value) => { try { return decodeURIComponent(value); } catch { return value; } };

function extractIdentifier(value) {
  const raw = decode(String(value || '')).trim();
  if (!raw) return '';

  const loyaltyPath = raw.match(/\/fid(?:e|é)lite\/(.+?)(?:[?#]|$)/i);
  if (!loyaltyPath) return raw;

  return decode(loyaltyPath[1]).split('/').filter(Boolean).pop()?.trim() || '';
}

function buildIdentifierCandidates(identifier) {
  const trimmed = String(identifier || '').trim();
  if (!trimmed) return [];

  const candidates = [
    { field: 'personal_code', value: trimmed }
  ];

  if (isUuid(trimmed)) {
    candidates.push({ field: 'code', value: trimmed });
    candidates.push({ field: 'id', value: trimmed });
    candidates.push({ field: 'email', value: trimmed });
    return candidates;
  }

  candidates.push({ field: 'email', value: trimmed });

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
    const identifier = extractIdentifier(value);
    if (!identifier) return NextResponse.json({ error: 'QR Code ou code membre vide' }, { status: 400 });
    const member = await findMember(identifier);
    if (member) return NextResponse.json({ member, stamped: false });
    return NextResponse.json({ error: 'Aucun membre ne correspond à ce code' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
