import { hasRole, ROLES } from '../../../lib/auth';
import { sendNotification } from '../../../lib/notifications';
import { NextResponse } from 'next/server';

const owner = process.env.GITHUB_OWNER || 'thomasdubois60-svg';
const repo = process.env.GITHUB_REPO || 'lebistrotducoin';
const branch = process.env.GITHUB_BRANCH || 'main';
const path = 'data/site-content.json';
const publicSite = (process.env.PUBLIC_SITE_URL || 'https://lebistrotducoin.vercel.app').replace(/\/$/, '');
const defaultContent = Object.freeze({
  heroImage: '/photos/facade.webp',
  general: {
    phone: '02 54 44 36 70',
    phoneHref: '+33254443670',
    email: 'lebistrotducoin41220@gmail.com',
    address: '15 Place de la Halle\n41220 Saint-Laurent-Nouan',
    hours: 'Lundi au jeudi : 7h–20h\nVendredi : 7h–15h\nRestauration : 11h45–14h',
    closureEnabled: false,
    closureMessage: 'Le Bistrot est exceptionnellement fermé.',
    analyticsUrl: 'https://vercel.com/dashboard'
  },
  pageTexts: {
    homeSlogan: 'Le Bistrot est avant tout un lieu où l’on vient se rencontrer, passer et partager de bons moments. Voilà ce que vous trouverez en poussant nos portes.',
    todayIntro: 'Une formule qui change au fil des envies du chef et des produits disponibles.',
    menuIntro: 'Des recettes de bistrot, généreuses et sans détour.',
    galleryIntro: 'Quelques images de notre cuisine et de l’ambiance du Bistrot.',
    contactIntro: 'Une question, une réservation ou simplement l’envie de venir nous voir ?',
    eventsIntro: 'Concerts, karaokés, soirées à thème et rendez-vous à ne pas manquer.',
    reviewsIntro: 'Retrouvez les avis de nos clients et suivez toute l’actualité du Bistrot.'
  },
  daily: {
    dateLabel: 'Aujourd’hui',
    startersTitle: '3 entrées au choix',
    mainsTitle: '3 plats au choix',
    dessertsTitle: '3 desserts au choix',
    suggestionSupplementText: '+4 € sur le prix du plat du jour ou de la formule choisie',
    formulas: [
      { name: 'Entrée seule', price: 'À compléter', takeawayPrice: '' },
      { name: 'Plat du jour', price: 'À compléter', takeawayPrice: '' },
      { name: 'Dessert seul', price: 'À compléter', takeawayPrice: '' },
      { name: 'Entrée + plat ou plat + dessert', price: 'À compléter', takeawayPrice: '' },
      { name: 'Entrée + plat + dessert', price: 'À compléter', takeawayPrice: '' }
    ],
    starters: [{ name: 'Entrée du jour 1' }, { name: 'Entrée du jour 2' }, { name: 'Entrée du jour 3' }],
    mains: [{ name: 'Plat du jour 1' }, { name: 'Plat du jour 2' }, { name: 'Plat du jour 3' }],
    suggestion: { name: 'Suggestion du chef', description: 'Selon arrivage', price: '+4 €' },
    desserts: [{ name: 'Dessert du jour 1' }, { name: 'Dessert du jour 2' }, { name: 'Dessert du jour 3' }]
  },
  menu: [
    { category: 'À partager… ou pas', items: [
      { name: 'Planche mixte', description: 'Rosette de Lyon, chorizo, terrine du moment, jambon de pays, jambon blanc et sélection de 3 fromages', price: '20 €' },
      { name: 'Saucisson sec du terroir', description: 'Cèpes, nature ou piment d’Espelette', price: '6 €' },
      { name: 'Chips Lay’s 145 g', description: 'Nature, barbecue…', price: '3 €' }
    ] },
    { category: 'Notre sélection de vins', items: [
      { name: 'Masfleur — rosé de Provence', description: '12 cl : 5 € · 25 cl : 9 €', price: '50 cl : 16 €' },
      { name: 'Saint-Nicolas-de-Bourgueil — rouge de Loire', description: '12 cl : 5 € · 25 cl : 9 €', price: '50 cl : 16 €' }
    ] }
  ],
  gallery: [
    { src: '/photos/facade.webp', alt: 'Façade du Bistrot Du Coin', label: 'Le Bistrot' },
    { src: '/photos/interieur-bar.webp', alt: 'Bar et intérieur du restaurant', label: 'Notre ambiance' }
  ],
  story: {
    eyebrow: 'Depuis 2021',
    title: 'La petite histoire du Bistrot',
    intro: 'C’est l’histoire de deux passionnés réunis autour du goût, de l’accueil et du plaisir de partager.',
    paragraphs: [
      'Depuis tout petit, Ismaël rêvait d’ouvrir son propre restaurant. Il a suivi les études qui lui ont permis de faire de sa passion son métier. En 2006, après plusieurs années d’expérience, il ouvre son premier restaurant, qu’il revendra treize ans plus tard.',
      'Thomas, lui, rêvait simplement de travailler avec plaisir. Il découvre la restauration en extra pendant ses études, en 2013, et se prend rapidement au jeu du service et de l’animation en salle.'
    ],
    quote: 'Le Bistrot est avant tout un lieu où l’on vient se rencontrer, passer et partager de bons moments. Voilà ce que vous trouverez en poussant nos portes.',
    image: '/photos/interieur-bar.webp',
    imageAlt: 'Le bar chaleureux du Bistrot Du Coin'
  },
  privatization: {
    title: 'Privatisez Le Bistrot',
    intro: 'Un moment rien qu’à vous, imaginé selon vos envies.',
    text: 'Nous pouvons privatiser le restaurant sur devis et selon les souhaits du client : repas de famille, anniversaire, réception professionnelle ou soirée privée. Contactez-nous directement afin que nous construisions ensemble une proposition adaptée.',
    photos: [{ src: '/photos/interieur-bar.webp', alt: 'Salle du Bistrot', label: 'Un lieu à votre image' }]
  },
  events: [],
  reviews: {
    title: 'Avis Google & réseaux sociaux',
    intro: 'Votre avis compte beaucoup pour nous. Consultez les témoignages de nos clients ou partagez votre expérience.',
    googleReviewsUrl: 'https://share.google/I0OlzrRJJKi4ne3kO',
    googleReviewWriteUrl: 'https://share.google/I0OlzrRJJKi4ne3kO'
  },
  socials: [
    { label: 'Facebook', url: 'https://www.facebook.com/share/1BjtCjdbBa/?mibextid=wwXIfr' },
    { label: 'Instagram', url: '' },
    { label: 'TikTok', url: 'https://www.tiktok.com/@lebistrotducoin41?_r=1&_t=ZN-98H20Dw4COs' }
  ]
});

