import { NextResponse } from 'next/server';

const owner = process.env.GITHUB_OWNER || 'thomasdubois60-svg';
const repo = process.env.GITHUB_REPO || 'lebistrotducoin';
const branch = process.env.GITHUB_BRANCH || 'main';

function authorized(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return true;
  return request.headers.get('x-admin-password') === expected;
}

function safeName(name) {
  const ext = (name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const stem = name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo';
  return `${Date.now()}-${stem}.${ext}`;
}

export async function POST(request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: 'La variable GITHUB_TOKEN manque dans Vercel.' }, { status: 500 });
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Aucune photo reçue.' }, { status: 400 });
  if (!file.type?.startsWith('image/')) return NextResponse.json({ error: 'Le fichier doit être une image.' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Photo trop lourde (8 Mo maximum).' }, { status: 400 });
  const filename = safeName(file.name || 'photo.jpg');
  const path = `public/photos/${filename}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'LBDC-Administration' },
    body: JSON.stringify({ message: `Ajout photo depuis Administration LBDC - ${filename}`, content: bytes.toString('base64'), branch })
  });
  const result = await response.json();
  if (!response.ok) return NextResponse.json({ error: result.message || 'Échec de l’envoi de la photo.' }, { status: response.status });
  return NextResponse.json({ ok: true, path: `/photos/${filename}` });
}
