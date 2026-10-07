import 'server-only';
import { sql } from './db';
import type { User } from './auth';
import { activeCourseIds, dailyGuruLimit } from './access';
import { streakOf, xpTotals } from './xp';

export const GROUPS = [
  { id: 'mba', name: 'MBA' }, { id: 'upsc', name: 'UPSC' }, { id: 'bank', name: 'Bank PO' }, { id: 'ug', name: 'Undergrad' },
] as const;

/** Data every student page needs for the sidebar and Guru. */
export async function shellData(u: User) {
  const [courses, streak, xp, limit, live] = await Promise.all([
    activeCourseIds(u.id),
    streakOf(u.id),
    xpTotals(u.id),
    dailyGuruLimit(u.id),
    sql`select 1 from live_classes where exam_group = ${u.exam_group} and not cancelled and starts_at <= now() and starts_at + (duration_min || ' minutes')::interval > now() limit 1`,
  ]);
  const [usage] = await sql`select used from guru_usage where user_id = ${u.id} and day = (now() at time zone 'Asia/Kolkata')::date`;
  let planName = 'Free plan';
  if (courses.length) {
    const [c] = await sql`select name from courses where id = any(${courses}) order by price_paise desc limit 1`;
    planName = c?.name ?? planName;
  }
  return {
    user: { name: u.name ?? 'Student', initials: initials(u.name), group: u.exam_group, theme: u.theme, role: u.role },
    planName, paid: courses.length > 0, streak: streak.current, xp: xp.earned, liveNow: live.length > 0,
    guru: { limit, used: usage?.used ?? 0, credits: u.guru_credits },
  };
}

export function initials(name: string | null) {
  return (name ?? 'S').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'S';
}

export const inr = (n: number) => Math.round(n).toLocaleString('en-IN');
export const rupees = (paise: number) => '₹' + inr(paise / 100);
