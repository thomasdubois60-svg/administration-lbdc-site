import { NextResponse } from 'next/server';
import { getSession, ROLE_LABELS } from '../../../../lib/auth';

export async function GET(request) {
  const session = getSession(request);
  return NextResponse.json(session ? { authenticated: true, username: session.username, role: session.role, roleLabel: ROLE_LABELS[session.role] } : { authenticated: false });
}
