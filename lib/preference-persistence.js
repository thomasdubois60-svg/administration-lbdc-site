import {settings} from './final-features';

export class PreferenceError extends Error {
  constructor(message, code, status=503) { super(message); this.code=code; this.status=status; }
}
const validations=new Set(['Réglages invalides','Synonymes ou traductions invalides','Synonyme invalide','Traduction invalide']);
export async function preferenceDB(path, method='GET', body) {
  let config;
  try { config=settings(); } catch { throw new PreferenceError('La connexion Supabase des préférences n’est pas configurée sur ce serveur.', 'CONFIGURATION'); }
  let response;
  try {
    response=await fetch(config.url+'/rest/v1/'+path, {
      method, headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json',Prefer:'return=representation'},
      body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)
    });
  } catch { throw new PreferenceError('Connexion à Supabase impossible. Réessayez dans un instant.', 'CONNECTION'); }
  if(!response.ok) {
    const detail=await response.json().catch(()=>({}));
    const code=/^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(detail.code||'')?detail.code:'SUPABASE';
    // The authenticated administration receives the RPC diagnostic separately from the French message.
    const failure=(message,status=503)=>Object.assign(new PreferenceError(message,code,status),{rpc:{code,message:typeof detail.message==='string'?detail.message:null,http_status:response.status}});
    console.error('[club/preferences]',{operation:path.split('?')[0],status:response.status,code});
    if(code==='PGRST202'||code==='42883') throw failure('La fonction de sauvegarde des préférences est absente ou sa signature ne correspond pas au SQL livré.');
    if(['42P01','42703','PGRST204','PGRST205'].includes(code)) throw failure('Une table ou une colonne nécessaire aux préférences manque dans le projet Supabase utilisé.');
    if(response.status===401||response.status===403||code==='42501') throw failure('Supabase refuse cet accès. Vérifiez la clé serveur et les autorisations des préférences dans le projet configuré.');
    if(code==='P0001'&&validations.has(detail.message)) throw failure(detail.message+'. Vérifiez les choix saisis.',400);
    if(['22P02','23502','23514','22003'].includes(code)) throw failure('Supabase a refusé une valeur : vérifiez les identifiants, catégories, libellés et ordres des choix.',400);
    throw failure('Supabase a refusé cette opération sur les préférences. Consultez le diagnostic de la réponse pour identifier le refus.');
  }
  const text=await response.text();
  if(!text) return null;
  try { return JSON.parse(text); } catch { throw new PreferenceError('La réponse Supabase est illisible. L’enregistrement ne peut pas être confirmé.','INVALID_RESPONSE'); }
}

const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
const snapshot=o=>({id:o.id.toLowerCase(),category:o.category,label:o.label.trim(),active:o.active,sort_order:o.sort_order??0,synonyms:o.synonyms,translations:o.translations??{}});
export function validatePreferenceConfig(v) {
  const invalid=()=>{throw new PreferenceError('Vérifiez les réglages : chaque choix doit avoir un identifiant unique, une catégorie, un libellé de 2 à 80 caractères et un ordre entier.','INVALID_CONFIG',400)};
  if(!v||typeof v.enabled!=='boolean'||!Number.isInteger(v.delay_minutes)||v.delay_minutes<0||v.delay_minutes>1440||typeof v.message_template!=='string'||!v.message_template.trim()||v.message_template.length>2000||!Array.isArray(v.options)||v.options.length>100) invalid();
  const ids=new Set();
  for(const o of v.options) {
    if(!o||typeof o.id!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(o.id)||ids.has(o.id.toLowerCase())||!['entrees','plats','desserts'].includes(o.category)||typeof o.label!=='string'||o.label.trim().length<2||o.label.trim().length>80||typeof o.active!=='boolean'||!Number.isInteger(o.sort_order??0)||Math.abs(o.sort_order??0)>2147483647||!Array.isArray(o.synonyms)||o.synonyms.length>10||o.synonyms.some(s=>typeof s!=='string'||s.trim().length<2||s.length>80)) invalid();
    const translations=o.translations??{};
    if(typeof translations!=='object'||Array.isArray(translations)||Object.entries(translations).some(([k,t])=>!['en','es','pt','de'].includes(k)||typeof t!=='string'||t.length>80)) invalid();
    ids.add(o.id.toLowerCase());
  }
}
export function normalizePreferenceConfig(config) {
  if(!config||!Array.isArray(config.options)) return config;
  return {...config,options:config.options.map(o=>o&&typeof o==='object'&&!Array.isArray(o)?{
    ...o,synonyms:o.synonyms??[],translations:o.translations??{},active:o.active??true,sort_order:o.sort_order??0
  }:o)};
}
export async function savePreferenceConfig(input) {
  const config=normalizePreferenceConfig(input);
  validatePreferenceConfig(config);
  await preferenceDB('rpc/club_save_preference_config','POST',{p_config:config});
  // Check the actual rows, even if an obsolete RPC returned success without writing options.
  const [rows,options]=await Promise.all([
    preferenceDB('club_preference_settings?id=eq.true'),
    preferenceDB('club_preference_options?order=category.asc,sort_order.asc,label.asc')
  ]);
  const saved=rows?.[0], expected=new Map(config.options.map(o=>[o.id.toLowerCase(),snapshot(o)]));
  const settingsMatch=saved&&['enabled','message_template','delay_minutes'].every(k=>saved[k]===config[k]);
  const optionsMatch=Array.isArray(options)&&options.filter(o=>expected.has(o.id)).length===expected.size&&[...expected].every(([id,wanted])=>{
    const actual=options.find(o=>o.id===id);
    return actual&&JSON.stringify(ordered(snapshot(actual)))===JSON.stringify(ordered(wanted));
  })&&options.every(o=>!o.active||expected.has(o.id));
  if(!settingsMatch||!optionsMatch) throw new PreferenceError('Enregistrement non confirmé : les données relues dans Supabase ne correspondent pas aux choix envoyés. Vérifiez la version de la fonction club_save_preference_config et le projet configuré.','PERSISTENCE_MISMATCH',409);
}
export function preferenceFailure(error) {
  if(error instanceof PreferenceError) return {error:error.message,code:error.code,status:error.status,...(error.rpc?{rpc:error.rpc}:{})};
  return {error:'Préférences momentanément indisponibles. Aucun enregistrement ne peut être confirmé.',code:'UNEXPECTED',status:503};
}
