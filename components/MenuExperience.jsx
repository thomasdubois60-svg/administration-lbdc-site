'use client';
import { useEffect, useRef } from 'react';
import styles from './MenuExperience.module.css';
export const menuStyles = {bistrot:'Bistrot chic', moderne:'Moderne premium', ardoise:'Ardoise / brasserie', atelier:'Atelier / gourmet'};
export function categoryKeys(menu) {
 const seen = new Map();
 return menu.map(section => {
  const base = section.id || section.category.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'categorie';
  const count = (seen.get(base)||0)+1; seen.set(base,count); return count===1?base:base+'-'+count;
 });
}
const photo = value => typeof value==='string' && (value.startsWith('/photos/') || /^https:\/\//i.test(value)) ? (value.startsWith('/photos/') ? 'https://raw.githubusercontent.com/thomasdubois60-svg/lebistrotducoin/main/public'+value : value) : '';
const prices = value => (value||'').split(/\s*(?:\/|·)\s*/).filter(Boolean).map(part=>part.replace(/^([^:]+):\s*(.+)$/, '$1 — $2'));
export default function MenuExperience({menu=[], activeKey=null, introduction='', onNavigate, preview=false, compact=false}) {
 const keys=categoryKeys(menu), index=keys.indexOf(activeKey), category=menu[index];
 const heading=useRef(null);
 useEffect(()=>{if(!compact && heading.current) heading.current.focus({preventScroll:true});},[activeKey,compact]);
 const navigate=(event,key)=>{if(onNavigate && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button===0){event.preventDefault();onNavigate(key);}};
 const link=(key,label,className)=> <a className={className} href={key?'/carte/'+encodeURIComponent(key):'/carte'} onClick={event=>navigate(event,key)}>{label}</a>;
 const style=category && menuStyles[category.style]?category.style:'bistrot';
 return <div className={styles.experience+' '+styles[style]} data-menu-style={style}>
  {preview&&<p className={styles.draft}>Prévisualisation · modifications non publiées</p>}
  {!category ? <>
   <header className={styles.intro}><span className={styles.eyebrow}>Le Bistrot du Coin</span><h1 ref={heading} tabIndex={-1}>À la carte</h1><p>{introduction || 'À partager, à savourer, à découvrir. Choisissez votre envie.'}</p></header>
   {activeKey&&<p className={styles.notice}>Cette catégorie n’est plus disponible. Découvrez notre carte actuelle.</p>}
   <div className={styles.categories}>{menu.map((section,i)=>{const image=photo(section.headerImage)||photo(section.items?.find(item=>photo(item.image))?.image);return <a key={keys[i]} href={'/carte/'+encodeURIComponent(keys[i])} onClick={event=>navigate(event,keys[i])} className={styles.tile}>
    <div className={styles.tileImage}><span className={styles.monogram}>LBDC<span>À savourer</span></span>{image&&<img src={image} alt="" loading="lazy" onError={event=>{event.currentTarget.style.display="none"}}/>}<span className={styles.number}>{String(i+1).padStart(2,'0')}</span></div>
    <div className={styles.tileText}><h2>{section.category}</h2><p>{section.subtitle || (section.items?.length||0)+' propositions à découvrir'}</p><span className={styles.discover}>Découvrir <span aria-hidden="true">↗</span></span></div>
   </a>})}</div>{!menu.length&&<p className={styles.notice}>Notre carte sera bientôt disponible.</p>}
  </> : <>
   {!compact&&<nav className={styles.toolbar} aria-label="Navigation de la carte">{link(null,'← Toutes les catégories',styles.back)}<label><span className={styles.srOnly}>Choisir une catégorie</span><select value={activeKey} onChange={event=>onNavigate?onNavigate(event.target.value):window.location.assign('/carte/'+encodeURIComponent(event.target.value))}>{menu.map((s,i)=><option value={keys[i]} key={keys[i]}>{s.category}</option>)}</select></label></nav>}
   <header className={styles.hero}>
    {photo(category.headerImage)&&<img className={styles.heroImage} src={photo(category.headerImage)} alt=""/>}
    <div className={styles.heroText}><span className={styles.eyebrow}>La carte · {String(index+1).padStart(2,'0')} / {String(menu.length).padStart(2,'0')}</span><h1 ref={heading} tabIndex={-1}>{category.category}</h1>{category.subtitle&&<p>{category.subtitle}</p>}</div>
   </header>
   <section className={styles.products} aria-label={'Produits — '+category.category}>{(category.items||[]).map((item,i)=>{const image=photo(item.image),priceDescription=Boolean(item.description&&/€/.test(item.description)&&/\b(?:cl|litres?|l)\b/i.test(item.description));return <article className={styles.product} key={i}>
    {image&&<img className={styles.productImage} src={image} alt={item.imageAlt||item.name} loading="lazy"/>}<div className={styles.productText}><h2>{item.name}</h2>{item.description&&!priceDescription&&<p>{item.description}</p>}</div><div className={styles.price}>{prices([priceDescription?item.description:'',item.price].filter(Boolean).join(' · ')).map((part,j)=><span key={j}>{part}</span>)}</div>
   </article>})}{!category.items?.length&&<p className={styles.notice}>De nouvelles propositions arrivent bientôt.</p>}</section>
   {!compact&&<footer className={styles.footer}><p>Une autre envie ?</p><nav className={styles.pagination} aria-label="Catégories précédente et suivante">{index>0?link(keys[index-1],<><small>← Précédent</small><strong>{menu[index-1].category}</strong></>,styles.pageLink):<span/>}{index<menu.length-1?link(keys[index+1],<><small>Suivant →</small><strong>{menu[index+1].category}</strong></>,styles.pageLink):link(null,<><small>Carte complète ↗</small><strong>Toutes les catégories</strong></>,styles.pageLink)}</nav>{link(null,'Revenir à la liste des catégories',styles.back)}</footer>}
  </>}
 </div>;
}
