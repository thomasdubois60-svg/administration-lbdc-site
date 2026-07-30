import { validSession } from '../../../lib/auth';
import { NextResponse } from 'next/server';

const owner = process.env.GITHUB_OWNER || 'thomasdubois60-svg';
const repo = process.env.GITHUB_REPO || 'lebistrotducoin';
const branch = process.env.GITHUB_BRANCH || 'main';
const path = 'data/site-content.json';

function authorized(request) { return validSession(request); }

export async function GET(request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'LBDC-Administration' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers, cache: 'no-store' });
  if (!response.ok) return NextResponse.json({ error: 'Impossible de charger le contenu du site.' }, { status: response.status });
  const file = await response.json();
  const content = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  return NextResponse.json({ content, sha: file.sha });
}

export async function PUT(request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: 'La variable GITHUB_TOKEN manque dans Vercel.' }, { status: 500 });
  const body = await request.json();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'LBDC-Administration'
    },
    body: JSON.stringify({
      message: `Mise à jour du site depuis Administration LBDC - ${new Date().toLocaleString('fr-FR')}`,
      content: Buffer.from(JSON.stringify(body.content, null, 2) + '\n', 'utf8').toString('base64'),
      sha: body.sha,
      branch
    })
  });
  const result = await response.json();
  if (!response.ok) return NextResponse.json({ error: result.message || 'Échec de l’enregistrement GitHub.' }, { status: response.status });
  return NextResponse.json({ ok: true, sha: result.content.sha });
}
