import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { CouponsClient } from './coupons-client';

export default async function Coupons({ searchParams }: { searchParams: Promise<{ rewards?: string }> }) {
  await requireStaff('coupons');
  const sp = await searchParams;
  const [rows, courses] = await Promise.all([
    sql`select c.*, u.name as owner,
          (select count(*)::int from orders o where o.coupon_id = c.id and o.status = 'paid') as paid,
          (select coalesce(sum(o.discount_paise), 0)::int from orders o where o.coupon_id = c.id and o.status = 'paid') as given
        from coupons c left join users u on u.id = c.user_id
        where ${sp.rewards ? sql`c.user_id is not null` : sql`c.user_id is null`}
        order by c.active desc, c.valid_till desc nulls first, c.code limit 300`,
    sql`select id, name, category from courses order by sort`,
  ]);
  return (
    <CouponsClient rewards={!!sp.rewards} courses={courses.map(c => ({ id: c.id, name: c.name, category: c.category }))}
      switchLink={<Link className="btn ghost" href={sp.rewards ? '/admin/coupons' : '/admin/coupons?rewards=1'}>{sp.rewards ? 'Coupon codes' : 'Reward coupons (students)'}</Link>}
      rows={rows.map(r => ({
        id: r.id, code: r.code, kind: r.kind, value: r.kind === 'flat' ? Number(r.value) / 100 : Number(r.value), cap: r.max_discount_paise ? r.max_discount_paise / 100 : 0,
        maxUses: r.max_uses ?? 0, used: r.used, validTill: r.valid_till ? new Date(r.valid_till).toISOString().slice(0, 10) : '', active: r.active,
        scope: r.course_ids?.length ? 'courses' : r.category ?? '', courseIds: r.course_ids ?? [], owner: r.owner ?? null, paid: r.paid, given: r.given / 100,
      }))} />
  );
}
