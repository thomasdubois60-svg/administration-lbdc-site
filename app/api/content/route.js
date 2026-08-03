import { hasRole, ROLES } from '../../../lib/auth';
import { sendNotification } from '../../../lib/notifications';
import { NextResponse } from 'next/server';

const owner = process.env.GITHUB_OWNER || 'thomasdubois60-svg';
const repo = process.env.GITHUB_REPO || 'lebistrotducoin';
const branch = process.env.GITHUB_BRANCH || 'main';
const path = 'data/site-content.json';
const publicSite = (process.env.PUBLIC_SITE_URL || 'https://lebistrotducoin.vercel.app').replace(/\/$/, '');

function githubHeaders(authenticated = false) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'LBDC-Administration'
  };
  if (authenticated && process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function readGithubFile() {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, {
    headers: githubHeaders(Boolean(process.env.GITHUB_TOKEN)),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Impossible de charger le contenu du site.');
  const file = await response.json();
  return { file, content: JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) };
}

async function verifyPublicContent(expected) {
  const containsExpected = (actual, expectedValue) => {
    if (Array.isArray(expectedValue)) {
      return Array.isArray(actual)
        && actual.length === expectedValue.length
        && expectedValue.every((item, index) => containsExpected(actual[index], item));
    }
    if (expectedValue && typeof expectedValue === 'object') {
      return actual && typeof actual === 'object' && !Array.isArray(actual)
        && Object.keys(expectedValue).every(key => containsExpected(actual[key], expectedValue[key]));
    }
    return Object.is(actual, expectedValue);
  };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const response = await fetch(`${publicSite}/api/content?publication=${Date.now()}`, { cache: 'no-store' });
      if (response.ok && containsExpected(await response.json(), expected)) return true;
    } catch {}
    if (attempt < 11) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

export async function GET(request) {
  if (!hasRole(request, ROLES.EMPLOYEE)) return NextResponse.json({ error: 'Accès Administration requis.' }, { status: 403 });
  try {
    const { file, content } = await readGithubFile();
    return NextResponse.json({ content, sha: file.sha });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}

export async function PUT(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis.' }, { status: 403 });
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: 'La variable GITHUB_TOKEN manque dans Vercel.' }, { status: 500 });

  try {
    const body = await request.json();
    if (!body.content || typeof body.content !== 'object') return NextResponse.json({ error: 'Contenu invalide.' }, { status: 400 });
    if (body.notification && !hasRole(request, ROLES.ADMIN)) return NextResponse.json({ error: 'Droits Administrateur requis pour notifier.' }, { status: 403 });

    const current = await readGithubFile();
    const nextText = JSON.stringify(body.content, null, 2) + '\n';
    const currentText = JSON.stringify(current.content, null, 2) + '\n';
    let sha = current.file.sha;
    let changed = false;

    if (nextText !== currentText) {
      if (body.sha && body.sha !== current.file.sha) {
        return NextResponse.json({ error: 'Le contenu a changé depuis son chargement. Recharge la page avant de republier.', sha }, { status: 409 });
      }
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { ...githubHeaders(true), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Mise à jour du site depuis Administration LBDC - ${new Date().toLocaleString('fr-FR')}`,
          content: Buffer.from(nextText, 'utf8').toString('base64'),
          sha,
          branch
        })
      });
      const result = await response.json();
      if (!response.ok) return NextResponse.json({ error: result.message || 'Échec de l’enregistrement GitHub.', sha }, { status: response.status });
      sha = result.content.sha;
      changed = true;
    }

    const published = await verifyPublicContent(body.content);
    if (!published) {
      return NextResponse.json({
        error: 'Le contenu est enregistré dans GitHub, mais sa lecture par le site public n’a pas pu être confirmée. Vérifie le déploiement Vercel avant de recommencer.',
        saved: true,
        changed,
        sha
      }, { status: 502 });
    }

    let notification = null;
    if (body.notification) notification = await sendNotification(body.notification);
    return NextResponse.json({ ok: true, saved: true, published: true, changed, sha, notification });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Publication impossible.' }, { status: 500 });
  }
}
