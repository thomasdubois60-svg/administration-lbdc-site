'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bars3Icon, BuildingStorefrontIcon, CalendarDaysIcon, CheckCircleIcon, ClockIcon, Cog6ToothIcon, HomeIcon, InformationCircleIcon, PhotoIcon, PlusIcon, Squares2X2Icon, XMarkIcon } from '../components/icons';

const defaultData = {
  restaurant: {
    name: 'Le Bistrot Du Coin',
    address: '15 place de la Halle, 41220',
    phone: '02 54 44 36 70',
    email: 'lebistrotducoin41220@gmail.com',
    slogan: 'Le bistrot est avant tout un lieu où l’on vient se rencontrer, passer et partager de bons moments ! Voilà ce que vous trouverez en passant nos portes.',
  },
  hours: [
    { day: 'Lundi', open: true, from: '07:00', to: '20:00' },
    { day: 'Mardi', open: true, from: '07:00', to: '20:00' },
    { day: 'Mercredi', open: true, from: '07:00', to: '20:00' },
    { day: 'Jeudi', open: true, from: '07:00', to: '20:00' },
    { day: 'Vendredi', open: true, from: '07:00', to: '15:00' },
    { day: 'Samedi', open: false, from: '', to: '' },
    { day: 'Dimanche', open: false, from: '', to: '' },
  ],
  menu: {
    date: new Date().toISOString().slice(0, 10),
    starters: ['Entrée du jour 1', 'Entrée du jour 2', 'Entrée du jour 3'],
    mains: ['Plat du jour 1', 'Plat du jour 2', 'Plat du jour 3'],
    desserts: ['Dessert du jour 1', 'Dessert du jour 2', 'Dessert du jour 3'],
    suggestion: 'Suggestion du jour : +4 € avec le plat du jour ou la formule',
  },
  gallery: [
    { id: 1, title: 'Salle du restaurant', url: '' },
    { id: 2, title: 'Façade du bistrot', url: '' },
  ],
  settings: {
    siteOnline: true,
    menuPublished: true,
    lastUpdate: 'Jamais',
  },
};

const nav = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Squares2X2Icon },
  { id: 'menu', label: 'Menu du jour', icon: CalendarDaysIcon },
  { id: 'hours', label: 'Horaires', icon: ClockIcon },
  { id: 'info', label: 'Informations', icon: InformationCircleIcon },
  { id: 'gallery', label: 'Galerie', icon: PhotoIcon },
  { id: 'settings', label: 'Paramètres', icon: Cog6ToothIcon },
];

function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function TextField({ label, value, onChange, type = 'text', multiline = false, placeholder = '' }) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

