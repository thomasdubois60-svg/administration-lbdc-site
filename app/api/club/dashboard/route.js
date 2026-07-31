import { NextResponse } from 'next/server';
import { hasRole, ROLES } from '../../../../lib/auth';
import { configured, sb, tables } from '../../../../lib/supabase';

export async function GET(request) {
  if (!hasRole(request, ROLES.EMPLOYEE)) return NextResponse.json({ error: 'Accès Administration requis' }, { status: 403 });
  if (!configured()) return NextResponse.json({ configured: false, members: 0, stamps: 0, rewards: 0, promotions: 0, subscribers: 0, recent: [] });
  try {
    const [members, history, promos, subs] = await Promise.all([
      sb(`${tables.members}?select=id,stamps&limit=10000`),
      sb(`${tables.history}?select=*&order=created_at.desc&limit=20`),
      sb(`${tables.promotions}?select=id&active=eq.true`),
      sb(`${tables.subscriptions}?select=id&limit=10000`),
    ]);
    return NextResponse.json({ configured: true, members: members.length, stamps: members.reduce((total, member) => total + (Number(member.stamps) || 0), 0), rewards: history.filter(item => item.action === 'reward').length, promotions: promos.length, subscribers: subs.length, recent: history });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
