import Link from 'next/link';
import { canAccess, requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { initials, inr } from '@/lib/server/shell';
import { classStatus, istTime } from '@/lib/server/admin';
import { Head, Status } from './ui';

export default async function Overview() {
  const u = await requireStaff('overview');
  const [k] = await sql`
    select
      (select count(*)::int from users where role = 'student') as students,
      (select count(*)::int from users where role = 'student' and created_at > now() - interval '7 days') as week,
      (select count(distinct user_id)::int from entitlements where source = 'purchase' and (ends_at is null or ends_at > now())) as paid,
      (select coalesce(sum(amount_paise), 0)::bigint from orders where status = 'paid' and paid_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as revenue,
      (select count(*)::int from attempts where started_at >= (now() at time zone 'Asia/Kolkata')::date at time zone 'Asia/Kolkata') as today,
      (select count(*)::int from attempts a join tests t on t.id = a.test_id where t.type = 'daily' and a.started_at >= (now() at time zone 'Asia/Kolkata')::date at time zone 'Asia/Kolkata') as daily,
      (select count(*)::int from question_reports where status = 'open') as reports,
      (select count(*)::int from tests where status = 'draft') as drafts,
      (select count(*)::int from questions where coalesce(solution_text, '') = '') as nosol`;
  const [full] = await sql`
    select b.name, round(100.0 * count(m.user_id) / greatest(b.capacity, 1))::int as fill
    from batches b left join batch_members m on m.batch_id = b.id group by b.id order by fill desc limit 1`;
  const classes = await sql`
    select c.*, b.name as batch from live_classes c left join batches b on b.id = c.batch_id
    where (c.starts_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date order by c.starts_at`;
  const recent = await sql`
    select u.id, u.name, u.phone, u.target_exam, u.created_at,
      (select c.name from entitlements e join courses c on c.id = e.course_id where e.user_id = u.id and (e.ends_at is null or e.ends_at > now()) order by c.price_paise desc limit 1) as plan
    from users u where role = 'student' order by created_at desc limit 5`;

  const month = new Date().toLocaleDateString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
  const rev = Number(k.revenue) / 100;
  const kpis = [
    ['Students', inr(k.students), `+${inr(k.week)} this week`, false],
    ['Paid students', inr(k.paid), k.students ? `${((100 * k.paid) / k.students).toFixed(1)}% conversion` : 'No students yet', false],
    [`Revenue · ${month}`, rev >= 100000 ? `₹${(rev / 100000).toFixed(1)}L` : `₹${inr(rev)}`, 'Month to date', true],
    ['Attempts today', inr(k.today), `Daily test: ${inr(k.daily)}`, false],
  ] as const;
  const attention = [
    canAccess(u.role, 'bank') && [String(k.reports), 'questions reported by students as wrong or unclear', 'var(--bad)', '/admin/bank?reported=1'],
    canAccess(u.role, 'tests') && [String(k.drafts), 'tests saved as draft', 'var(--pri)', '/admin/tests'],
    canAccess(u.role, 'batches') && full && full.fill >= 90 && [full.fill + '%', `${full.name} is almost full`, 'oklch(0.55 0.15 60)', '/admin/batches'],
    canAccess(u.role, 'bank') && [String(k.nosol), 'questions without a written solution', 'var(--bad)', '/admin/bank?nosol=1'],
  ].filter(Boolean) as [string, string, string, string][];
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  return (
    <>
      <Head title="Overview" sub={today}>
        {canAccess(u.role, 'bank') && <Link className="btn" href="/admin/bank?add=1">Add question</Link>}
        {canAccess(u.role, 'tests') && <Link className="btn ghost" href="/admin/tests?new=1">New test</Link>}
      </Head>
      <div className="grid" style={{ '--min': '200px' } as React.CSSProperties}>
        {kpis.map(([key, v, s, hero]) => (
          <div key={key} className={'stat' + (hero ? ' hero' : '')}><span className="k">{key}</span><span className="v" style={{ fontSize: 38 }}>{v}</span><span className="s">{s}</span></div>
        ))}
      </div>
      <div className="grid" style={{ '--min': '360px', alignItems: 'start', '--gap': '16px' } as React.CSSProperties}>
        <div className="list">
          <div className="list-row" style={{ fontSize: 15, fontWeight: 800 }}>Needs attention</div>
          {attention.map(([n, t, c, href]) => (
            <Link key={t} href={href} className="list-row">
              <span style={{ font: '800 20px/1 var(--sans)', color: c, width: 44 }}>{n}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{t}</span>
              <span style={{ fontWeight: 800, color: 'var(--pri)' }}>→</span>
            </Link>
          ))}
        </div>
        <div className="list">
          <div className="list-row" style={{ fontSize: 15, fontWeight: 800 }}>Today’s classes</div>
          {classes.length === 0 && <div className="empty" style={{ padding: 24 }}>No classes today.</div>}
          {classes.map(c => (
            <div key={c.id} className="list-row">
              <span className="mono" style={{ fontSize: 13, width: 54 }}>{istTime(c.starts_at)}</span>
              <div className="stack" style={{ flex: 1, '--gap': '0' } as React.CSSProperties}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{c.title}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.batch ?? 'Open class'} · {c.faculty_name ?? '—'}</span>
              </div>
              <Status s={classStatus(c as never)} />
            </div>
          ))}
        </div>
        <div className="list">
          <div className="list-row" style={{ fontSize: 15, fontWeight: 800 }}>Recent sign-ups</div>
          {recent.map(r => (
            <Link key={r.id} href={canAccess(u.role, 'students') ? `/admin/students?open=${r.id}` : '#'} className="list-row">
              <span className="avatar">{initials(r.name)}</span>
              <div className="stack" style={{ flex: 1, '--gap': '0' } as React.CSSProperties}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{r.name ?? 'New student'}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.target_exam ?? '—'} · {r.plan ?? 'Free'}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 700 }}>{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
