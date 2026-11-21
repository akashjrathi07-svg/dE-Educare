import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { followedBatches } from '@/lib/server/mentor';
import { Head } from '../ui';

export const metadata = { title: 'My students' };

const UUID = /^[0-9a-f-]{36}$/i;
const day = (d: Date | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '—');
const mins = (s: number | null) => (s == null ? '—' : `${Math.round(Number(s) / 60)} min`);
const TYPES: Record<string, string> = { full_mock: 'Mock', sectional: 'Sectional', topic: 'Topic', pyq: 'Previous paper', daily: 'Daily', practice: 'Practice', custom: 'Test' };

/**
 * A mentor's classes and students (Admin → My students). Mentors see only batches they are assigned to
 * (Admin → Batches → Faculty or mentor); admins see every batch. Three views: students, one student's
 * tests, and one test ranked within the class.
 */
export default async function Mentees({ searchParams }: { searchParams: Promise<{ batch?: string; student?: string; test?: string; view?: string }> }) {
  const u = await requireStaff('mentees');
  const sp = await searchParams;
  const batches = await followedBatches(u);
  if (!batches.length) {
    return (
      <>
        <Head title="My students" sub="Your classes and how each student is doing" />
        <div className="card empty">{u.role === 'admin' ? 'No batches yet. Create one in Admin → Batches and choose its mentor.' : 'No classes are assigned to you yet. DE Educare will add your batch and students.'}</div>
      </>
    );
  }
  const batch = batches.find(b => b.id === sp.batch) ?? batches[0];
  const q = (p: Record<string, string>) => '/admin/mentees?' + new URLSearchParams({ batch: batch.id, ...p });
  const view = sp.view === 'tests' ? 'tests' : 'students';

  const [[sum], students, tests] = await Promise.all([
    sql`
      select count(distinct m.user_id)::int as students,
        count(distinct a.user_id) filter (where a.submitted_at > now() - interval '7 days')::int as active,
        count(a.id) filter (where a.submitted_at > now() - interval '7 days')::int as week,
        round(avg(100.0 * a.score / nullif(a.max_score, 0)) filter (where t.type in ('full_mock', 'sectional', 'pyq')))::int as avg
      from batch_members m left join attempts a on a.user_id = m.user_id and a.status = 'submitted' left join tests t on t.id = a.test_id
      where m.batch_id = ${batch.id}`,
    sql`
      select u.id, u.name, u.phone, u.last_active_at,
        count(a.id) filter (where t.type in ('full_mock', 'sectional', 'pyq', 'topic'))::int as tests,
        count(a.id) filter (where t.type in ('daily', 'practice'))::int as practice,
        round(avg(100.0 * a.score / nullif(a.max_score, 0)) filter (where t.type in ('full_mock', 'sectional', 'pyq')))::int as avg,
        round(avg(a.percentile) filter (where t.type = 'full_mock'), 1)::float as pctl,
        max(a.submitted_at) as last
      from batch_members m join users u on u.id = m.user_id
        left join attempts a on a.user_id = u.id and a.status = 'submitted' left join tests t on t.id = a.test_id
      where m.batch_id = ${batch.id}
      group by u.id order by tests desc, u.name nulls last`,
    sql`
      select t.id, t.name, t.type, count(a.id)::int as n, max(a.submitted_at) as last
      from attempts a join tests t on t.id = a.test_id join batch_members m on m.user_id = a.user_id
      where m.batch_id = ${batch.id} and a.status = 'submitted' and t.type in ('full_mock', 'sectional', 'pyq', 'topic')
      group by t.id order by last desc limit 100`,
  ]);

  const student = sp.student && UUID.test(sp.student) ? students.find(s => s.id === sp.student) : null;
  const studentTests = student ? await sql`
    select a.id, t.name, t.type, a.score::float as score, a.max_score::float as max, a.accuracy, a.percentile::float as pctl, a.time_sec, a.submitted_at
    from attempts a join tests t on t.id = a.test_id where a.user_id = ${student.id} and a.status = 'submitted' order by a.submitted_at desc limit 100` : [];
  const test = sp.test && UUID.test(sp.test) ? tests.find(t => t.id === sp.test) ?? null : null;
  const ranking = test ? await sql`
    select distinct on (a.user_id) a.id, u.name, u.phone, a.score::float as score, a.max_score::float as max, a.accuracy, a.percentile::float as pctl, a.time_sec, a.submitted_at
    from attempts a join users u on u.id = a.user_id join batch_members m on m.user_id = a.user_id
    where m.batch_id = ${batch.id} and a.test_id = ${test.id} and a.status = 'submitted'
    order by a.user_id, a.submitted_at` : [];
  ranking.sort((x, y) => Number(y.score) - Number(x.score));

  return (
    <>
      <Head title="My students" sub={u.role === 'admin' ? 'Every class and its mentor. Mentors see only their own classes.' : 'Your classes and how each student is doing. Results open the full analysis.'} />
      {batches.length > 1 && (
        <div className="chips">
          {batches.map(b => <Link key={b.id} href={'/admin/mentees?batch=' + b.id} className="chip" aria-pressed={b.id === batch.id}>{b.name} · {b.members}</Link>)}
        </div>
      )}
      <div className="grid" style={{ '--min': '170px', '--gap': '10px' } as React.CSSProperties}>
        {([['Students', sum.students], ['Took a test this week', sum.active], ['Tests this week', sum.week], ['Class average (mocks)', sum.avg == null ? '—' : sum.avg + '%']] as const).map(([k, v]) => (
          <div key={k} className="stat"><span className="k">{k}</span><span className="v" style={{ fontSize: 30 }}>{v}</span></div>
        ))}
      </div>
      <p className="note" style={{ margin: 0 }}>{batch.name}{batch.exam ? ` · ${batch.exam}` : ''}{u.role === 'admin' ? ` · mentor: ${batch.mentor ?? 'not assigned'}` : ''}</p>

      <nav className="seg" aria-label="View">
        <Link href={q({})} aria-current={view === 'students'}>Students</Link>
        <Link href={q({ view: 'tests' })} aria-current={view === 'tests'}>Test-wise</Link>
      </nav>

      {view === 'students' && (
        <div className="tbl-wrap">
          <div className="tbl" style={{ '--minw': '780px', '--cols': 'minmax(0,1.5fr) 80px 90px 90px 100px 100px 110px' } as React.CSSProperties}>
            <div className="tr th"><span>Student</span><span>Tests</span><span>Practice</span><span>Avg score</span><span>Avg %ile</span><span>Last test</span><span /></div>
            {students.length === 0 && <div className="empty">No students in this class yet.</div>}
            {students.map(s => (
              <div key={s.id} className="tr" style={s.id === student?.id ? { background: 'var(--priSoft)' } : undefined}>
                <span className="stack" style={{ '--gap': '0' } as React.CSSProperties}><span className="t">{s.name ?? 'New student'}</span><a className="s mono" href={`tel:${s.phone}`}>{s.phone}</a></span>
                <span className="mono">{s.tests}</span><span className="mono">{s.practice}</span>
                <span className="mono">{s.avg == null ? '—' : s.avg + '%'}</span><span className="mono">{s.pctl == null ? '—' : s.pctl}</span>
                <span className="s">{day(s.last)}</span>
                <Link className="btn chip sm" href={q({ student: s.id })}>See tests</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'students' && student && (
        <div className="card pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 16 }}>{student.name ?? 'Student'} · tests</b><Link href={q({})} className="link">Close</Link></div>
          {studentTests.length === 0 && <span className="muted">No tests taken yet.</span>}
          {studentTests.map(a => (
            <div key={a.id} className="row" style={{ justifyContent: 'space-between', fontSize: 13, borderTop: '1px solid var(--line2)', paddingTop: 8 }}>
              <span className="stack" style={{ '--gap': '1px' } as React.CSSProperties}><b>{a.name}</b><span className="muted">{TYPES[a.type] ?? a.type} · {day(a.submitted_at)} · {mins(a.time_sec)}</span></span>
              <span className="row" style={{ gap: 12 }}>
                <span className="mono">{a.score} / {a.max}</span>
                <span className="mono muted">{a.accuracy ?? '—'}% acc{a.pctl != null && a.type === 'full_mock' ? ` · ${a.pctl} %ile` : ''}</span>
                <Link className="btn sm" href={`/results/${a.id}`}>Result</Link>
              </span>
            </div>
          ))}
        </div>
      )}

      {view === 'tests' && (
        <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="chips">
            {tests.length === 0 && <span className="muted">No mocks or sectionals taken by this class yet.</span>}
            {tests.map(t => <Link key={t.id} href={q({ view: 'tests', test: t.id })} className="chip" aria-pressed={t.id === test?.id}>{t.name} · {t.n}</Link>)}
          </div>
          {test && (
            <div className="tbl-wrap">
              <div className="tbl" style={{ '--minw': '720px', '--cols': '44px minmax(0,1.5fr) 100px 90px 90px 90px 80px' } as React.CSSProperties}>
                <div className="tr th"><span>#</span><span>Student</span><span>Score</span><span>Accuracy</span><span>%ile</span><span>Time</span><span /></div>
                {ranking.map((a, i) => (
                  <div key={a.id} className="tr">
                    <span className="mono">{i + 1}</span><span className="t">{a.name ?? a.phone}</span>
                    <span className="mono">{a.score} / {a.max}</span><span className="mono">{a.accuracy ?? '—'}%</span>
                    <span className="mono">{a.pctl ?? '—'}</span><span className="mono">{mins(a.time_sec)}</span>
                    <Link className="btn chip sm" href={`/results/${a.id}`}>Result</Link>
                  </div>
                ))}
              </div>
            </div>
          )}
          {test && <p className="note" style={{ margin: 0 }}>First attempt of each student, ranked by score within this class.</p>}
        </div>
      )}
    </>
  );
}
