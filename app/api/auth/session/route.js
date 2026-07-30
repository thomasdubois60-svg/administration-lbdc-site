import {NextResponse} from 'next/server';import {validSession} from '../../../../lib/auth';export async function GET(request){return NextResponse.json({authenticated:validSession(request)});}
