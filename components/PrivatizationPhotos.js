'use client';

export default function PrivatizationPhotos({data,onChange,ImagePicker,Field,setStatus}) {
 const photos=data.privatization.photos;
 const updateBanner=(key,values)=>onChange(current=>({...current,sectionPhotos:{...current.sectionPhotos,[key]:{...current.sectionPhotos?.[key],...values}}}));
 const updatePhoto=(index,values)=>onChange(current=>({...current,privatization:{...current.privatization,photos:current.privatization.photos.map((photo,i)=>i===index?{...photo,...values}:photo)}}));
 return <section className="top-gap" aria-label="Photos de la page Privatisation">
  <h3>Photos de la page</h3>
  <p className="muted">Remplacez ou retirez les photos, puis cliquez sur Publier pour conserver vos modifications.</p>
  <div className="form-grid">
   {[['privatization','Photo d’en-tête'],['catering','Photo de la section Traiteur']].map(([key,label])=>{
    const photo=data.sectionPhotos?.[key]||{};
    return <div className="editor-box" key={key} style={{minWidth:0}}>
     <ImagePicker label={label} value={photo.image||''} onChange={image=>updateBanner(key,{image})} setStatus={setStatus}/>
     <Field label={`Texte alternatif — ${label}`} value={photo.alt||''} onChange={alt=>updateBanner(key,{alt})}/>
    </div>;
   })}
  </div>
  <div className="section-heading top-gap"><h3>Photos de la galerie</h3><button type="button" className="secondary-button" onClick={()=>onChange(current=>({...current,privatization:{...current.privatization,photos:[...current.privatization.photos,{src:'',alt:'',label:''}]}}))}>Ajouter une photo</button></div>
  <div className="form-grid">
   {photos.map((photo,index)=><div className="editor-box" key={`${index}:${photo.src}`} style={{minWidth:0}}>
    <ImagePicker label={`Photo ${index+1} de la galerie`} value={photo.src} onChange={src=>updatePhoto(index,{src})} setStatus={setStatus}/>
    <Field label={`Texte alternatif — Photo ${index+1}`} value={photo.alt} onChange={alt=>updatePhoto(index,{alt})}/>
    <Field label={`Légende — Photo ${index+1}`} value={photo.label} onChange={label=>updatePhoto(index,{label})}/>
    <button type="button" className="danger-link" onClick={()=>onChange(current=>({...current,privatization:{...current.privatization,photos:current.privatization.photos.filter((_,i)=>i!==index)}}))}>Supprimer cet emplacement</button>
   </div>)}
  </div>
 </section>;
}
