import { NextResponse } from 'next/server';
import { hasAnyRole, ROLES } from '../../../../lib/auth';
import { loyalty, sb, tables } from '../../../../lib/supabase';

const allowed = [ROLES.FIDELITY, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN];
const clean = (value) => String(value || '').replace(/[,*()]/g, ' ').trim();

export async function GET(request) {
  if (!hasAnyRole(request, allowed)) return NextResponse.json({ error: 'Accès Fidélité requis' }, { status: 403 });
  const query = clean(request.nextUrl.searchParams.get('q'));
  const page = Math.max(0, Number(request.nextUrl.searchParams.get('page')) || 0);
  const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 50));
  try {
    const filter = query ? `&or=(code.ilike.*${encodeURIComponent(query)}*,email.ilike.*${encodeURIComponent(query)}*,name.ilike.*${encodeURIComponent(query)}*)` : '';
    const members = await sb(`${tables.members}?select=id,code,name,email,phone,visits,stamps,rewards_count,coupons_available,created_at,updated_at&order=name.asc.nullslast&offset=${page * pageSize}&limit=${pageSize}${filter}`);
    return NextResponse.json({ members, page, pageSize, hasMore: members.length === pageSize, stampsRequired: loyalty.stampsRequired });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
