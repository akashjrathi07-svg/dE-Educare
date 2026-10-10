import 'server-only';
import type { Sql, TransactionSql } from 'postgres';
import { sql } from './db';
import { dailyGuruLimit } from './access';

const TODAY = sql`(now() at time zone 'Asia/Kolkata')::date`;

export type Wallet = { limit: number | null; usedToday: number; dailyLeft: number | null; bonus: number };
export type Spent = { daily: number; bonus: number; unlimited: boolean };

/** Today's coins: plan allowance, how many are used, and the bonus balance. */
export async function wallet(userId: string): Promise<Wallet> {
  const [limit, [usage], [u]] = await Promise.all([
    dailyGuruLimit(userId),
    sql`select used from guru_usage where user_id = ${userId} and day = ${TODAY}`,
    sql`select guru_credits from users where id = ${userId}`,
  ]);
  const used = usage?.used ?? 0;
  return { limit, usedToday: used, dailyLeft: limit == null ? null : Math.max(0, limit - used), bonus: u?.guru_credits ?? 0 };
}

/**
 * Spends coins for a Guru action: today's coins first, then bonus coins.
 * Charges nothing if the student can't cover the full cost.
 */
export async function spendCoins(userId: string, cost: number, kind: string, ref: string | null = null):
  Promise<{ ok: true; spent: Spent; wallet: Wallet } | { ok: false; message: string; wallet: Wallet }> {
  const limit = await dailyGuruLimit(userId);
  return sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(hashtext(${'coins:' + userId}))`;
    if (limit === null) {
      await tx`insert into coin_events (user_id, kind, coins, pool, ref) values (${userId}, ${kind}, ${-cost}, 'unlimited', ${ref})`;
      const [u] = await tx`select guru_credits from users where id = ${userId}`;
      return { ok: true as const, spent: { daily: 0, bonus: 0, unlimited: true }, wallet: { limit, usedToday: 0, dailyLeft: null, bonus: u.guru_credits } };
    }
    const [usage] = await tx`
      insert into guru_usage (user_id, day, used) values (${userId}, ${TODAY}, 0)
      on conflict (user_id, day) do update set used = guru_usage.used returning used`;
    const [u] = await tx`select guru_credits from users where id = ${userId}`;
    const dailyLeft = Math.max(0, limit - usage.used);
    const fromDaily = Math.min(cost, dailyLeft);
    const fromBonus = cost - fromDaily;
    if (fromBonus > u.guru_credits) {
      const w = { limit, usedToday: usage.used, dailyLeft, bonus: u.guru_credits };
      const have = dailyLeft + u.guru_credits;
      return {
        ok: false as const, wallet: w,
        message: have === 0
          ? `You've used today's ${limit} Guru coins. They refill at midnight. Earn bonus coins from XP in Profile → Rewards, or upgrade for more.`
          : `This needs ${cost} coins and you have ${have}. Your daily coins refill at midnight, or turn XP into bonus coins in Profile → Rewards.`,
      };
    }
    if (fromDaily) {
      await tx`update guru_usage set used = used + ${fromDaily} where user_id = ${userId} and day = ${TODAY}`;
      await tx`insert into coin_events (user_id, kind, coins, pool, ref) values (${userId}, ${kind}, ${-fromDaily}, 'daily', ${ref})`;
    }
    if (fromBonus) {
      await tx`update users set guru_credits = guru_credits - ${fromBonus} where id = ${userId}`;
      await tx`insert into coin_events (user_id, kind, coins, pool, ref) values (${userId}, ${kind}, ${-fromBonus}, 'bonus', ${ref})`;
    }
    return {
      ok: true as const, spent: { daily: fromDaily, bonus: fromBonus, unlimited: false },
      wallet: { limit, usedToday: usage.used + fromDaily, dailyLeft: dailyLeft - fromDaily, bonus: u.guru_credits - fromBonus },
    };
  });
}

/** Gives the coins back when Guru could not answer (no AI reply was produced). */
export async function refundCoins(userId: string, spent: Spent, kind: string) {
  if (spent.unlimited || (!spent.daily && !spent.bonus)) return;
  await sql.begin(async tx => {
    if (spent.daily) await tx`update guru_usage set used = greatest(0, used - ${spent.daily}) where user_id = ${userId} and day = ${TODAY}`;
    if (spent.bonus) await tx`update users set guru_credits = guru_credits + ${spent.bonus} where id = ${userId}`;
    await tx`insert into coin_events (user_id, kind, coins, pool, ref) values (${userId}, ${kind}, ${spent.daily + spent.bonus}, ${spent.bonus ? 'bonus' : 'daily'}, null)`;
  });
}

/** Adds bonus coins once per (kind, ref). Returns false if this grant was already made. */
export async function grantBonus(userId: string, coins: number, kind: string, ref: string, tx: Sql | TransactionSql = sql): Promise<boolean> {
  const rows = await tx`
    insert into coin_events (user_id, kind, coins, pool, ref) values (${userId}, ${kind}, ${coins}, 'bonus', ${ref})
    on conflict do nothing returning id`;
  if (!rows.length) return false;
  await tx`update users set guru_credits = guru_credits + ${coins} where id = ${userId}`;
  return true;
}

export async function coinHistory(userId: string, limit = 12) {
  return sql`select kind, coins, pool, created_at from coin_events where user_id = ${userId} order by created_at desc limit ${limit}`;
}
