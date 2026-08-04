import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { hasRole, ROLES } from '../../../../lib/auth';
import { sb, loyalty } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!hasRole(request, ROLES.MANAGER)) return NextResponse.json({ error: 'Droits Responsable requis' }, { status: 403 });
  const token = String(request.nextUrl.searchParams.get('token') || '').trim();
  if (!token) return NextResponse.json({ error: 'Jeton manquant.' }, { status: 400 });

  try {
    const rows = await sb(`${loyalty.coupons}?token=eq.${encodeURIComponent(token)}&select=token&limit=1`);
    if (!rows[0]) return NextResponse.json({ error: 'Coupon introuvable.' }, { status: 404 });
    const publicSite = (process.env.PUBLIC_SITE_URL || 'https://lebistrotducoin.vercel.app').replace(/\/$/, '');
    const target = `${publicSite}/coupon/${encodeURIComponent(token)}`;
    const svg = await QRCode.toString(target, { type: 'svg', margin: 1, width: 360, errorCorrectionLevel: 'M' });
    const download = request.nextUrl.searchParams.get('download') === '1';
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'private, max-age=300',
        ...(download ? { 'Content-Disposition': `attachment; filename="coupon-${token.slice(0, 8)}.svg"` } : {})
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
