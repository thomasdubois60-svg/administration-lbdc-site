import {NextResponse} from 'next/server';
import {hasRole,ROLES} from '../../../lib/auth';
export async function POST(r){try{
 if(!hasRole(r,ROLES.MANAGER))return NextResponse.json({error:'Accès refusé.'},{status:403});
 if(r.headers.get('origin')&&r.headers.get('origin')!==new URL(r.url).origin)return NextResponse.json({error:'Origine refusée.'},{status:403});
 if(Number(r.headers.get('content-length')||0)>16000)return NextResponse.json({error:'Texte trop long.'},{status:400});
 const {fields}=await r.json();const entries=Object.entries(fields||{});if(!entries.length||entries.length>2||entries.some(([k,v])=>!['name','description','category','subtitle'].includes(k)||typeof v!=='string'||v.length>3000))return NextResponse.json({error:'Texte invalide.'},{status:400});
 const key=process.env.DEEPL_API_KEY;if(!key)return NextResponse.json({error:'Traduction automatique non configurée. La saisie manuelle reste disponible.'},{status:503});
 const texts=entries.filter(([,v])=>v.trim());if(!texts.length)return NextResponse.json({translations:{}});
 const translations={};for(const [lang,target]of [['en','EN-GB'],['es','ES'],['pt','PT-PT'],['de','DE']]){const response=await fetch((key.endsWith(':fx')?'https://api-free.deepl.com':'https://api.deepl.com')+'/v2/translate',{method:'POST',headers:{Authorization:'DeepL-Auth-Key '+key,'Content-Type':'application/json'},body:JSON.stringify({text:texts.map(([,v])=>v),source_lang:'FR',target_lang:target}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();const data=await response.json();if(data.translations?.length!==texts.length)throw Error();translations[lang]=Object.fromEntries(texts.map(([k],i)=>{const v=data.translations[i]?.text;if(typeof v!=='string'||v.length>6000)throw Error();return [k,v]}));}
 return NextResponse.json({translations},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Traduction automatique indisponible. Le français reste publiable.'},{status:503})}}
