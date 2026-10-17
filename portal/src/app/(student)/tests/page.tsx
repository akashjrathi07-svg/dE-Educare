import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { testAccessMap, availableCredits } from '@/lib/server/access';
import { rupees } from '@/lib/server/shell';

export const metadata = { title: 'Tests' };

const markOf = (name: string) => name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

const TYPE_ORDER = ['full_mock', 'pyq', 'sectional', 'topic', 'daily', 'custom'];
const TYPE_HEAD: Record<string, string> = { full_mock: 'Full mocks', pyq: 'Previous year papers', sectional: 'Sectional tests', topic: 'Topic tests', daily: 'Daily tests', custom: 'Other tests' };
const liveTest = () => sql`t.status = 'live' and (t.live_from is null or t.live_from <= now())`;

export default async function Tests({ searchParams }: { searchParams: Promise<{ node?: string; course?: string }> }) {
  const u = await requireUser('/tests');
  const { node: nodeParam, course: courseParam } = await searchParams;
  if (courseParam) return <CourseTests userId={u.id} slug={courseParam} />;
  const id = nodeParam || u.exam_group;
  const [[node], path, children, tests, mine] = await Promise.all([
    sql`select n.*, e.status as exam_status from catalog_nodes n left join exams e on e.id = n.exam_id where n.id = ${id}`,
    sql`
      with recursive up as (select id, parent_id, name, 0 as d from catalog_nodes where id = ${id}
        union all select c.id, c.parent_id, c.name, up.d + 1 from catalog_nodes c join up on c.id = up.parent_id)
      select id, name from up order by d desc`,
    sql`
      select n.id, n.name, n.sub, n.is_free,
        (select count(*) from catalog_nodes c where c.parent_id = n.id)::int as kids,
        (select count(*) from tests t where ${liveTest()} and (t.node_id = n.id or (n.course_id is not null
          and exists (select 1 from course_tests ct where ct.course_id = n.course_id and ct.test_id = t.id) and (n.test_types is null or t.type = any(n.test_types)))))::int as tests
      from catalog_nodes n where n.parent_id = ${id} order by n.sort`,
    sql`
      select t.id, t.slug, t.name, t.type, t.duration_min, t.is_free,
        (select count(*) from test_questions q where q.test_id = t.id)::int as q
      from tests t, catalog_nodes n
      where n.id = ${id} and ${liveTest()} and (t.node_id = n.id or (n.course_id is not null
        and exists (select 1 from course_tests ct where ct.course_id = n.course_id and ct.test_id = t.id) and (n.test_types is null or t.type = any(n.test_types))))
      order by array_position(${TYPE_ORDER}::text[], t.type), t.sort, t.created_at limit 300`,
    // The student's own courses, shown on the first Tests screen.
    nodeParam ? Promise.resolve([]) : sql`
      select distinct on (c.id) c.slug, c.name, c.sort,
        (select count(*)::int from course_tests ct join tests t on t.id = ct.test_id where ct.course_id = c.id and ${liveTest()}) as tests
      from entitlements e join courses c on c.id = e.course_id
      where e.user_id = ${u.id} and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now()) and c.price_paise > 0
      order by c.id`,
  ]);
  if (!node) return <div className="empty">That section was not found. <Link href="/tests">Back to tests</Link></div>;

  const soon = node.exam_status === 'soon';

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        {path.map((p, i) => (
          <span key={p.id} className="row" style={{ gap: 6 }}>
            {i < path.length - 1 ? <Link href={`/tests?node=${p.id}`}>{p.name}</Link> : <span aria-current="page">{p.name}</span>}
            {i < path.length - 1 && <span className="sep">/</span>}
          </span>
        ))}
      </nav>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <h1 className="h1">{node.name}</h1>
          <div className="sub">{node.sub}</div>
        </div>
        <Link href="/practice" className="btn soft">Build a practice set</Link>
      </div>

      {soon && !children.length && !tests.length && (
        <div className="card pad stack">
          <b>{node.name} test series is launching soon.</b>
          <span className="muted" style={{ fontSize: 14 }}>We’ll notify you when it goes live. Meanwhile, the free daily test and CAT tests are open.</span>
        </div>
      )}

      {mine.length > 0 && (
        <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <span className="eyebrow">My courses</span>
          <div className="grid fill">
            {[...mine].sort((a, b) => a.sort - b.sort).map(c => (
              <Link key={c.slug} href={`/tests?course=${c.slug}`} className="node-card">
                <span className="node-mark">{markOf(c.name)}</span>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 'auto' }}>{c.name}</div>
                <div className="mono faint" style={{ fontSize: 11 }}>{c.tests} test{c.tests === 1 ? '' : 's'}</div>
              </Link>
            ))}
          </div>
          <span className="eyebrow" style={{ marginTop: 8 }}>All tests</span>
        </div>
      )}

      {children.length > 0 && (
        <div className="grid fill">
          {children.map(c => (
            <Link key={c.id} href={`/tests?node=${c.id}`} className="node-card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className={'node-mark' + (c.is_free ? ' free' : '')}>{markOf(c.name)}</span>
                {c.is_free && <span className="tag ok">FREE</span>}
              </div>
              <div className="stack" style={{ '--gap': '3px', marginTop: 'auto' } as React.CSSProperties}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{c.name}</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>{c.sub}</div>
              </div>
              <div className="mono faint" style={{ fontSize: 11 }}>{c.kids ? `${c.kids} sections` : c.tests ? `${c.tests} tests` : 'Tests'}</div>
            </Link>
          ))}
        </div>
      )}

      <TestTable userId={u.id} tests={tests as unknown as TestRow[]} />
    </>
  );
}

