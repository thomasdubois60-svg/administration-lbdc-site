import { NextResponse } from 'next/server';
import { authenticate, COOKIE_NAME, makeSession, ROLE_LABELS, sessionCookie } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const { username = '', password = '' } = await request.json();
    const account = authenticate(username.trim(), password);
    if (!account) return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect.' }, { status: 401 });
    const response = NextResponse.json({ authenticated: true, username: account.username, role: account.role, roleLabel: ROLE_LABELS[account.role] });
    response.cookies.set(COOKIE_NAME, makeSession(account), sessionCookie);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Connexion impossible.' }, { status: 500 });
  }
}
