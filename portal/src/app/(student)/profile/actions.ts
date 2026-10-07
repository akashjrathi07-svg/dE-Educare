'use server';
import { revalidatePath } from 'next/cache';
import crypto from 'node:crypto';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

/** Spends XP in the rewards store. Grants a test credit, a personal coupon or Guru credits. */
export async function redeem(rewardId: string) {
  const u = await currentUser();
  if (!u) return { ok: false, message: 'Please sign in again.' };
  return sql.begin(async tx => {
    const [r] = await tx`select * from reward_items where id = ${rewardId} and active`;
    if (!r) return { ok: false, message: 'This reward is no longer available.' };
    await tx`select pg_advisory_xact_lock(hashtext(${u.id}))`;
    const [{ bal }] = await tx`select coalesce(sum(xp), 0)::int as bal from xp_events where user_id = ${u.id}`;
    if (bal < r.cost_xp) return { ok: false, message: `You need ${(r.cost_xp - bal).toLocaleString('en-IN')} more XP.` };
    const g = r.grants as Record<string, unknown>;
    let couponId: string | null = null, message = r.name + ' added to your account';
    if (g.test_credit) {
      await tx`insert into test_credits (user_id, kind, source) values (${u.id}, ${g.test_credit as string}, ${'reward-' + crypto.randomUUID()})`;
      message = `${r.name}: open any locked ${g.test_credit === 'mock' ? 'mock' : 'sectional'} and choose “Use a free credit”.`;
    } else if (g.coupon_flat || g.coupon_percent) {
      const code = 'XP' + crypto.randomBytes(3).toString('hex').toUpperCase();
      const [c] = await tx`insert into coupons (code, kind, value, max_uses, user_id, valid_till) values (${code}, ${g.coupon_flat ? 'flat' : 'percent'}, ${(g.coupon_flat ?? g.coupon_percent) as number}, 1, ${u.id}, current_date + 90) returning id`;
      couponId = c.id;
      message = `Your coupon ${code} is ready. Use it at checkout within 90 days.`;
    } else if (g.guru_credits) {
      await tx`update users set guru_credits = guru_credits + ${g.guru_credits as number} where id = ${u.id}`;
    }
    await tx`insert into redemptions (user_id, reward_id, coupon_id) values (${u.id}, ${r.id}, ${couponId})`;
    await tx`insert into xp_events (user_id, kind, xp) values (${u.id}, 'redeem', ${-r.cost_xp})`;
    revalidatePath('/profile');
    return { ok: true, message };
  });
}

export async function updateProfile(form: FormData) {
  const u = await currentUser();
  if (!u) return;
  const name = String(form.get('name') ?? '').trim().slice(0, 80) || u.name;
  const email = String(form.get('email') ?? '').trim().slice(0, 120);
  const exam = String(form.get('exam') ?? u.target_exam);
  const [e] = await sql`select exam_group from exams where code = ${exam}`;
  await sql`update users set name = ${name}, email = ${/^\S+@\S+\.\S+$/.test(email) ? email : null}, city = ${String(form.get('city') ?? '').trim().slice(0, 60) || null},
            target_exam = ${e ? exam : u.target_exam}, exam_group = ${e?.exam_group ?? u.exam_group}, target_percentile = ${Number(form.get('target')) || u.target_percentile} where id = ${u.id}`;
  revalidatePath('/', 'layout');
}
