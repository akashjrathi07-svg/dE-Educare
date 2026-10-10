import crypto from 'node:crypto';
import { sql } from '@/lib/server/db';
import { grantBonus } from '@/lib/server/coins';
import { MONTHLY_PRIZES } from '@/lib/economy';

/**
 * Pays last month's leaderboard prizes (bonus coins and coupons) in each exam group.
 * Runs on the 1st of every month from vercel.json; safe to run again (each student is paid once per month).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });

  // Previous calendar month in India time.
  const [{ start, finish }] = await sql`
    select (date_trunc('month', now() at time zone 'Asia/Kolkata') - interval '1 month')::date as start,
           date_trunc('month', now() at time zone 'Asia/Kolkata')::date as finish`;
  const top = MONTHLY_PRIZES[MONTHLY_PRIZES.length - 1].to;
  const rows = await sql`
    with m as (
      select u.id, u.exam_group, sum(x.xp)::int as xp, max(x.created_at) as last_at
      from xp_events x join users u on u.id = x.user_id
      where x.xp > 0 and u.role = 'student'
        and (x.created_at at time zone 'Asia/Kolkata') >= ${start} and (x.created_at at time zone 'Asia/Kolkata') < ${finish}
      group by u.id, u.exam_group
    )
    select * from (select *, row_number() over (partition by exam_group order by xp desc, last_at asc)::int as rank from m) r where rank <= ${top}`;

  let paid = 0;
  for (const r of rows) {
    const prize = MONTHLY_PRIZES.find(p => r.rank >= p.from && r.rank <= p.to);
    if (!prize) continue;
    await sql.begin(async tx => {
      const ins = await tx`insert into monthly_prizes (month, exam_group, user_id, rank, xp, coins) values (${start}, ${r.exam_group}, ${r.id}, ${r.rank}, ${r.xp}, ${prize.coins}) on conflict do nothing returning user_id`;
      if (!ins.length) return;
      await grantBonus(r.id, prize.coins, 'prize', `prize-${String(start instanceof Date ? start.toISOString() : start).slice(0, 7)}`, tx);
      if (prize.coupon) {
        const code = 'TOP' + crypto.randomBytes(3).toString('hex').toUpperCase();
        const [c] = await tx`insert into coupons (code, kind, value, max_uses, user_id, valid_till, max_discount_paise, category)
          values (${code}, 'percent', ${prize.coupon.percent}, 1, ${r.id}, current_date + 90, ${prize.coupon.capPaise}, ${prize.coupon.category}) returning id`;
        await tx`update monthly_prizes set coupon_id = ${c.id} where month = ${start} and user_id = ${r.id}`;
      }
      paid++;
    });
  }
  return Response.json({ month: start, winners: rows.length, paid });
}
