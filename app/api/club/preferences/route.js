import {NextResponse} from 'next/server';
import {hasRole,ROLES} from '../../../../lib/auth';
import {preferenceDB,savePreferenceConfig,preferenceFailure,PreferenceError} from '../../../../lib/preference-persistence';
const headers={'Cache-Control':'private, no-store'};
function failure(error) {
  const {status,...body}=preferenceFailure(error);
  return NextResponse.json(body,{status,headers});
}
export async function GET(r) {
  if(!hasRole(r,ROLES.MANAGER)) return NextResponse.json({error:'Accès refusé.'},{status:403,headers});
  try {
    const [settings,options,history]=await Promise.all([
      preferenceDB('club_preference_settings?id=eq.true'),
      preferenceDB('club_preference_options?order=category.asc,sort_order.asc,label.asc'),
      preferenceDB('club_community_notifications?order=created_at.desc&limit=200')
    ]);
    if(!settings?.[0]) throw new PreferenceError('La ligne de configuration des préférences est absente de Supabase.','SETTINGS_MISSING');
    return NextResponse.json({settings:settings[0],options,history},{headers});
  } catch(error) { return failure(error); }
}
export async function PUT(r) {
  if(!hasRole(r,ROLES.MANAGER)) return NextResponse.json({error:'Accès refusé.'},{status:403,headers});
  if(r.headers.get('origin')&&r.headers.get('origin')!==new URL(r.url).origin) return NextResponse.json({error:'Origine refusée.'},{status:403,headers});
  try {
    let config;
    try { config=await r.json(); } catch { throw new PreferenceError('La demande de sauvegarde est illisible. Réessayez.','INVALID_JSON',400); }
    await savePreferenceConfig(config);
    return NextResponse.json({ok:true},{headers});
  } catch(error) { return failure(error); }
}
