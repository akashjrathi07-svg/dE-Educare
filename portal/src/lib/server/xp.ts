import 'server-only';
import { sql } from './db';

/** Adds XP once per (kind, ref). Every 1,000 XP earned also grants a free-mock credit. */
export async function awardXp(userId: string, kind: string, xp: number, ref: string | null = null) {
  const inserted = await sql`
    insert into xp_events (user_id, kind, xp, ref) values (${userId}, ${kind}, ${xp}, ${ref})
    on conflict do nothing returning id`;
  if (!inserted.length || xp <= 0) return;
  const [{ earned }] = await sql`select coalesce(sum(xp), 0)::int as earned from xp_events where user_id = ${userId} and xp > 0`;
  const milestones = Math.floor(earned / 1000);
  for (let m = 1; m <= milestones; m++) {
    await sql`insert into test_credits (user_id, kind, source) values (${userId}, 'mock', ${'xp-' + m * 1000}) on conflict do nothing`;
  }
}

/** Removes XP for something undone (e.g. unticking a planner task). */
export async function revokeXp(userId: string, kind: string, ref: string) {
  await sql`delete from xp_events where user_id = ${userId} and kind = ${kind} and ref = ${ref}`;
}

export async function xpTotals(userId: string) {
  const [r] = await sql`
    select coalesce(sum(xp) filter (where xp > 0), 0)::int as earned,
           coalesce(sum(xp), 0)::int as balance
    from xp_events where user_id = ${userId}`;
  return { earned: r.earned as number, balance: r.balance as number };
}

/** Daily free test keeps the streak: consecutive days count up, a missed day resets to 1. */
export async function bumpStreak(userId: string) {
  await sql`
    insert into streaks (user_id, current, best, last_day) values (${userId}, 1, 1, current_date)
    on conflict (user_id) do update set
      current = case when streaks.last_day = current_date then streaks.current
                     when streaks.last_day = current_date - 1 then streaks.current + 1 else 1 end,
      best = greatest(streaks.best, case when streaks.last_day = current_date then streaks.current
                     when streaks.last_day = current_date - 1 then streaks.current + 1 else 1 end),
      last_day = current_date`;
}

export async function streakOf(userId: string) {
  const [s] = await sql`select current, best, last_day from streaks where user_id = ${userId}`;
  if (!s) return { current: 0, best: 0 };
  const alive = s.last_day && (Date.now() - new Date(s.last_day).getTime()) / 86400000 < 2;
  return { current: alive ? s.current : 0, best: s.best };
}

export type Board = 'week' | 'month' | 'all';
export async function leaderboard(board: Board, group: string, limit = 5) {
  const since = board === 'week' ? sql`and x.created_at > now() - interval '7 days'` : board === 'month' ? sql`and x.created_at > now() - interval '30 days'` : sql``;
  return sql`
    select u.id, coalesce(u.name, 'Student') as name, sum(x.xp)::int as xp,
           rank() over (order by sum(x.xp) desc)::int as rank
    from xp_events x join users u on u.id = x.user_id
    where x.xp > 0 and u.role = 'student' and u.exam_group = ${group} ${since}
    group by u.id order by xp desc limit ${limit}`;
}

export async function myRank(userId: string, board: Board, group: string) {
  const since = board === 'week' ? sql`and x.created_at > now() - interval '7 days'` : board === 'month' ? sql`and x.created_at > now() - interval '30 days'` : sql``;
  const [r] = await sql`
    with t as (
      select u.id, sum(x.xp)::int as xp from xp_events x join users u on u.id = x.user_id
      where x.xp > 0 and u.role = 'student' and u.exam_group = ${group} ${since} group by u.id
    )
    select (select count(*) from t where t.xp > coalesce((select xp from t where id = ${userId}), 0))::int + 1 as rank,
           coalesce((select xp from t where id = ${userId}), 0) as xp`;
  return { rank: r.rank as number, xp: Number(r.xp) };
}
