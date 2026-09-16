'use client';
import { useState } from 'react';
import styles from './MenuEditor.module.css';
import MenuExperience, {categoryKeys, menuStyles} from './MenuExperience';

const photoUrl = value => value?.startsWith('/photos/') ? `https://lebistrotducoin.vercel.app${value}` : value;
const photoFallback = event => {
 const image = event.currentTarget;
 if (!image.dataset.fallback && image.src.startsWith('https://lebistrotducoin.vercel.app/photos/')) {
  image.dataset.fallback = 'true';
  image.src = image.src.replace('https://lebistrotducoin.vercel.app', 'https://raw.githubusercontent.com/thomasdubois60-svg/lebistrotducoin/main/public');
 }
};
const move = (items, from, to) => {
 const next = [...items];
 next.splice(to, 0, next.splice(from, 1)[0]);
 return next;
};

export default function MenuEditor({globalStyle='bistrot', onGlobalStyleChange, menu, onChange, introduction, onIntroductionChange, ImagePicker, setStatus}) {
 const [selected, setSelected] = useState(null);
 const [editing, setEditing] = useState(null);
 const [title, setTitle] = useState('');
 const [preview, setPreview] = useState(false);
 const category = selected === null ? null : menu[selected];
 const open = index => { setSelected(index); setEditing(null); setPreview(false); window.scrollTo(0, 0); };
 const updateCategory = update => onChange(current => current.map((item, index) => index === selected ? update(item) : item));
 const updateProduct = (index, values) => updateCategory(item => ({...item, items:item.items.map((product, i) => i === index ? {...product, ...values} : product)}));
 const moveProduct = (index, destination) => {
  onChange(current => {
   const product = current[selected].items[index];
   return current.map((item, i) => i === selected ? {...item, items:item.items.filter((_, j) => j !== index)}
    : i === destination ? {...item, items:[...(item.items || []), product]} : item);
  });
  setEditing(null);
  setStatus('Produit déplacé. Cliquez sur Publier pour enregistrer la carte.');
 };

 const [globalPreviewKey,setGlobalPreviewKey]=useState(undefined);
 return <div className={styles.editor}>
  <section className="card"><h2>Style global de la Carte</h2><p className="muted">Choisissez une ambiance, vérifiez l’aperçu, puis publiez. Les styles particuliers des catégories restent prioritaires.</p>
   <div className={styles.styleChoices} role="group" aria-label="Style global de la Carte">{Object.entries(menuStyles).filter(([key])=>key!=='atelier').map(([key,label])=><button key={key} type="button" aria-pressed={globalStyle===key} className={styles.styleChoice} onClick={()=>onGlobalStyleChange(key)}><span aria-hidden="true" className={styles.miniature+' '+styles[key]}><span>LE BISTROT</span><strong>À savourer</strong><i/><small>Une belle assiette <b>18 €</b></small><small>Un moment à partager <b>12 €</b></small></span><strong>{label}</strong></button>)}</div>
   <button type="button" className="secondary-button" onClick={()=>onChange(current=>current.map(item=>({...item,style:''})))}>Appliquer le style global à toutes les catégories</button>
   <details className={styles.globalPreview} open><summary>Aperçu du style global</summary><p className="muted">Cette simulation utilise le style global. Les exceptions restent visibles dans l’aperçu de chaque catégorie.</p><MenuExperience globalStyle={globalStyle} menu={menu.map(item=>({...item,style:''}))} activeKey={globalPreviewKey === undefined ? categoryKeys(menu)[0] : globalPreviewKey} preview onNavigate={setGlobalPreviewKey}/></details>
  </section>
  {!category ? <>
   <section className="card">
    <form className={styles.creation} onSubmit={event => {
     event.preventDefault();
     const categoryTitle = title.trim();
     if (!categoryTitle) return;
     onChange(current => [{id:crypto.randomUUID(), category:categoryTitle, items:[]}, ...current]);
     setTitle('');
    }}>
     <label className="field"><span>Nom de la nouvelle catégorie</span><input required value={title} onChange={event => setTitle(event.target.value)}/></label>
     <button className="primary-button" type="submit">+ Créer une catégorie</button>
    </form>
    <p className="muted">Ouvrez une catégorie pour modifier ses produits. Cliquez sur Publier pour enregistrer vos changements.</p>
   </section>
   <div className={styles.list}>
    {menu.map((item, index) => <section className={`card ${styles.category}`} key={index} data-menu-category={index}>
     <button className={styles.categoryName} type="button" onClick={() => open(index)}><strong>{item.category || 'Sans titre'}</strong><span>{item.items?.length || 0} produit{item.items?.length === 1 ? '' : 's'}</span></button>
     <div className={styles.actions}>
      <button type="button" className="secondary-button" onClick={() => open(index)} aria-label={`Ouvrir ${item.category}`}>Ouvrir</button>
      <button type="button" disabled={index === 0} aria-label={`Monter la catégorie ${item.category}`} onClick={() => onChange(current => move(current, index, index - 1))}>Monter</button>
      <button type="button" disabled={index === menu.length - 1} aria-label={`Descendre la catégorie ${item.category}`} onClick={() => onChange(current => move(current, index, index + 1))}>Descendre</button>
      <button type="button" className="danger-link" aria-label={`Supprimer la catégorie ${item.category}`} onClick={() => {
       if (window.confirm(`Supprimer la catégorie « ${item.category} » et ses ${item.items?.length || 0} produit(s) ?`)) onChange(current => current.filter((_, i) => i !== index));
      }}>Supprimer</button>
     </div>
    </section>)}
   </div>
   <details className={`card ${styles.introduction}`}><summary>Introduction de la carte</summary><label className="field"><span>Introduction</span><textarea value={introduction || ''} onChange={event => onIntroductionChange(event.target.value)}/></label></details>
  </> : <>
   <section className="card">
    <button type="button" className="secondary-button" onClick={() => open(null)}>← Retour aux catégories</button>
    <h2>{category.category || 'Sans titre'}</h2>
    <label className="field"><span>Nom de la catégorie</span><input value={category.category || ''} onChange={event => updateCategory(item => ({...item, category:event.target.value}))}/></label>
    <label className="field"><span>Sous-titre de la catégorie</span><textarea rows={2} value={category.subtitle || ''} onChange={event => updateCategory(item => ({...item, subtitle:event.target.value}))}/></label>
    <ImagePicker label="Photo d’en-tête de la catégorie" value={category.headerImage} setStatus={setStatus} onChange={headerImage => updateCategory(item => ({...item, headerImage}))}/>
    <label className="field"><span>Style visuel</span><select value={menuStyles[category.style]?category.style:''} onChange={event => updateCategory(item => ({...item, style:event.target.value}))}><option value="">Style global ({menuStyles[globalStyle]})</option>{Object.entries(menuStyles).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
    {!preview&&<div className={styles.directPreview} aria-label="Aperçu visuel direct"><MenuExperience globalStyle={globalStyle} menu={[category]} activeKey={categoryKeys([category])[0]} compact/></div>}
    <div className={styles.actions}>
     <button type="button" className="secondary-button" aria-pressed={preview} onClick={() => setPreview(value => !value)}>{preview ? 'Fermer la prévisualisation' : 'Prévisualiser'}</button>
     <button type="button" className="primary-button" onClick={() => {
      const index = category.items?.length || 0;
      updateCategory(item => ({...item, items:[...(item.items || []), {name:'Nouveau produit', description:'', price:'', image:''}]}));
      setPreview(false); setEditing(index);
     }}>Ajouter un produit</button>
    </div>
   </section>
   {preview ? <section className={styles.preview} aria-label="Prévisualisation de la catégorie"><MenuExperience menu={menu} activeKey={categoryKeys(menu)[selected]} introduction={introduction} preview onNavigate={key=>{if(key===null){open(null)}else{setSelected(categoryKeys(menu).indexOf(key));setEditing(null);window.scrollTo(0,0)}}}/></section> : <div className={styles.list}>
    {(category.items || []).map((product, index) => <section className="card" key={index} data-menu-product={index}>
     <div className={styles.productSummary}>
      {product.image && <img src={photoUrl(product.image)} onError={photoFallback} alt={product.imageAlt || ''}/>}
      <strong>{product.name || 'Sans nom'}</strong><span>{product.price}</span>
     </div>
     <div className={styles.actions}>
      <button type="button" className="secondary-button" aria-expanded={editing === index} aria-label={`Modifier ${product.name}`} onClick={() => setEditing(editing === index ? null : index)}>{editing === index ? 'Fermer' : 'Modifier'}</button>
      <button type="button" disabled={index === 0} aria-label={`Monter le produit ${product.name}`} onClick={() => { updateCategory(item => ({...item, items:move(item.items, index, index - 1)})); setEditing(null); }}>Monter</button>
      <button type="button" disabled={index === category.items.length - 1} aria-label={`Descendre le produit ${product.name}`} onClick={() => { updateCategory(item => ({...item, items:move(item.items, index, index + 1)})); setEditing(null); }}>Descendre</button>
      <select aria-label={`Déplacer ${product.name} vers une catégorie`} value="" disabled={menu.length < 2} onChange={event => { if (event.target.value !== '') moveProduct(index, Number(event.target.value)); }}>
       <option value="">Déplacer vers…</option>{menu.map((item, i) => i !== selected && <option key={i} value={i}>{item.category || 'Sans titre'}</option>)}
      </select>
      <button type="button" className="danger-link" aria-label={`Supprimer le produit ${product.name}`} onClick={() => {
       if (window.confirm(`Supprimer le produit « ${product.name} » ?`)) { updateCategory(item => ({...item, items:item.items.filter((_, i) => i !== index)})); setEditing(null); }
      }}>Supprimer</button>
     </div>
     {editing === index && <div className={styles.form}>
      <label className="field"><span>Nom</span><input value={product.name || ''} onChange={event => updateProduct(index, {name:event.target.value})}/></label>
      <label className="field"><span>Prix</span><input value={product.price || ''} onChange={event => updateProduct(index, {price:event.target.value})}/></label>
      <label className="field"><span>Description</span><textarea rows={3} value={product.description || ''} onChange={event => updateProduct(index, {description:event.target.value})}/></label>
      <ImagePicker label="Photo du produit" value={product.image} setStatus={setStatus} onChange={image => updateProduct(index, {image})}/>
      <label className="field"><span>Texte alternatif (facultatif)</span><input value={product.imageAlt || ''} onChange={event => updateProduct(index, {imageAlt:event.target.value})}/></label>
     </div>}
    </section>)}
    {!category.items?.length && <p className="card">Aucun produit. Utilisez « Ajouter un produit » pour commencer.</p>}
   </div>}
  </>}
 </div>;
}
