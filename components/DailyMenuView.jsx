'use client';
import {useId} from 'react';
import styles from './DailyMenuView.module.css';
import SectionPhoto from './SectionPhoto';

export const dailyThemes = {bistrot:'Bistrot Élégance', moderne:'Maison Contemporaine', ardoise:'Brasserie Signature', nuit:'Nuit & Velours'};
const imageUrl=value=>value?.startsWith('/photos/')?'https://raw.githubusercontent.com/thomasdubois60-svg/lebistrotducoin/main/public'+value:value;
function Dishes({id,title,items,number}) {
 return <section id={id} className={styles.block}>
  <div className={styles.heading}><span aria-hidden="true">{number}</span><h2>{title}</h2></div>
  {items.map((item,i)=><div className={styles.row} key={i}>
   {item.image&&<img src={imageUrl(item.image)} alt={item.imageAlt||''} loading="lazy"/>}
   <div><strong>{item.name}</strong>{item.description&&<small>{item.description}</small>}</div>
   {item.price&&<span className={styles.price}>{item.price}</span>}
  </div>)}
 </section>;
}
export default function DailyMenuView({daily,introduction='',phone='',phoneHref='',photo}) {
 const id=useId();
 const theme=Object.hasOwn(dailyThemes,daily.theme)?daily.theme:'bistrot';
 const groups=[['starters',daily.startersTitle,'01'],['mains',daily.mainsTitle,'02'],['desserts',daily.dessertsTitle,'03']];
 const suggestion=daily.suggestion;
 const hasSuggestion=!!(suggestion.name||suggestion.description||suggestion.image||suggestion.price||daily.suggestionSupplementText);
 return <div className={`${styles.view} ${styles[theme]}`} data-daily-theme={theme}>
  <SectionPhoto photo={photo}/>
  <header className={styles.hero}>
   <span className={styles.eyebrow}>Le Bistrot Du Coin · À notre table</span>
   <h1>Aujourd’hui <em>au Bistrot</em></h1>
   {daily.dateLabel&&<span className={styles.date}>{daily.dateLabel}</span>}
   {introduction&&<p>{introduction}</p>}
   <div className={styles.flourish} aria-hidden="true">— ✦ —</div>
  </header>
  <div className={styles.container}>
   {daily.formulas.length>0&&<section className={styles.formulas} aria-label="Nos formules">
    <div className={styles.formulaIntro}><span className={styles.eyebrow}>Le plaisir de déjeuner</span><h2>Nos formules</h2><p>Sur place ou à emporter</p></div>
    <div className={styles.formulaList}>{daily.formulas.map((f,i)=><div className={styles.formula} key={i}><strong>{f.name}</strong>{f.description&&<small>{f.description}</small>}<span className={styles.formulaPrice}>{f.price}</span>{f.takeawayPrice&&<small>À emporter : {f.takeawayPrice}</small>}</div>)}</div>
   </section>}
   <nav className={styles.navigation} aria-label="Parcourir le menu du jour">{groups.filter(([key])=>daily[key].length>0).map(([key,title])=><a key={key} href={`#${id}-${key}`}>{title}</a>)}{hasSuggestion&&<a href={`#${id}-chef`}>Suggestion du chef</a>}</nav>
   <div className={styles.grid}>
    <div className={styles.courses}>{groups.map(([key,title,number])=><Dishes key={key} id={`${id}-${key}`} title={title} items={daily[key]} number={number}/>)}</div>
    {hasSuggestion&&<aside id={`${id}-chef`} className={styles.suggestion}>
     <span className={styles.eyebrow}>Le petit mot de la cuisine</span><p className={styles.chefLabel}>Suggestion du chef</p>
     {suggestion.image&&<img src={imageUrl(suggestion.image)} alt={suggestion.imageAlt||''} loading="lazy"/>}
     <h2>{suggestion.name}</h2>{suggestion.description&&<p>{suggestion.description}</p>}
     {suggestion.price&&<strong className={styles.chefPrice}>{suggestion.price}</strong>}
     {daily.suggestionSupplementText&&<p className={styles.supplement}>{daily.suggestionSupplementText}</p>}
     <span className={styles.flourish} aria-hidden="true">✦</span>
    </aside>}
   </div>
   {phone&&<footer className={styles.contact}><div><h2>Une table pour aujourd’hui ?</h2><p>Pour connaître le menu exact du jour, appelez-nous.</p></div><a href={`tel:${phoneHref||phone.replace(/[^+\d]/g,'')}`}>{phone}<span aria-hidden="true"> ↗</span></a></footer>}
  </div>
 </div>;
}
