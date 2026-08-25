import { NextResponse } from 'next/server';
import { runAutomaticBirthdayOffers } from '../../../../lib/birthday-offers';

export async function GET(request){const secret=process.env.CRON_SECRET;if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Accès refusé.'},{status:401});try{return NextResponse.json({ok:true,...await runAutomaticBirthdayOffers(new Date())})}catch(error){return NextResponse.json({error:error.message},{status:500})}}
