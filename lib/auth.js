import crypto from 'crypto';

export const COOKIE_NAME='lbdc_admin_session';
const maxAge=60*60*12;
function secret(){return process.env.AUTH_SECRET||process.env.ADMIN_PASSWORD||'change-me';}
function sign(value){return crypto.createHmac('sha256',secret()).update(value).digest('hex');}
export function makeSession(){const payload=Buffer.from(JSON.stringify({exp:Date.now()+maxAge*1000})).toString('base64url');return `${payload}.${sign(payload)}`;}
export function validSession(request){const raw=request.cookies.get(COOKIE_NAME)?.value;if(!raw)return false;const [payload,sig]=raw.split('.');if(!payload||!sig)return false;const expected=sign(payload);if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;try{return JSON.parse(Buffer.from(payload,'base64url').toString()).exp>Date.now();}catch{return false;}}
export const sessionCookie={httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge};
