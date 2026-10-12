'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

export type CouponInput = {
  id: string | null; code: string; kind: 'percent' | 'flat';
  /** Percent (1–100) or rupees off. */
  value: number;
  /** Most it can take off, in rupees (percent coupons). 0 = no cap. */
  cap: number;
  /** 0 = unlimited. */
  maxUses: number; validTill: string;
  /** '' = any plan, 'test_series' or 'coaching' = that kind of plan, 'courses' = the plans in courseIds. */
  scope: '' | 'test_series' | 'coaching' | 'courses'; courseIds: string[]; active: boolean;
};

export async function saveCoupon(c: CouponInput) {
  await staffOrThrow('coupons');
  const code = String(c.code ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return { ok: false, message: 'Code: 3–24 letters or numbers, e.g. CAT500 or DIWALI10' };
  if (!['percent', 'flat'].includes(c.kind)) return { ok: false, message: 'Pick % off or ₹ off' };
  const value = Number(c.value);
  if (c.kind === 'percent' && !(value > 0 && value <= 100)) return { ok: false, message: 'Percent off must be between 1 and 100' };
  if (c.kind === 'flat' && !(value > 0 && value <= 1_000_000)) return { ok: false, message: 'Enter the rupees off' };
  if (c.validTill && !/^\d{4}-\d\d-\d\d$/.test(c.validTill)) return { ok: false, message: 'Pick a valid end date' };
  const scope = ['', 'test_series', 'coaching', 'courses'].includes(c.scope) ? c.scope : '';
  const courseIds = scope === 'courses' ? (c.courseIds ?? []).filter(x => /^[0-9a-f-]{36}$/i.test(x)) : [];
  if (scope === 'courses' && !courseIds.length) return { ok: false, message: 'Tick at least one plan, or let it apply to every plan' };
  const v = {
    code, kind: c.kind, value: c.kind === 'flat' ? Math.round(value * 100) : value,
    max_discount_paise: c.kind === 'percent' && Number(c.cap) > 0 ? Math.round(Number(c.cap) * 100) : null,
    max_uses: Number(c.maxUses) > 0 ? Math.round(Number(c.maxUses)) : null, valid_till: c.validTill || null,
    category: scope === 'test_series' || scope === 'coaching' ? scope : null, course_ids: courseIds.length ? courseIds : null, active: c.active !== false,
  };
  const [clash] = await sql`select id from coupons where upper(code) = ${code} and id is distinct from ${c.id}::uuid`;
  if (clash) return { ok: false, message: `${code} is already used by another coupon` };
  if (c.id) await sql`update coupons set ${sql(v as never)} where id = ${c.id} and user_id is null`;
  else await sql`insert into coupons ${sql(v as never)}`;
  revalidatePath('/admin/coupons');
  return { ok: true, message: `${code} saved · ${v.active ? 'students can use it at checkout now' : 'paused'}` };
}

export async function setCouponActive(id: string, active: boolean) {
  await staffOrThrow('coupons');
  const [c] = await sql`update coupons set active = ${active} where id = ${id} returning code`;
  revalidatePath('/admin/coupons');
  return c ? { ok: true, message: `${c.code} ${active ? 'is active again' : 'is paused'}` } : { ok: false, message: 'Coupon not found' };
}
