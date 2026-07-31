import crypto from 'crypto';

export const COOKIE_NAME = 'lbdc_admin_session';
export const ROLES = Object.freeze({ EMPLOYEE: 'employee', MANAGER: 'manager', ADMIN: 'admin' });
export const ROLE_LABELS = Object.freeze({ employee: 'Employé', manager: 'Responsable', admin: 'Administrateur' });
const ROLE_LEVEL = Object.freeze({ employee: 1, manager: 2, admin: 3 });
const maxAge = 60 * 60 * 12;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET manque dans Vercel.');
  return value || 'development-only-secret';
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function configuredAccounts() {
  return [
    { username: process.env.EMPLOYEE_USERNAME || 'employe', password: process.env.EMPLOYEE_PASSWORD, role: ROLES.EMPLOYEE },
    { username: process.env.MANAGER_USERNAME || 'responsable', password: process.env.MANAGER_PASSWORD, role: ROLES.MANAGER },
    { username: process.env.ADMIN_USERNAME || 'administrateur', password: process.env.ADMIN_PASSWORD, role: ROLES.ADMIN },
  ].filter((account) => account.password);
}

export function authenticate(username, password) {
  return configuredAccounts().find((account) => safeEqual(account.username, username) && safeEqual(account.password, password)) || null;
}

export function makeSession(account) {
  const payload = Buffer.from(JSON.stringify({ username: account.username, role: account.role, exp: Date.now() + maxAge * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function getSession(request) {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.exp > Date.now() && ROLE_LEVEL[session.role] ? session : null;
  } catch {
    return null;
  }
}

export function validSession(request) { return Boolean(getSession(request)); }
export function hasRole(request, minimumRole = ROLES.EMPLOYEE) {
  const session = getSession(request);
  return Boolean(session && ROLE_LEVEL[session.role] >= ROLE_LEVEL[minimumRole]);
}

export const sessionCookie = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge };
