import 'server-only';
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from './db';
import { sendOtpSms } from './sms';

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

export async function requestOtp(phoneInput: string): Promise<{ ok: true; phone: string; devCode?: string } | { ok: false; error: string }> {
  const phone = normalisePhone(phoneInput);
  if (!phone) return { ok: false, error: 'Enter a valid 10-digit Indian mobile number.' };
  const recent = await sql`select created_at from otp_requests where phone = ${phone} and created_at > now() - interval '1 hour' order by created_at desc`;
  if (recent.length >= OTP_PER_HOUR) return { ok: false, error: 'Too many codes requested. Try again in an hour.' };
  if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < OTP_RESEND_SEC * 1000) {
    return { ok: false, error: `Please wait ${OTP_RESEND_SEC} seconds before asking for a new code.` };
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await sql`insert into otp_requests (phone, code_hash, expires_at) values (${phone}, ${hash(phone + ':' + code)}, now() + ${OTP_TTL_MIN + ' minutes'}::interval)`;
  const sent = await sendOtpSms(phone, code);
  if (!sent.ok) return { ok: false, error: 'Could not send the SMS. Please try again.' };
  return { ok: true, phone, devCode: sent.devCode };
}

export async function verifyOtp(phoneInput: string, code: string): Promise<{ ok: true; user: User; isNew: boolean } | { ok: false; error: string }> {
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
    [user] = await sql<User[]>`
      insert into users (phone, de_id) values (${phone}, ${'DE-' + new Date().getFullYear() + '-' + String(crypto.randomInt(10000, 99999))})
      on conflict (phone) do update set phone = excluded.phone returning *`;
  }
  await createSession(user.id);
  return { ok: true, user, isNew };
}

async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ua = (await headers()).get('user-agent')?.slice(0, 200) ?? null;
  await sql`insert into sessions (user_id, token_hash, expires_at, user_agent) values (${userId}, ${hash(token)}, now() + ${SESSION_DAYS + ' days'}::interval, ${ua})`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
    maxAge: SESSION_DAYS * 86400,
    // e.g. ".deeducare.com" so the website can see the student is signed in.
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sql`delete from sessions where token_hash = ${hash(token)}`;
  jar.set(SESSION_COOKIE, '', { path: '/', maxAge: 0, domain: process.env.COOKIE_DOMAIN || undefined });
}

/** The signed-in user, or null. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await sql<User[]>`
    select u.* from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hash(token)} and s.expires_at > now()`;
  if (!row) return null;
  sql`update users set last_active_at = now() where id = ${row.id} and (last_active_at is null or last_active_at < now() - interval '5 minutes')`.catch(() => {});
  return row;
}

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
  batches: ['admin', 'faculty'],
  students: ['admin', 'support', 'faculty'],
  classes: ['admin', 'faculty'],
  bank: ['admin', 'content'],
  tests: ['admin', 'content'],
  iface: ['admin', 'content'],
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
