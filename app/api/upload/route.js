import { hasRole, ROLES } from '../../../lib/auth';
import { NextResponse } from 'next/server';

const owner = process.env.GITHUB_OWNER || 'thomasdubois60-svg';
const repo = process.env.GITHUB_REPO || 'lebistrotducoin';
const branch = process.env.GITHUB_BRANCH || 'main';

function safeName(name) {
  const ext = (name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const stem = name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo';
  return `${Date.now()}-${stem}.${ext}`;
}

async function waitForRawImage(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'image/*', 'User-Agent': 'LBDC-Administration/1.0 image-check' } });
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (response.ok && type.startsWith('image/')) {
      await response.body?.cancel();
      return true;
    }
    await response.body?.cancel();
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  return false;
}

async function storeImage(bytes, name) {
  const filename = safeName(name);
  const path = `public/photos/${filename}`;
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'LBDC-Administration' },
    body: JSON.stringify({ message: `Ajout photo depuis Administration LBDC - ${filename}`, content: bytes.toString('base64'), branch })
  });
  const result = await response.json();
  if (!response.ok) return { error: result.message || 'Échec de l’envoi de la photo.', status: response.status };
  const rawBaseUrl = result.content?.download_url || `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const rawUrl = `${rawBaseUrl}${rawBaseUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(result.commit?.sha || Date.now())}`;
  if (!await waitForRawImage(rawUrl)) return { error: 'La photo a été enregistrée dans GitHub, mais son URL Raw ne renvoie pas encore une image.', status: 502 };
  return { path: `/photos/${filename}`, rawUrl };
}

export async function POST(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis.' }, { status: 403 });
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: 'La variable GITHUB_TOKEN manque dans Vercel.' }, { status: 500 });
  if (request.headers.get('content-type')?.includes('application/json')) {
    const { sourceUrl, title } = await request.json();
    let url;
    try { url = new URL(sourceUrl); } catch { return NextResponse.json({ error: 'Adresse de photo invalide.' }, { status: 400 }); }
    const allowed = url.protocol === 'https:' && (url.hostname.endsWith('.wikimedia.org') || url.hostname.endsWith('.wikimediausercontent.org'));
    if (!allowed) return NextResponse.json({ error: 'Seules les images Wikimedia Commons peuvent être importées.' }, { status: 400 });
    const remote = await fetch(url, { headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.8', 'User-Agent': 'LBDC-Administration/1.0 image-import' }, redirect: 'follow' });
    if (!remote.ok) return NextResponse.json({ error: 'Téléchargement de la photo impossible.' }, { status: 502 });
    let finalUrl;
    try { finalUrl = new URL(remote.url); } catch { return NextResponse.json({ error: 'La redirection Wikimedia est invalide.' }, { status: 502 }); }
    const finalAllowed = finalUrl.protocol === 'https:' && (finalUrl.hostname.endsWith('.wikimedia.org') || finalUrl.hostname.endsWith('.wikimediausercontent.org'));
    if (!finalAllowed) return NextResponse.json({ error: 'La redirection de la photo quitte Wikimedia Commons.' }, { status: 400 });
    const type = (remote.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
    if (!extensions[type]) return NextResponse.json({ error: `Format d’image non pris en charge (${type || 'type inconnu'}).` }, { status: 400 });
    const bytes = Buffer.from(await remote.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) return NextResponse.json({ error: 'Photo trop lourde (8 Mo maximum).' }, { status: 400 });
    const extension = extensions[type];
    const stored = await storeImage(bytes, `${title || 'wikimedia'}.${extension}`);
    if (stored.error) return NextResponse.json({ error: stored.error }, { status: stored.status });
    return NextResponse.json({ ok: true, path: stored.path, rawUrl: stored.rawUrl });
  }
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Aucune photo reçue.' }, { status: 400 });
  if (!file.type?.startsWith('image/')) return NextResponse.json({ error: 'Le fichier doit être une image.' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Photo trop lourde (8 Mo maximum).' }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await storeImage(bytes, file.name || 'photo.jpg');
  if (stored.error) return NextResponse.json({ error: stored.error }, { status: stored.status });
  return NextResponse.json({ ok: true, path: stored.path });
}
