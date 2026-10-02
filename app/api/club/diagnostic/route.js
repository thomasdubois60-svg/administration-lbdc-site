import {NextResponse} from 'next/server';
import {hasRole,ROLES} from '../../../../lib/auth';
import {clubEnvironment,redactDiagnostic} from '../../../../lib/club-diagnostics';
import {settings} from '../../../../lib/final-features';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
// Read-only: no RPC, member records, notifications, GitHub commit or write probe.
export async function GET(request){
  if(!hasRole(request,ROLES.MANAGER))return NextResponse.json({error:'Accès refusé.'},{status:403,headers});
  const environment=clubEnvironment();
  const probe=async(service,operation,url,auth)=>{
    try{
      const response=await fetch(url,{headers:auth,cache:'no-store',signal:AbortSignal.timeout(8000)});
      const body=await response.json().catch(()=>null);
      return {service,operation,http_status:response.status,ok:response.ok,
        ...(response.ok?{rows:Array.isArray(body)?body.length:undefined,sha:service==='github'?body?.sha:undefined}: {response:redactDiagnostic(body)})};
    }catch(error){return {service,operation,http_status:null,ok:false,error:redactDiagnostic(error.message)}}
  };
  const pending=[];
  if(!environment.supabase.missing.length){
    const {url,key}=settings();
    for(const table of ['club_preference_options','club_preference_settings','club_referral_settings']){
      pending.push(probe('supabase','lecture '+table,url+'/rest/v1/'+table+'?select=id&limit=1000',{apikey:key,Authorization:'Bearer '+key}));
    }
  }
  pending.push(probe('github','lecture contenu',`https://api.github.com/repos/${environment.github.repository}/contents/data/site-content.json?ref=${encodeURIComponent(environment.github.branch)}`,{Accept:'application/vnd.github+json',...(process.env.GITHUB_TOKEN?{Authorization:'Bearer '+process.env.GITHUB_TOKEN}:{})}));
  const checks=await Promise.all(pending);
  return NextResponse.json({environment,checks,readChecksPassed:!environment.supabase.missing.length&&checks.every(c=>c.ok),writesVerified:false,productionChainVerified:false},{headers});
}
