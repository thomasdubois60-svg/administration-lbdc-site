import {createHash} from 'node:crypto';
import {settings} from './final-features';

const present=name=>Boolean(process.env[name]);
export function redactDiagnostic(value){
  const secrets=Object.entries(process.env).filter(([k,v])=>v&&/TOKEN|SECRET|PASSWORD|PRIVATE_KEY|SERVICE_ROLE_KEY/.test(k)).map(([,v])=>v);
  const clean=v=>typeof v==='string'?secrets.reduce((s,secret)=>s.split(secret).join('[masqué]'),v):Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clean(x)])):v;
  return clean(value);
}
export function githubRepository(){
  const repo=process.env.GITHUB_REPO||'lebistrotducoin';
  return repo.includes('/')?repo:(process.env.GITHUB_OWNER||'thomasdubois60-svg')+'/'+repo;
}
export function clubEnvironment(){
  const names=['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','GITHUB_OWNER','GITHUB_REPO','GITHUB_BRANCH','GITHUB_TOKEN','NEXT_PUBLIC_VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT','CLUB_REWARD_QR_SECRET','PERMANENT_QR_SECRET'];
  const urlName=present('SUPABASE_URL')?'SUPABASE_URL':present('NEXT_PUBLIC_SUPABASE_URL')?'NEXT_PUBLIC_SUPABASE_URL':null;
  const keyName=present('SUPABASE_SERVICE_ROLE_KEY')?'SUPABASE_SERVICE_ROLE_KEY':present('SUPABASE_SECRET_KEY')?'SUPABASE_SECRET_KEY':null;
  return {
    variables:Object.fromEntries(names.map(name=>[name,present(name)])),
    supabase:{urlVariable:urlName,keyVariable:keyName,missing:[...(!urlName?['SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL']:[]),...(!keyName?['SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEY']:[])],
      projectFingerprint:urlName?createHash('sha256').update(process.env[urlName].replace(/\/$/,'')).digest('hex').slice(0,16):null,
      legacyClubRequiresServiceRole:!present('SUPABASE_SERVICE_ROLE_KEY'),
      urlAliasesDiffer:present('SUPABASE_URL')&&present('NEXT_PUBLIC_SUPABASE_URL')&&process.env.SUPABASE_URL.replace(/\/$/,'')!==process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/,''),
      bothKeyAliasesPresent:present('SUPABASE_SERVICE_ROLE_KEY')&&present('SUPABASE_SECRET_KEY')},
    github:{repository:githubRepository(),branch:process.env.GITHUB_BRANCH||'main',tokenPresent:present('GITHUB_TOKEN'),writePermissionVerified:false},
    preferencesRequireGithub:false
  };
}
export function upstreamDiagnostic(error){
  return redactDiagnostic(error?.diagnostic||{operation:'unknown',message:error?.message||'Erreur inconnue',http_status:null});
}
export async function githubFailure(response,operation){
  const body=await response.json().catch(()=>null);
  return Object.assign(new Error('GitHub a refusé '+operation+'. Consultez le diagnostic de la réponse.'),{
    diagnostic:redactDiagnostic({service:'github',operation,http_status:response.status,response:body}),status:response.status
  });
}
// Used only by the community routes; leaves the other Supabase consumers unchanged.
export async function clubDB(path,method='GET',body){
  let config;
  try{config=settings()}catch{throw Object.assign(new Error('Configuration Supabase du Club incomplète.'),{diagnostic:{service:'supabase',operation:path.split('?')[0],http_status:null,missing:clubEnvironment().supabase.missing}})}
  const operation=path.split('?')[0];
  let response;
  try{response=await fetch(config.url+'/rest/v1/'+path,{method,headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)})}
  catch(error){throw Object.assign(new Error('Connexion Supabase du Club impossible.'),{diagnostic:{service:'supabase',operation,http_status:null,message:redactDiagnostic(error.message)}})}
  const text=await response.text();let result;
  try{result=text?JSON.parse(text):null}catch{result=null}
  if(!response.ok)throw Object.assign(new Error('Supabase a refusé cette opération du Club.'),{diagnostic:redactDiagnostic({service:'supabase',operation,http_status:response.status,response:result})});
  if(text&&result===null&&text!=='null')throw Object.assign(new Error('Réponse Supabase illisible.'),{diagnostic:{service:'supabase',operation,http_status:response.status}});
  return result;
}
