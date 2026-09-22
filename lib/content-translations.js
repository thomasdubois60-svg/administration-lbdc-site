import reviewed from './editorial-translations.json';
// Only editorial text can be translated. Prices, URLs, IDs, dates and business rules stay French-source values.
const textFields=new Set(['name','description','title','intro','text','category','subtitle','alt','imageAlt','label','eyebrow','quote','homeSlogan','todayIntro','menuIntro','galleryIntro','contactIntro','eventsIntro','reviewsIntro','dateLabel','startersTitle','mainsTitle','dessertsTitle','suggestionSupplementText','presentation','programExplanation','conditions','availableTitle','historyTitle','summaryTitle','savingsMessage','reward','clientText','hours','closureMessage','reopeningBannerMessage']);
const arraysOfText=new Set(['paragraphs','rewards']);
const roots=new Set(['general','pageTexts','daily','menu','gallery','galleryAlbums','story','privatization','events','reviews','club','loyaltyProgram','sectionPhotos','heroImageAlt','catering']);
export function translatableFields(source){
 const fields=[];
 function walk(value,path,key){
  if(typeof value==='string'){if((textFields.has(key)||arraysOfText.has(key)||key==='heroImageAlt')&&value.trim())fields.push({path,source:value});return}
  if(Array.isArray(value)){value.forEach((item,index)=>walk(item,`${path}.${index}`,arraysOfText.has(key)?key:String(index)));return}
  if(value&&typeof value==='object')for(const [key,item]of Object.entries(value))walk(item,path?`${path}.${key}`:key,key);
 }
 for(const key of roots)if(source?.[key]!==undefined)walk(source[key],key,key);
 return fields;
}
export function translationFor(source,field,locale){
 if(locale==='fr')return field.source;
 const entry=source.translations?.[locale]?.[field.path];
 if(entry)return typeof entry.source==='string'&&entry.source.trim()===field.source.trim()&&typeof entry.value==='string'?entry.value:'';
 return reviewed[field.source.trim()]?.[locale]||'';
}
export function withReviewedTranslations(source){
 const translations={...source.translations};
 for(const locale of ['en','es','pt','de']){
  translations[locale]={...translations[locale]};
  for(const field of translatableFields(source))if(!Object.hasOwn(translations[locale],field.path)){
   const value=reviewed[field.source.trim()]?.[locale];
   if(value)translations[locale][field.path]={source:field.source,value};
  }
 }
 return {...source,translations};
}
export function localizeContent(source,locale){
 if(locale==='fr'||!source)return source;
 const translated=JSON.parse(JSON.stringify(source));
 // Preserve category addresses even when their visible names are translated.
 translated.events?.forEach((event,index)=>{event._sourceTitle=source.events[index].title});
 const seen=new Map();
 translated.menu?.forEach(section=>{section._sourceCategory=section.category;const base=section.id||section.category.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'categorie';const n=(seen.get(base)||0)+1;seen.set(base,n);section.id=n===1?base:base+'-'+n});
 for(const {path,source:text}of translatableFields(source)){
  const value=translationFor(source,{path,source:text},locale);
  if(!value.trim())continue;
  const keys=path.split('.');let target=translated;
  for(const key of keys.slice(0,-1))target=target[key];
  target[keys.at(-1)]=value;
 }
 return translated;
}
