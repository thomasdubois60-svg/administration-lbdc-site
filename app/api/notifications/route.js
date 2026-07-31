import { NextResponse } from 'next/server';
import { hasRole, ROLES } from '../../../lib/auth';
import webpush from 'web-push';
import { sb, tables } from '../../../lib/supabase';

export async function POST(request) {
  if (!hasRole(request, ROLES.ADMIN)) return NextResponse.json({ error: 'Droits Administrateur requis' }, { status: 403 });
  try {
    const { title, body, url = '/', tag = 'lbdc' } = await request.json();
    if (!title || !body) return NextResponse.json({ error: 'Titre et message obligatoires' }, { status: 400 });
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const mail = process.env.VAPID_SUBJECT || 'mailto:lebistrotducoin41220@gmail.com';
    if (!pub || !priv) throw new Error('Clés VAPID manquantes dans Vercel.');
    webpush.setVapidDetails(mail, pub, priv);
    const rows = await sb(`${tables.subscriptions}?select=*`);
    let sent = 0, failed = 0;
    await Promise.all(rows.map(async (item) => {
      try {
        const subscription = item.subscription || { endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } };
        await webpush.sendNotification(subscription, JSON.stringify({ title, body, url, tag }));
        sent++;
      } catch { failed++; }
    }));
    return NextResponse.json({ ok: true, sent, failed, total: rows.length });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