function normalizeContent(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const { club, ...sanitizedSource } = source;
  const general = {
    ...defaultContent.general,
    ...(sanitizedSource.general && typeof sanitizedSource.general === 'object' && !Array.isArray(sanitizedSource.general) ? sanitizedSource.general : {})
  };
  const pageTexts = {
    ...defaultContent.pageTexts,
    ...(sanitizedSource.pageTexts && typeof sanitizedSource.pageTexts === 'object' && !Array.isArray(sanitizedSource.pageTexts) ? sanitizedSource.pageTexts : {})
  };
  const dailySource = sanitizedSource.daily && typeof sanitizedSource.daily === 'object' && !Array.isArray(sanitizedSource.daily) ? sanitizedSource.daily : {};
  const daily = {
    ...defaultContent.daily,
    ...dailySource,
    formulas: Array.isArray(dailySource.formulas) && dailySource.formulas.length ? dailySource.formulas : defaultContent.daily.formulas,
    starters: Array.isArray(dailySource.starters) && dailySource.starters.length ? dailySource.starters : defaultContent.daily.starters,
    mains: Array.isArray(dailySource.mains) && dailySource.mains.length ? dailySource.mains : defaultContent.daily.mains,
    desserts: Array.isArray(dailySource.desserts) && dailySource.desserts.length ? dailySource.desserts : defaultContent.daily.desserts,
    suggestion: {
      ...defaultContent.daily.suggestion,
      ...(dailySource.suggestion && typeof dailySource.suggestion === 'object' && !Array.isArray(dailySource.suggestion) ? dailySource.suggestion : {})
    }
  };
  return {
    ...defaultContent,
    ...sanitizedSource,
    heroImage: typeof sanitizedSource.heroImage === 'string' && sanitizedSource.heroImage ? sanitizedSource.heroImage : defaultContent.heroImage,
    general,
    pageTexts,
    daily,
    menu: Array.isArray(sanitizedSource.menu) && sanitizedSource.menu.length ? sanitizedSource.menu : defaultContent.menu,
    gallery: Array.isArray(sanitizedSource.gallery) && sanitizedSource.gallery.length ? sanitizedSource.gallery : defaultContent.gallery,
    story: {
      ...defaultContent.story,
      ...(sanitizedSource.story && typeof sanitizedSource.story === 'object' && !Array.isArray(sanitizedSource.story) ? sanitizedSource.story : {}),
      paragraphs: Array.isArray(sanitizedSource.story?.paragraphs) && sanitizedSource.story.paragraphs.length ? sanitizedSource.story.paragraphs : defaultContent.story.paragraphs
    },
    privatization: {
      ...defaultContent.privatization,
      ...(sanitizedSource.privatization && typeof sanitizedSource.privatization === 'object' && !Array.isArray(sanitizedSource.privatization) ? sanitizedSource.privatization : {}),
      photos: Array.isArray(sanitizedSource.privatization?.photos) && sanitizedSource.privatization.photos.length ? sanitizedSource.privatization.photos : defaultContent.privatization.photos
    },
    events: Array.isArray(sanitizedSource.events) && sanitizedSource.events.length ? sanitizedSource.events : defaultContent.events,
    reviews: {
      ...defaultContent.reviews,
      ...(sanitizedSource.reviews && typeof sanitizedSource.reviews === 'object' && !Array.isArray(sanitizedSource.reviews) ? sanitizedSource.reviews : {})
    },
    socials: Array.isArray(sanitizedSource.socials) && sanitizedSource.socials.length ? sanitizedSource.socials : defaultContent.socials
  };
}

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
  const content = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  return { file, content: normalizeContent(content) };
}

function getValueByPath(value, path) {
  return path.split('.').reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), value);
}

async function verifyPublicContent(expected) {
  const normalizedExpected = normalizeContent(expected);
  const checks = [
    ['heroImage', normalizedExpected.heroImage],
    ['general.phone', normalizedExpected.general.phone],
    ['pageTexts.menuIntro', normalizedExpected.pageTexts.menuIntro],
    ['daily.formulas', normalizedExpected.daily.formulas],
    ['menu', normalizedExpected.menu],
    ['story.paragraphs', normalizedExpected.story.paragraphs]
  ];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const response = await fetch(`${publicSite}/api/content?publication=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const actual = await response.json();
        const matches = checks.every(([path, expectedValue]) => {
          const actualValue = getValueByPath(actual, path);
          return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
        });
        if (matches) return true;
      }
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
    const normalizedContent = normalizeContent(body.content);
    const nextText = JSON.stringify(normalizedContent, null, 2) + '\n';
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

    const published = await verifyPublicContent(normalizedContent);
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
