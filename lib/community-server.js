import {createHash} from 'node:crypto';import webpush from 'web-push';import {clubDB as db} from './club-diagnostics';
const key=value=>createHash('sha256').update(value).digest('hex');
export function menuProducts(daily){return ['starters','mains','desserts','suggestion'].flatMap(section=>(section==='suggestion'?[daily?.suggestion]:daily?.[section]||[]).filter(x=>x?.name?.trim()).map(x=>({name:x.name.trim(),category:({starters:'Entrées',mains:'Plats',desserts:'Desserts',suggestion:'Suggestion'})[section]})))}
export function menuIdentity(daily,now=new Date()){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const products=menuProducts(daily).sort((a,b)=>(a.category+a.name).localeCompare(b.category+b.name,'fr'));return {day,products,key:key(JSON.stringify([day,products]))}}
export async function queueMenuNotifications(daily){const p=menuIdentity(daily);return db('rpc/club_enqueue_menu_matches','POST',{p_key:p.key,p_day:p.day,p_products:p.products})}
function endpointAllowed(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='fcm.googleapis.com'||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.push.services.mozilla.com')||u.hostname==='updates.push.services.mozilla.com'||u.hostname.endsWith('.notify.windows.com'))}catch{return false}}

export async function dispatchCommunity(memberId=null,sendOverride=null){
 const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY;
 if(!sendOverride&&(!publicKey||!privateKey))return {sent:0,failed:0,reason:'vapid_missing'};
 if(!sendOverride)webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:lebistrotducoin41220@gmail.com',publicKey,privateKey);
 const deadline=Date.now()+20000;let sent=0,failed=0,remaining=false;
 const pending=await db('rpc/club_ready_community_notifications','POST',{p_member:memberId});
 for(const item of pending){if(Date.now()>=deadline){remaining=true;break}
  const job=await db('rpc/club_claim_community_notification','POST',{p_id:item.id});if(!job)continue;
  const subscriptions=await db('push_subscriptions?verified_member_id=eq.'+job.member_id+'&select=endpoint,subscription&limit=1000');let unfinished=false;
  for(let i=0;i<subscriptions.length;i+=5){if(Date.now()>=deadline){unfinished=true;remaining=true;break}
   await Promise.all(subscriptions.slice(i,i+5).map(async sub=>{
    const endpointKey=key(sub.endpoint);if(!await db('rpc/club_claim_community_delivery','POST',{p_id:job.id,p_endpoint_key:endpointKey}))return;
    let success=false;try{if(!endpointAllowed(sub.endpoint)||sub.subscription?.endpoint!==sub.endpoint)throw Error();const payload=JSON.stringify({title:job.title,body:job.body,url:job.url,tag:'club-community-'+job.id});if(sendOverride)await sendOverride(sub.subscription,payload);else await webpush.sendNotification(sub.subscription,payload,{timeout:4000});success=true;sent++}catch(error){failed++;if([404,410].includes(Number(error?.statusCode)))await db('push_subscriptions?endpoint=eq.'+encodeURIComponent(sub.endpoint),'DELETE').catch(()=>{})}
    await db('club_community_deliveries?notification_id=eq.'+job.id+'&endpoint_key=eq.'+endpointKey,'PATCH',{status:success?'sent':'failed',finished_at:new Date().toISOString()});
   }));
  }
  const attempts=await db('club_community_deliveries?notification_id=eq.'+job.id+'&select=status&limit=1000');const ok=attempts.filter(x=>x.status==='sent').length,bad=attempts.filter(x=>x.status!=='sent').length;
  await db('club_community_notifications?id=eq.'+job.id,'PATCH',{status:unfinished?'pending':ok?'sent':bad?'failed':'skipped',sent_count:ok,failed_count:bad,finished_at:unfinished?null:new Date().toISOString()});
 }
 return {sent,failed,remaining:remaining||pending.length===100};
}
