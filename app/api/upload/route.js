import { hasRole, ROLES } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;
const owner = process.env.GITHUB_OWNER || 'thomasdubois60-svg';
const repo = process.env.GITHUB_REPO || 'lebistrotducoin';
const branch = process.env.GITHUB_BRANCH || 'main';
const MAX_STORED_BYTES = 3 * 1024 * 1024;

function photoError(message, status = 400) { return Object.assign(new Error(message), { status }); }

// Covers fetch AND body consumption; abort the socket when the deadline expires.
async function bounded(operation, milliseconds, message) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise((_, reject) => {
        timer = setTimeout(() => { reject(photoError(message, 504)); controller.abort(); }, milliseconds);
      })
    ]);
  } finally { clearTimeout(timer); }
}

function safeName(name, extension) {
  const stem = String(name || 'photo').replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'photo';
  return `${randomUUID()}-${stem}.${extension}`;
}

async function normalizeImage(bytes, preserveOriginal = false) {
  try {
    // Decode real pixels rather than trusting the filename or MIME type.
    /** @type {import('sharp').SharpOptions} */
    const options = { limitInputPixels: 80000000, failOn: 'error' };
    const metadata = await sharp(bytes, options).metadata();
    if (!['jpeg', 'png', 'webp', 'gif', 'avif', 'heif'].includes(metadata.format)) throw new Error('format');
    if (preserveOriginal && ['jpeg', 'png'].includes(metadata.format) && bytes.length <= MAX_STORED_BYTES && Math.max(metadata.width, metadata.height) <= 2400) {
      // Decode to validate the image, but do not recompress an already suitable photo.
      await sharp(bytes, options).timeout({ seconds: 8 }).stats();
      return { bytes, extension: metadata.format === 'png' ? 'png' : 'jpg' };
    }
    const png = metadata.format === 'png' || metadata.hasAlpha;
    const pipeline = sharp(bytes, options).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).timeout({ seconds: 8 });
    const output = await (png ? pipeline.png() : pipeline.jpeg({ quality: 85, mozjpeg: true })).toBuffer();
    if (output.length <= MAX_STORED_BYTES) return { bytes: output, extension: png ? 'png' : 'jpg' };
    const reduced = sharp(output, options).resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).timeout({ seconds: 8 });
    const small = await (png ? reduced.png() : reduced.jpeg({ quality: 75 })).toBuffer();
    if (small.length > MAX_STORED_BYTES) throw photoError('Cette image reste trop lourde après réduction. Choisissez une version plus petite.');
    return { bytes: small, extension: png ? 'png' : 'jpg' };
  } catch (error) {
    if (error.status) throw error;
    throw photoError('Image illisible ou non compatible. Pour une photo HEIC/HEIF, utilisez « Choisir une photo » afin de la convertir en JPEG.');
  }
}

async function waitForRawImage(url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const ready = await bounded(async signal => {
        const response = await fetch(url, { signal, cache: 'no-store', headers: { Accept: 'image/*', 'User-Agent': 'LBDC-Administration/1.0 image-check' } });
        const valid = response.ok && (response.headers.get('content-type') || '').toLowerCase().startsWith('image/');
        await response.body?.cancel();
        return valid;
      }, 3000, 'Vérification de la photo trop longue.');
      if (ready) return true;
    } catch { /* A second, bounded attempt handles delayed Raw propagation. */ }
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 300));
  }
  return false;
}

async function storeImage(image, name) {
  const filename = safeName(name, image.extension);
  const path = `public/photos/${filename}`;
  const result = await bounded(async signal => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      signal, method: 'PUT',
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'LBDC-Administration' },
      body: JSON.stringify({ message: `Ajout photo depuis Administration LBDC - ${filename}`, content: image.bytes.toString('base64'), branch })
    });
    let data;
    try { data = await response.json(); } catch { throw photoError(`Réponse GitHub invalide (${response.status}). Réessayez.`, 502); }
    if (!response.ok) throw photoError(`GitHub a refusé la photo (${response.status}) : ${data.message || 'Vérifiez les droits du dépôt puis réessayez.'}`, 502);
    if (!data.commit?.sha || !data.content?.sha) throw photoError('GitHub n’a pas confirmé l’enregistrement de la photo. Réessayez.', 502);
    return data;
  }, 20000, 'GitHub n’a pas confirmé l’envoi dans le délai prévu. Vérifiez votre connexion puis réessayez.');
  // Immutable commit URL avoids stale branch caches and remains public after publication.
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(result.commit.sha)}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return { path: `/photos/${filename}`, rawUrl };
}

function wikimediaUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw photoError('Adresse de photo invalide.'); }
  if (url.protocol !== 'https:' || url.username || url.password || !['upload.wikimedia.org', 'commons.wikimedia.org'].includes(url.hostname)) throw photoError('Seules les images Wikimedia Commons peuvent être importées.');
  return url;
}

async function downloadWikimedia(sourceUrl) {
  return bounded(async signal => {
    let url = wikimediaUrl(sourceUrl);
    for (let hop = 0; hop < 4; hop += 1) {
      const response = await fetch(url, { signal, redirect: 'manual', headers: { Accept: 'image/*', 'User-Agent': 'LBDC-Administration/1.0 image-import' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) throw photoError('Redirection Wikimedia invalide.', 502);
        url = wikimediaUrl(new URL(location, url).href);
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw photoError(`Wikimedia ne peut pas fournir cette image (${response.status}). Réessayez ou choisissez une autre image.`, 502); }
      const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(type)) {
        await response.body?.cancel();
        throw photoError(`Format Wikimedia non pris en charge (${type || 'type inconnu'}). Choisissez une autre image.`);
      }
      const chunks = [];
      let size = 0;
      const reader = response.body?.getReader();
      if (!reader) throw photoError('Wikimedia a renvoyé une image vide.', 502);
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 25 * 1024 * 1024) { await reader.cancel(); throw photoError('Cette image Wikimedia dépasse 25 Mo. Choisissez une version plus petite.'); }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      return Buffer.concat(chunks);
    }
    throw photoError('Trop de redirections Wikimedia. Choisissez une autre image.', 502);
  }, 12000, 'Wikimedia met trop de temps à répondre. Réessayez ou choisissez une autre image.');
}

export async function POST(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis.' }, { status: 403 });
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: 'La variable GITHUB_TOKEN manque dans Vercel.' }, { status: 500 });
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const { sourceUrl, title } = await bounded(() => request.json(), 3000, 'La demande d’import est incomplète. Réessayez.');
      const bytes = await downloadWikimedia(sourceUrl);
      const image = await bounded(() => normalizeImage(bytes), 10000, 'La préparation de l’image Wikimedia prend trop de temps. Choisissez une autre image.');
      const stored = await storeImage(image, title || 'wikimedia');
      if (!await waitForRawImage(stored.rawUrl)) throw photoError('La photo est enregistrée dans GitHub, mais son aperçu public n’est pas encore disponible. Attendez quelques secondes puis réessayez.', 502);
      return NextResponse.json({ ok: true, ...stored });
    }
    const form = await bounded(() => request.formData(), 3000, 'La réception de la photo est incomplète. Réessayez.');
    const file = form.get('file');
    if (!file || typeof file === 'string') throw photoError('Aucune photo reçue.');
    if (!file.size) throw photoError('La photo reçue est vide. Sélectionnez son original.');
    if (file.size > MAX_STORED_BYTES) throw photoError('La photo n’a pas été réduite avant l’envoi. Rechargez la page puis sélectionnez-la à nouveau.', 413);
    const image = await bounded(async () => normalizeImage(Buffer.from(await file.arrayBuffer()), true), 10000, 'La validation de cette photo prend trop de temps. Réessayez avec une version JPEG.');
    const stored = await storeImage(image, file.name);
    // Local photos succeed at GitHub commit confirmation: no Raw fetch here.
    return NextResponse.json({ ok: true, ...stored });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : 'Le service photo est momentanément indisponible. Réessayez.' }, { status: error.status || 502 });
  }
}
