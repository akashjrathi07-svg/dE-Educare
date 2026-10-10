import 'server-only';
import { cache } from 'react';
import { sql } from './db';
import type { User } from './auth';
import { activeCourseIds, dailyGuruLimit } from './access';
import { streakOf, xpTotals } from './xp';

export const GROUPS = [
  { id: 'mba', name: 'MBA' }, { id: 'upsc', name: 'UPSC' }, { id: 'bank', name: 'Bank PO' }, { id: 'ug', name: 'Undergrad' },
] as const;

/** Data every student page needs for the sidebar and Guru. */
export const shellData = cache(async function shellData(u: User) {
  // One round of parallel queries: the database is a network hop away, so latency adds up per sequential query.
  const [courses, streak, xp, limit, live, usage, plan] = await Promise.all([
    activeCourseIds(u.id),
    streakOf(u.id),
    xpTotals(u.id),
    dailyGuruLimit(u.id),
    sql`select 1 from live_classes where exam_group = ${u.exam_group} and not cancelled and starts_at <= now() and starts_at + (duration_min || ' minutes')::interval > now() limit 1`,
    sql`select used from guru_usage where user_id = ${u.id} and day = (now() at time zone 'Asia/Kolkata')::date`,
    sql`select c.name from entitlements e join courses c on c.id = e.course_id
        where e.user_id = ${u.id} and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now()) order by c.price_paise desc limit 1`,
  ]);
  return {
    user: { name: u.name ?? 'Student', initials: initials(u.name), group: u.exam_group, theme: u.theme, role: u.role },
    planName: (plan[0]?.name as string | undefined) ?? 'Free plan', paid: courses.length > 0, streak: streak.current, xp: xp.earned, liveNow: live.length > 0,
    guru: { limit, used: usage[0]?.used ?? 0, credits: u.guru_credits },
  };
});

export function initials(name: string | null) {
  return (name ?? 'S').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'S';
}

export const inr = (n: number) => Math.round(n).toLocaleString('en-IN');
export const rupees = (paise: number) => '₹' + inr(paise / 100);
