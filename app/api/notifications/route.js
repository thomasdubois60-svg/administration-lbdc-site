import { NextResponse } from 'next/server';
import { hasRole, ROLES } from '../../../lib/auth';
import { countSubscribers, sendNotification } from '../../../lib/notifications';

const IDEMPOTENCY_TTL_MS = 2 * 60 * 1000;
const idempotencyStore = globalThis.__lbdcNotificationIdempotency || new Map();
globalThis.__lbdcNotificationIdempotency = idempotencyStore;

function responseFor(result) {
  if (result.total === 0) {
    return { status: 200, body: { ok: false, reason: 'no_subscribers', ...result } };
  }
  if (result.failed === 0) {
    return { status: 200, body: { ok: true, ...result } };
  }
  if (result.sent > 0) {
    return { status: 207, body: { ok: false, reason: 'partial_failure', ...result } };
  }
  return { status: 502, body: { ok: false, reason: 'send_failed', ...result } };
}

function pruneIdempotencyStore(now) {
  for (const [key, entry] of idempotencyStore) {
    if (entry.expiresAt <= now) idempotencyStore.delete(key);
  }
}

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
    const payload = await request.json();
    const title = String(payload?.title || '').trim();
    const body = String(payload?.body || '').trim();
    if (!title) return NextResponse.json({ ok: false, error: 'Titre obligatoire.' }, { status: 400 });
    if (!body) return NextResponse.json({ ok: false, error: 'Message obligatoire.' }, { status: 400 });

    const idempotencyKey = String(request.headers.get('idempotency-key') || '').trim();
    if (!idempotencyKey) return NextResponse.json({ ok: false, error: 'Clé d’idempotence obligatoire.' }, { status: 400 });

    const normalizedPayload = { title, body, url: String(payload?.url || '/'), tag: payload?.tag ? String(payload.tag) : undefined };
    const fingerprint = JSON.stringify(normalizedPayload);
    const now = Date.now();
    pruneIdempotencyStore(now);

    const existing = idempotencyStore.get(idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return NextResponse.json({ ok: false, reason: 'idempotency_conflict', error: 'Cette clé d’idempotence correspond déjà à une autre notification.' }, { status: 409 });
      }
      const cached = await existing.promise;
      return NextResponse.json({ ...cached.body, duplicate: true }, { status: cached.status });
    }

    const promise = sendNotification(normalizedPayload).then(responseFor);
    idempotencyStore.set(idempotencyKey, { fingerprint, promise, expiresAt: now + IDEMPOTENCY_TTL_MS });

    try {
      const result = await promise;
      return NextResponse.json(result.body, { status: result.status });
    } catch (error) {
      idempotencyStore.delete(idempotencyKey);
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
}
