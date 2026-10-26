import 'server-only';
import { cache } from 'react';
import { sql } from './db';
import type { User } from './auth';

export const GROUPS = [
  { id: 'mba', name: 'MBA' }, { id: 'upsc', name: 'UPSC' }, { id: 'bank', name: 'Bank PO' }, { id: 'ug', name: 'Undergrad' },
] as const;

/** Data every student page needs for the sidebar and Guru. */
export const shellData = cache(async function shellData(u: User) {
  // One query, one round trip: the sidebar is on every page, so this keeps page loads to as few connections as possible.
  const [r] = await sql`
    with active as (
      select c.name, c.price_paise, c.guru_quota from entitlements e join courses c on c.id = e.course_id
      where e.user_id = ${u.id} and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now()))
    select
      (select count(*)::int from active) as courses,
      (select name from active order by price_paise desc limit 1) as plan,
      coalesce((select array_agg(distinct guru_quota) from active), '{}') as quotas,
      (select current from streaks where user_id = ${u.id} and last_day > current_date - 2) as streak,
      (select coalesce(sum(xp) filter (where xp > 0), 0)::int from xp_events where user_id = ${u.id}) as xp,
      exists (select 1 from live_classes where exam_group = ${u.exam_group} and not cancelled and starts_at <= now()
              and starts_at + (duration_min || ' minutes')::interval > now()) as live,
      (select used from guru_usage where user_id = ${u.id} and day = (now() at time zone 'Asia/Kolkata')::date) as used`;
  const quotas = (r.quotas ?? []) as string[];
  // Same rule as dailyGuruLimit(): unlimited beats 50 a day, which beats the free 10.
  const limit = quotas.includes('unlimited') ? null : quotas.includes('50/day') ? 50 : 10;
  return {
    user: { name: u.name ?? 'Student', initials: initials(u.name), group: u.exam_group, theme: u.theme, role: u.role },
    planName: (r.plan as string | null) ?? 'Free plan', paid: r.courses > 0, streak: (r.streak as number | null) ?? 0, xp: r.xp as number, liveNow: r.live as boolean,
    guru: { limit, used: (r.used as number | null) ?? 0, credits: u.guru_credits },
  };
});

export function initials(name: string | null) {
  return (name ?? 'S').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'S';
}

export const inr = (n: number) => Math.round(n).toLocaleString('en-IN');
export const rupees = (paise: number) => '₹' + inr(paise / 100);