type TestRow = { id: string; slug: string; name: string; type: string; duration_min: number; is_free: boolean; q: number };

/** The list of tests with each one's status for this student: start, resume, analysis or unlock. Grouped by type when it mixes types. */
async function TestTable({ userId, tests }: { userId: string; tests: readonly TestRow[] | TestRow[] }) {
  if (!tests.length) return null;
  const ids = tests.map(t => t.id);
  const [{ open, plans }, attempts, credits] = await Promise.all([
    testAccessMap(userId, ids),
    sql`
      select distinct on (test_id) test_id, id, status, score::float, max_score::float, percentile::float
      from attempts where user_id = ${userId} and test_id = any(${ids})
      order by test_id, (status = 'in_progress') desc, submitted_at desc`,
    availableCredits(userId),
  ]);
  const byTest = new Map(attempts.map(a => [a.test_id, a]));
  const types = [...new Set(tests.map(t => t.type))];
  const groups = types.length > 1 ? types.map(ty => ({ head: TYPE_HEAD[ty] ?? 'Tests', rows: tests.filter(t => t.type === ty) })) : [{ head: '', rows: [...tests] }];
  return (
    <>
      {groups.map(g => (
        <div key={g.head || 'all'} className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          {g.head && <span className="eyebrow">{g.head} · {g.rows.length}</span>}
          <div className="tbl-wrap">
            <div className="tbl" style={{ '--minw': '560px', '--cols': 'minmax(0,1fr) 150px 120px' } as React.CSSProperties}>
              <div className="tr th"><span>Test</span><span>Status</span><span /></div>
              {g.rows.map(t => {
                const a = byTest.get(t.id);
                const unlocked = open.has(t.id);
                const plan = plans.get(t.id);
                const canCredit = !unlocked && ((t.type === 'full_mock' && credits.mock) || (t.type === 'sectional' && (credits.sectional || credits.mock)));
                let status = 'Not started', color = 'var(--muted)', cta = 'Start', href = `/test/${t.slug}`, cls = 'btn md';
                if (a?.status === 'submitted') { status = `Score ${a.score} / ${a.max_score} · ${Number(a.percentile).toFixed(1)} %ile`; color = 'var(--ok)'; cta = 'Analysis'; href = `/results/${a.id}`; cls = 'btn chip md'; }
                else if (a?.status === 'in_progress') { status = 'In progress'; color = 'var(--pri)'; cta = 'Resume'; href = `/exam/${a.id}`; }
                else if (!unlocked) { status = canCredit ? 'Free credit available' : plan ? `In ${plan.name}` : 'Locked'; color = 'var(--faint)'; cta = canCredit ? 'Use credit' : 'Unlock'; href = `/test/${t.slug}`; cls = 'btn soft md'; }
                return (
                  <div key={t.id} className="tr">
                    <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                      <span className="t">{t.name}</span>
                      <span className="s">{t.q} Q · {t.duration_min} min{t.is_free && t.type !== 'daily' ? ' · free' : ''}{!unlocked && plan && plan.status === 'live' ? ` · ${rupees(plan.price_paise)}` : ''}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color }}>{status}</span>
                    <Link href={href} className={cls}>{cta}</Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/** Every live test in one course (a student's purchased plan), grouped by type. */
async function CourseTests({ userId, slug }: { userId: string; slug: string }) {
  const [course] = await sql`select id, name, description from courses where slug = ${slug}`;
  if (!course) return <div className="empty">That course was not found. <Link href="/tests">Back to tests</Link></div>;
  const tests = await sql`
    select t.id, t.slug, t.name, t.type, t.duration_min, t.is_free, (select count(*) from test_questions q where q.test_id = t.id)::int as q
    from course_tests ct join tests t on t.id = ct.test_id
    where ct.course_id = ${course.id} and ${liveTest()}
    order by array_position(${TYPE_ORDER}::text[], t.type), t.sort, t.created_at`;
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/tests">Tests</Link><span className="sep">/</span><span aria-current="page">{course.name}</span></nav>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <h1 className="h1">{course.name}</h1>
          {course.description && <div className="sub">{course.description}</div>}
        </div>
        <Link href="/practice" className="btn soft">Build a practice set</Link>
      </div>
      {tests.length ? <TestTable userId={userId} tests={tests as unknown as TestRow[]} /> : <div className="card pad">Tests for this course are being added. They will appear here as soon as they go live.</div>}
    </>
  );
}
