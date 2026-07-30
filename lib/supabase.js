const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
export function configured(){return Boolean(url&&key)}
export async function sb(path,{method='GET',body,headers={}}={}){
 if(!configured()) throw new Error('Supabase non configuré dans Vercel.');
 const r=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation',...headers},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
 if(!r.ok)throw new Error(data?.message||data?.hint||`Erreur Supabase (${r.status})`);return data;
}
export const tables={members:process.env.CLUB_MEMBERS_TABLE||'club_members',history:process.env.CLUB_HISTORY_TABLE||'club_history',promotions:process.env.PROMOTIONS_TABLE||'promotions',subscriptions:process.env.PUSH_SUBSCRIPTIONS_TABLE||'push_subscriptions'};
