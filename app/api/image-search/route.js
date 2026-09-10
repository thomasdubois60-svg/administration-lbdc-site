import { hasRole, ROLES } from '../../../lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function searchCommons(query) {
  const params = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '360', origin: '*' });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'LBDC-Administration/1.0 image-search' }, cache: 'no-store' });
  if (!response.ok) throw new Error('commons-unavailable');
  const data = await response.json();
  return Object.values(data.query?.pages || {});
}

export async function GET(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis.' }, { status: 403 });
  const query = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (query.length < 2 || query.length > 100) return NextResponse.json({ error: 'Recherche invalide.' }, { status: 400 });
  let pages;
  try {
    pages = await searchCommons(query);
    const simpler = query.replace(/\b(logo|photo|image)\b/gi, '').trim();
    if (!pages.length && simpler.length >= 2 && simpler !== query) pages = await searchCommons(simpler);
  } catch { return NextResponse.json({ error: 'La recherche Wikimedia est indisponible ou a dépassé le délai de réponse. Réessayez.' }, { status: 502 }); }
  const results = pages.flatMap(page => {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info?.url || !info?.descriptionurl) return [];
    return [{ title: (page.title || 'Image').replace(/^File:/i, ''), thumbnail: info.thumburl, imageUrl: info.url, sourceUrl: info.descriptionurl }];
  });
  return NextResponse.json({ results });
}