export default function Home() {
  const [data, setData] = useState(defaultData);
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('lbdc-admin-data');
    if (stored) {
      try { setData(JSON.parse(stored)); } catch {}
    }
    setReady(true);
  }, []);

  const save = () => {
    const next = {
      ...data,
      settings: {
        ...data.settings,
        lastUpdate: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
      },
    };
    setData(next);
    localStorage.setItem('lbdc-admin-data', JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const stats = useMemo(() => [
    { label: 'Site internet', value: data.settings.siteOnline ? 'En ligne' : 'Hors ligne', detail: 'État général', icon: BuildingStorefrontIcon },
    { label: 'Menu du jour', value: data.settings.menuPublished ? 'Publié' : 'Brouillon', detail: data.menu.date, icon: CalendarDaysIcon },
    { label: 'Photos', value: data.gallery.length, detail: 'Dans la galerie', icon: PhotoIcon },
    { label: 'Dernière sauvegarde', value: data.settings.lastUpdate, detail: 'Sur cet appareil', icon: CheckCircleIcon },
  ], [data]);

  if (!ready) return null;

  const updateMenuItem = (group, index, value) => {
    const list = [...data.menu[group]];
    list[index] = value;
    setData({ ...data, menu: { ...data.menu, [group]: list } });
  };

  const renderMenuGroup = (title, key) => (
    <Card>
      <div className="section-heading"><div><p className="eyebrow">Aujourd’hui au Bistrot</p><h3>{title}</h3></div></div>
      <div className="stack">
        {data.menu[key].map((item, index) => (
          <TextField key={index} label={`${title.slice(0, -1)} ${index + 1}`} value={item} onChange={(value) => updateMenuItem(key, index, value)} />
        ))}
      </div>
    </Card>
  );

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">LBDC</div>
          <div><strong>Administration</strong><span>Gestion du site</span></div>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Fermer"><XMarkIcon /></button>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => { setSection(item.id); setSidebarOpen(false); }}>
                <Icon /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="status-dot" />
          <div><strong>Application locale</strong><span>V1 prête à connecter</span></div>
        </div>
      </aside>

      {sidebarOpen && <button className="overlay" onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu" />}

      <section className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu"><Bars3Icon /></button>
          <div><p className="eyebrow">Le Bistrot Du Coin</p><h1>{nav.find((item) => item.id === section)?.label}</h1></div>
          <button className="primary-button" onClick={save}>{saved ? 'Sauvegardé ✓' : 'Sauvegarder'}</button>
        </header>

        <div className="content">
          {section === 'dashboard' && (
            <>
              <div className="hero-card">
                <div><p className="eyebrow">Administration du site internet</p><h2>Bonjour Thomas 👋</h2><p>Modifie facilement les contenus visibles sur le site du Bistrot, depuis ton téléphone ou ton ordinateur.</p></div>
                <HomeIcon />
              </div>
              <div className="stats-grid">
                {stats.map((stat) => { const Icon = stat.icon; return <Card key={stat.label} className="stat-card"><div className="stat-icon"><Icon /></div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small></Card>; })}
              </div>
              <div className="two-columns">
                <Card>
                  <div className="section-heading"><div><p className="eyebrow">Accès rapide</p><h3>Que veux-tu modifier ?</h3></div></div>
                  <div className="quick-grid">
                    {nav.slice(1, 5).map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setSection(item.id)}><Icon /><span>{item.label}</span></button>; })}
                  </div>
                </Card>
                <Card>
                  <div className="section-heading"><div><p className="eyebrow">Publication</p><h3>État du contenu</h3></div></div>
                  <div className="publish-row"><span>Site visible en ligne</span><button className={`switch ${data.settings.siteOnline ? 'on' : ''}`} onClick={() => setData({ ...data, settings: { ...data.settings, siteOnline: !data.settings.siteOnline } })}><i /></button></div>
                  <div className="publish-row"><span>Menu du jour publié</span><button className={`switch ${data.settings.menuPublished ? 'on' : ''}`} onClick={() => setData({ ...data, settings: { ...data.settings, menuPublished: !data.settings.menuPublished } })}><i /></button></div>
                </Card>
              </div>
            </>
          )}

          {section === 'menu' && (
            <>
              <Card>
                <div className="section-heading"><div><p className="eyebrow">Publication quotidienne</p><h2>Menu du jour</h2></div><span className={`badge ${data.settings.menuPublished ? 'success' : ''}`}>{data.settings.menuPublished ? 'Publié' : 'Brouillon'}</span></div>
                <TextField label="Date du menu" type="date" value={data.menu.date} onChange={(value) => setData({ ...data, menu: { ...data.menu, date: value } })} />
              </Card>
              <div className="three-columns">{renderMenuGroup('Entrées', 'starters')}{renderMenuGroup('Plats', 'mains')}{renderMenuGroup('Desserts', 'desserts')}</div>
              <Card><TextField label="Suggestion du jour" value={data.menu.suggestion} onChange={(value) => setData({ ...data, menu: { ...data.menu, suggestion: value } })} multiline /></Card>
            </>
          )}

          {section === 'hours' && (
            <Card>
              <div className="section-heading"><div><p className="eyebrow">Informations pratiques</p><h2>Horaires d’ouverture</h2></div></div>
              <div className="hours-list">
                {data.hours.map((row, index) => (
                  <div className="hour-row" key={row.day}>
                    <strong>{row.day}</strong>
                    <button className={`switch ${row.open ? 'on' : ''}`} onClick={() => { const hours = [...data.hours]; hours[index] = { ...row, open: !row.open }; setData({ ...data, hours }); }}><i /></button>
                    {row.open ? <><input type="time" value={row.from} onChange={(e) => { const hours = [...data.hours]; hours[index] = { ...row, from: e.target.value }; setData({ ...data, hours }); }} /><span>à</span><input type="time" value={row.to} onChange={(e) => { const hours = [...data.hours]; hours[index] = { ...row, to: e.target.value }; setData({ ...data, hours }); }} /></> : <span className="closed">Fermé</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === 'info' && (
            <Card>
              <div className="section-heading"><div><p className="eyebrow">Coordonnées publiques</p><h2>Informations du restaurant</h2></div></div>
              <div className="form-grid">
                <TextField label="Nom du restaurant" value={data.restaurant.name} onChange={(value) => setData({ ...data, restaurant: { ...data.restaurant, name: value } })} />
                <TextField label="Téléphone" value={data.restaurant.phone} onChange={(value) => setData({ ...data, restaurant: { ...data.restaurant, phone: value } })} />
                <TextField label="Adresse e-mail" type="email" value={data.restaurant.email} onChange={(value) => setData({ ...data, restaurant: { ...data.restaurant, email: value } })} />
                <TextField label="Adresse" value={data.restaurant.address} onChange={(value) => setData({ ...data, restaurant: { ...data.restaurant, address: value } })} />
                <div className="full-width"><TextField label="Texte de présentation" multiline value={data.restaurant.slogan} onChange={(value) => setData({ ...data, restaurant: { ...data.restaurant, slogan: value } })} /></div>
              </div>
            </Card>
          )}

          {section === 'gallery' && (
            <Card>
              <div className="section-heading"><div><p className="eyebrow">Images du site</p><h2>Galerie photos</h2></div><button className="secondary-button" onClick={() => setData({ ...data, gallery: [...data.gallery, { id: Date.now(), title: 'Nouvelle photo', url: '' }] })}><PlusIcon />Ajouter</button></div>
              <div className="gallery-grid">
                {data.gallery.map((photo, index) => (
                  <div className="photo-card" key={photo.id}>
                    <div className="photo-placeholder"><PhotoIcon /><span>Aperçu photo</span></div>
                    <input value={photo.title} onChange={(e) => { const gallery = [...data.gallery]; gallery[index] = { ...photo, title: e.target.value }; setData({ ...data, gallery }); }} />
                    <input placeholder="URL de l’image" value={photo.url} onChange={(e) => { const gallery = [...data.gallery]; gallery[index] = { ...photo, url: e.target.value }; setData({ ...data, gallery }); }} />
                    <button className="danger-link" onClick={() => setData({ ...data, gallery: data.gallery.filter((item) => item.id !== photo.id) })}>Supprimer</button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === 'settings' && (
            <div className="two-columns">
              <Card>
                <div className="section-heading"><div><p className="eyebrow">Publication</p><h2>Paramètres du site</h2></div></div>
                <div className="publish-row"><div><strong>Site internet en ligne</strong><small>Rendre le site accessible au public</small></div><button className={`switch ${data.settings.siteOnline ? 'on' : ''}`} onClick={() => setData({ ...data, settings: { ...data.settings, siteOnline: !data.settings.siteOnline } })}><i /></button></div>
                <div className="publish-row"><div><strong>Publier le menu du jour</strong><small>Afficher le menu actuellement préparé</small></div><button className={`switch ${data.settings.menuPublished ? 'on' : ''}`} onClick={() => setData({ ...data, settings: { ...data.settings, menuPublished: !data.settings.menuPublished } })}><i /></button></div>
              </Card>
              <Card>
                <div className="section-heading"><div><p className="eyebrow">Maintenance</p><h2>Données locales</h2></div></div>
                <p className="muted">Cette première version conserve les modifications dans le navigateur. La prochaine étape connectera l’application à une base de données sécurisée et au véritable site.</p>
                <button className="danger-button" onClick={() => { localStorage.removeItem('lbdc-admin-data'); setData(defaultData); }}>Réinitialiser les données</button>
              </Card>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
