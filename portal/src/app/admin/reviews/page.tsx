import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { Head } from '../ui';
import { ReviewCard } from './reviews-client';

const TABS = [['pending', 'Pending'], ['approved', 'Live on website'], ['rejected', 'Hidden']] as const;

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff('reviews');
  const st = (await searchParams).status;
  const status = TABS.some(t => t[0] === st) ? st! : 'pending';
  const [rows, counts] = await Promise.all([
    sql`select r.id, r.kind, r.rating, r.body, r.display_name, r.exam_label, r.status, r.created_at, r.photo is not null as has_photo,
          u.name as user_name, u.phone, u.de_id,
          (select count(*)::int from attempts a where a.user_id = r.user_id and a.status = 'submitted') as tests
        from reviews r join users u on u.id = r.user_id where r.status = ${status} order by r.created_at desc limit 200`,
    sql`select status, count(*)::int as n from reviews group by status`,
  ]);
  const n = Object.fromEntries(counts.map(c => [c.status, c.n]));
  return (
    <>
      <Head title="Reviews" sub="Students write reviews in the portal. Approved ones show on deeducare.com.">
        <a className="btn ghost" href={`${process.env.WEBSITE_URL ?? "https://deeducare.com"}/#reviews`} target="_blank" rel="noopener">See on website ↗</a>
      </Head>
      <nav className="seg" aria-label="Status">
        {TABS.map(([id, l]) => <Link key={id} href={`/admin/reviews?status=${id}`} aria-current={status === id}>{l} · {n[id] ?? 0}</Link>)}
      </nav>
      <div className="note">Approve honest reviews, good or bad. Hide only spam, abuse or reviews that name other people. Ask students to review from Profile → Write a review, or share {process.env.APP_URL ?? ''}/review.</div>
      {rows.length === 0 && <div className="card empty">Nothing here.</div>}
      <div className="grid" style={{ '--min': '320px' } as React.CSSProperties}>
        {rows.map(r => (
          <ReviewCard key={r.id} r={{
            id: r.id, kind: r.kind, rating: r.rating, body: r.body, name: r.display_name, exam: r.exam_label ?? '', status: r.status, hasPhoto: r.has_photo,
            who: `${r.user_name ?? 'Student'} · ${r.de_id} · ${r.phone}`, tests: r.tests, date: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          }} />
        ))}
      </div>
    </>
  );
}
