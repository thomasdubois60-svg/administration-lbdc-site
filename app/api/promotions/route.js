import { NextResponse } from 'next/server';
import { hasRole, ROLES } from '../../../lib/auth';
import { sb, tables } from '../../../lib/supabase';

export async function GET(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis' }, { status: 403 });
  try { return NextResponse.json({ promotions: await sb(`${tables.promotions}?select=*&order=created_at.desc`) }); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis' }, { status: 403 });
  try {
    const body = await request.json();
    const rows = await sb(tables.promotions, { method: 'POST', body: { ...body, created_at: new Date().toISOString() } });
    return NextResponse.json({ promotion: rows[0] });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function PATCH(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis' }, { status: 403 });
  try {
    const { id, ...body } = await request.json();
    const rows = await sb(`${tables.promotions}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body });
    return NextResponse.json({ promotion: rows[0] });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
