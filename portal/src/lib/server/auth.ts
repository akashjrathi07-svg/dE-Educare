import 'server-only';
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { sql } from './db';
import { sendOtpSms } from './sms';
import { sendWhatsAppOtp, whatsappReady } from './whatsapp';

export const SESSION_COOKIE = 'de_session';
const SESSION_DAYS = 60;
const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_SEC = 30;
const OTP_PER_HOUR = 6;

export type Role = 'student' | 'faculty' | 'content' | 'support' | 'admin';
export type User = {
  id: string; phone: string; de_id: string; name: string | null; email: string | null; city: string | null; role: Role;
  exam_group: 'mba' | 'upsc' | 'bank' | 'ug'; target_exam: string | null; target_year: number | null; target_percentile: number | null;
  theme: 'light' | 'dark'; guru_credits: number; onboarded: boolean; created_at: Date;
};

const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** Normalises Indian mobile numbers to E.164 (+91XXXXXXXXXX). Returns null if invalid. */
export function normalisePhone(input: string): string | null {
  const d = input.replace(/\D/g, '');
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d;
  return /^[6-9]\d{9}$/.test(ten) ? '+91' + ten : null;
}

/** The fixed code for the store-review number, if this is that number and both settings are present. */
function reviewLogin(phone: string): string | null {
  const rp = normalisePhone(process.env.REVIEW_PHONE ?? '');
  const code = process.env.REVIEW_OTP ?? '';
  return rp && rp === phone && /^\d{6}$/.test(code) ? code : null;
}

export type OtpChannel = 'whatsapp' | 'sms';

/**
 * Sends a login code: on WhatsApp when it is set up (falling back to SMS if WhatsApp refuses), or by SMS when the
 * student asks for SMS or WhatsApp is not set up. Returns the channel used.
 */
export async function requestOtp(phoneInput: string, prefer: OtpChannel = 'whatsapp'): Promise<{ ok: true; phone: string; channel: OtpChannel; devCode?: string } | { ok: false; error: string }> {
  const phone = normalisePhone(phoneInput);
  if (!phone) return { ok: false, error: 'Enter a valid 10-digit Indian mobile number.' };
  const recent = await sql`select created_at from otp_requests where phone = ${phone} and created_at > now() - interval '1 hour' order by created_at desc`;
  if (recent.length >= OTP_PER_HOUR) return { ok: false, error: 'Too many codes requested. Try again in an hour.' };
  if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < OTP_RESEND_SEC * 1000) {
    return { ok: false, error: `Please wait ${OTP_RESEND_SEC} seconds before asking for a new code.` };
  }
  // App-store review login: one number set in REVIEW_PHONE signs in with the fixed REVIEW_OTP, no SMS.
  const review = reviewLogin(phone);
  const code = review ?? String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  if (review) {
    await sql`insert into otp_requests (phone, code_hash, expires_at, channel) values (${phone}, ${hash(phone + ':' + code)}, now() + ${OTP_TTL_MIN + ' minutes'}::interval, 'review')`;
    return { ok: true, phone, channel: prefer };
  }
  let waError: string | null = null;
  if (prefer === 'whatsapp' && whatsappReady()) {
    const wa = await sendWhatsAppOtp(phone, code);
    if (!wa.ok) waError = wa.error;
    if (wa.ok) {
      await sql`insert into otp_requests (phone, code_hash, expires_at, channel, wa_message_id) values (${phone}, ${hash(phone + ':' + code)}, now() + ${OTP_TTL_MIN + ' minutes'}::interval, 'whatsapp', ${wa.id})`;
      return { ok: true, phone, channel: 'whatsapp' };
    }
  }
  const sent = await sendOtpSms(phone, code);
  if (!sent.ok) return { ok: false, error: 'Could not send the code. Please try again.' };
  await sql`insert into otp_requests (phone, code_hash, expires_at, channel, wa_error) values (${phone}, ${hash(phone + ':' + code)}, now() + ${OTP_TTL_MIN + ' minutes'}::interval, ${waError ? 'sms_fallback' : 'sms'}, ${waError})`;
  return { ok: true, phone, channel: 'sms', devCode: sent.devCode };
}

/**
 * WhatsApp reported that a login code could not be delivered (number not on WhatsApp, blocked…):
 * send a fresh code by SMS, if that code is still the student's latest unused one.
 */
export async function smsFallbackForWhatsApp(waMessageId: string) {
  const [req] = await sql`
    select o.id, o.phone from otp_requests o
    where o.wa_message_id = ${waMessageId} and not o.used and o.expires_at > now()
      and o.created_at = (select max(created_at) from otp_requests x where x.phone = o.phone)`;
  if (!req) return false;
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const sent = await sendOtpSms(req.phone, code);
  if (!sent.ok) return false;
  await sql.begin(async tx => {
    await tx`update otp_requests set used = true where id = ${req.id}`;
    await tx`insert into otp_requests (phone, code_hash, expires_at, channel) values (${req.phone}, ${hash(req.phone + ':' + code)}, now() + ${OTP_TTL_MIN + ' minutes'}::interval, 'sms_fallback')`;
  });
  return true;
}

/** Checks the code and signs in. On the web a session cookie is set; for the app (`app: true`) the token is returned instead. */
export async function verifyOtp(phoneInput: string, code: string, opts: { app?: boolean } = {}): Promise<{ ok: true; user: User; isNew: boolean; token: string } | { ok: false; error: string }> {
  const phone = normalisePhone(phoneInput);
  if (!phone || !/^\d{6}$/.test(code)) return { ok: false, error: 'Enter the 6-digit code.' };
  const [req] = await sql`select * from otp_requests where phone = ${phone} and not used and expires_at > now() order by created_at desc limit 1`;
  if (!req) return { ok: false, error: 'This code has expired. Ask for a new one.' };
  if (req.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: 'Too many wrong tries. Ask for a new code.' };
  const good = crypto.timingSafeEqual(Buffer.from(req.code_hash), Buffer.from(hash(phone + ':' + code)));
  if (!good) {
    await sql`update otp_requests set attempts = attempts + 1 where id = ${req.id}`;
    return { ok: false, error: 'That code is not right. Check the SMS and try again.' };
  }
  await sql`update otp_requests set used = true where id = ${req.id}`;

  let [user] = await sql<User[]>`select * from users where phone = ${phone}`;
  let isNew = false;
  if (!user) {
    isNew = true;
    [user] = await createUser(phone);
  }
  const token = await createSession(user.id, !opts.app);
  return { ok: true, user, isNew, token };
}

/** New account with a unique DE ID (DE-2026-482130). Retries on the rare ID clash. */
export async function createUser(phone: string, role: Role = 'student') {
  for (let i = 0; ; i++) {
    const deId = 'DE-' + new Date().getFullYear() + '-' + String(crypto.randomInt(100000, 1000000));
    try {
      return await sql<User[]>`
        insert into users (phone, de_id, role) values (${phone}, ${deId}, ${role})
        on conflict (phone) do update set phone = excluded.phone returning *`;
    } catch (e) {
      if (i < 5 && (e as { code?: string; constraint_name?: string }).code === '23505') continue;
      throw e;
    }
  }
}

async function createSession(userId: string, setCookie = true) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ua = (await headers()).get('user-agent')?.slice(0, 200) ?? null;
  await sql`insert into sessions (user_id, token_hash, expires_at, user_agent) values (${userId}, ${hash(token)}, now() + ${SESSION_DAYS + ' days'}::interval, ${ua})`;
  if (!setCookie) return token;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
    maxAge: SESSION_DAYS * 86400,
    // e.g. ".deeducare.com" so the website can see the student is signed in.
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
  return token;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sql`delete from sessions where token_hash = ${hash(token)}`;
  jar.set(SESSION_COOKIE, '', { path: '/', maxAge: 0, domain: process.env.COOKIE_DOMAIN || undefined });
}

/**
 * The signed-in user for this request (cached, so layouts and pages share one lookup): from the de_session cookie (web, website) or an
 * `Authorization: Bearer <session token>` header (the mobile app).
 */
export const currentUser = cache(async function currentUser(): Promise<User | null> {
  const bearer = (await headers()).get('authorization')?.match(/^Bearer\s+([A-Za-z0-9_-]{20,})$/)?.[1];
  const token = bearer ?? (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await sql<User[]>`
    select u.* from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hash(token)} and s.expires_at > now()`;
  if (!row) return null;
  sql`update users set last_active_at = now() where id = ${row.id} and (last_active_at is null or last_active_at < now() - interval '5 minutes')`.catch(() => {});
  return row;
});

/** For pages: signed-in user, else redirect to login and come back. */
export async function requireUser(next?: string): Promise<User> {
  const u = await currentUser();
  if (!u) redirect('/login' + (next ? '?next=' + encodeURIComponent(next) : ''));
  if (!u.onboarded && next !== '/onboarding') redirect('/onboarding' + (next ? '?next=' + encodeURIComponent(next) : ''));
  return u;
}

/** Staff access by area. Admin can do everything. */
export const STAFF_AREAS = {
  overview: ['admin', 'content', 'faculty', 'support'],
  courses: ['admin'],
  coupons: ['admin'],
  batches: ['admin', 'faculty'],
  students: ['admin', 'support', 'faculty'],
  classes: ['admin', 'faculty'],
  bank: ['admin', 'content'],
  tests: ['admin', 'content'],
  iface: ['admin', 'content'],
  resources: ['admin', 'content'],
  reviews: ['admin', 'support'],
} as const satisfies Record<string, Role[]>;
export type StaffArea = keyof typeof STAFF_AREAS;

export function canAccess(role: Role, area: StaffArea) {
  return (STAFF_AREAS[area] as readonly Role[]).includes(role);
}

export async function requireStaff(area: StaffArea): Promise<User> {
  const u = await currentUser();
  if (!u) redirect('/login?next=/admin');
  if (!canAccess(u.role, area)) redirect(u.role === 'student' ? '/' : '/admin');
  return u;
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function staffOrThrow(area: StaffArea): Promise<User> {
  const u = await currentUser();
  if (!u || !canAccess(u.role, area)) throw new Error('Not allowed');
  return u;
}
