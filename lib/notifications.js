import webpush from 'web-push';
import { sb, tables } from './supabase';

function subscriptionFor(item) {
  return item.subscription || {
    endpoint: item.endpoint,
    keys: { p256dh: item.p256dh, auth: item.auth }
  };
}

export async function countSubscribers() {
  const rows = await sb(`${tables.subscriptions}?select=id&limit=10000`);
  return rows.length;
}

export async function sendNotification({ title, body, url = '/', tag = 'lbdc' }) {
  const cleanTitle = String(title || '').trim();
  const cleanBody = String(body || '').trim();
  if (!cleanTitle || !cleanBody) throw new Error('Titre et message obligatoires.');

  const rows = await sb(`${tables.subscriptions}?select=*&limit=10000`);
  if (!rows.length) return { sent: 0, failed: 0, removed: 0, total: 0 };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:lebistrotducoin41220@gmail.com';
  if (!publicKey || !privateKey) throw new Error('Clés VAPID manquantes dans Vercel.');

  webpush.setVapidDetails(subject, publicKey, privateKey);
  let sent = 0;
  let failed = 0;
  let removed = 0;
  const payload = JSON.stringify({ title: cleanTitle, body: cleanBody, url: url || '/', tag });

  await Promise.all(rows.map(async (item) => {
    try {
      await webpush.sendNotification(subscriptionFor(item), payload);
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode = Number(error?.statusCode || 0);
      if ((statusCode === 404 || statusCode === 410) && item.endpoint) {
        await sb(`${tables.subscriptions}?endpoint=eq.${encodeURIComponent(item.endpoint)}`, { method: 'DELETE' });
        removed += 1;
      }
    }
  }));

  return { sent, failed, removed, total: rows.length };
}
