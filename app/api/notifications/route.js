import { NextResponse } from 'next/server';
import { hasRole, ROLES } from '../../../lib/auth';
import { countSubscribers, sendNotification } from '../../../lib/notifications';

export async function GET(request) {
  if (!hasRole(request, ROLES.ADMIN)) return NextResponse.json({ error: 'Droits Administrateur requis.' }, { status: 403 });
  try {
    return NextResponse.json({ count: await countSubscribers() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}

export async function POST(request) {
  if (!hasRole(request, ROLES.ADMIN)) return NextResponse.json({ error: 'Droits Administrateur requis.' }, { status: 403 });
  try {
    const result = await sendNotification(await request.json());
    return NextResponse.json({ ok: result.failed === 0, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
