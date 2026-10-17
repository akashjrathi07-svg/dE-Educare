import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { examRefs, TEST_TYPES } from '@/lib/server/admin';
import { Head } from '../ui';
import { Builder, UploadTests } from './tests-client';
import { TestList } from './test-list';

type SP = { new?: string; upload?: string; exam?: string; status?: string; q?: string; page?: string; course?: string };
const PAGE = 50;

export default async function Tests({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff('tests');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = ['live', 'draft', 'archived', 'scheduled'].includes(sp.status ?? '') ? sp.status! : null;
  const tab = sp.course === 'free' || sp.course === 'none' || /^[0-9a-f-]{36}$/i.test(sp.course ?? '') ? sp.course! : '';
  const tabFilter = tab === 'free' ? sql`and t.is_free` : tab === 'none' ? sql`and not t.is_free and not exists (select 1 from course_tests ct where ct.test_id = t.id)`
    : tab ? sql`and exists (select 1 from course_tests ct where ct.test_id = t.id and ct.course_id = ${tab})` : sql``;
  const where = sql`where t.owner_id is null ${tabFilter} ${sp.exam ? sql`and e.code = ${sp.exam}` : sql``} ${sp.q ? sql`and t.name ilike ${'%' + sp.q + '%'}` : sql``}
    ${status === 'scheduled' ? sql`and t.status = 'live' and t.live_from > now()` : status === 'live' ? sql`and t.status = 'live' and (t.live_from is null or t.live_from <= now())` : status ? sql`and t.status = ${status}` : sql``}`;
  const [exams, rows, [{ total }], pool, topicPool, courses, nodes] = await Promise.all([
    examRefs(),
    sql`select t.id, t.slug, t.name, t.type, t.duration_min, t.is_free, t.status, t.live_from, t.window_end, t.node_id, t.solutions_visibility, t.ranking, t.views, e.code as exam,
          (select count(*)::int from test_questions q where q.test_id = t.id) as q,
          (select count(distinct a.user_id)::int from attempts a where a.test_id = t.id) as started,
          (select count(*)::int from attempts a where a.test_id = t.id and a.status = 'submitted') as attempts,
          coalesce((select array_agg(ct.course_id) from course_tests ct where ct.test_id = t.id), '{}') as course_ids
        from tests t join exams e on e.id = t.exam_id ${where}
        order by ${tab && tab !== 'free' && tab !== 'none' ? sql`array_position('{full_mock,pyq,sectional,topic,daily,custom}'::text[], t.type), t.sort, t.created_at` : sql`t.created_at desc, t.sort`}
        limit ${PAGE} offset ${(page - 1) * PAGE}`,
    sql`select count(*)::int as total from tests t join exams e on e.id = t.exam_id ${where}`,
    sql`select e.code as exam, s.code as sec, q.difficulty, count(*)::int as n from questions q join exams e on e.id = q.exam_id join sections s on s.id = q.section_id where q.status = 'live' group by 1, 2, 3`,
    sql`select e.code as exam, s.code as sec, t.name as topic, count(*)::int as n from questions q join exams e on e.id = q.exam_id join sections s on s.id = q.section_id join topics t on t.id = q.topic_id where q.status = 'live' group by 1, 2, 3`,
    sql`select c.id, c.name, c.status, c.price_paise, e.code as exam,
          (select count(*)::int from course_tests ct join tests t on t.id = ct.test_id where ct.course_id = c.id and t.status <> 'archived') as tests,
          (select count(distinct en.user_id)::int from entitlements en where en.course_id = c.id and (en.ends_at is null or en.ends_at > now())) as students
        from courses c left join exams e on e.id = c.exam_id order by c.sort`,
    sql`with recursive tree as (
          select id, parent_id, name, exam_id, name::text as path from catalog_nodes where parent_id is null
          union all select n.id, n.parent_id, n.name, n.exam_id, tree.path || ' › ' || n.name from catalog_nodes n join tree on n.parent_id = tree.id)
        select tree.id, tree.path, e.code as exam from tree left join exams e on e.id = tree.exam_id where e.code is not null order by tree.path`,
  ]);
  const poolMap: Record<string, number> = {};
  for (const p of pool) poolMap[`${p.exam}|${p.sec}|${p.difficulty}`] = p.n;
  for (const p of topicPool) poolMap[`${p.exam}|${p.sec}|t:${p.topic}`] = p.n;
  const [{ free, loose }] = await sql`select count(*) filter (where is_free and status <> 'archived')::int as free,
    count(*) filter (where not is_free and status <> 'archived' and not exists (select 1 from course_tests ct where ct.test_id = tests.id))::int as loose
    from tests where owner_id is null`;
  const cur = courses.find(c => c.id === tab);
  const link = (p: Partial<SP>) => '/admin/tests?' + new URLSearchParams(Object.entries({ exam: sp.exam, status: sp.status, q: sp.q, course: tab, ...p }).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <Head title="Tests" sub="Mocks, sectionals, topic tests, daily tests and previous papers">
        <Link className="btn ghost" href={link({ upload: '1' })}>Upload tests (Excel or Word)</Link>
        <Link className="btn" href={link({ new: '1' })}>New test</Link>
      </Head>
      {sp.upload && (
        <UploadTests closeHref={link({})}
          exams={exams.map(e => ({ code: e.code, name: e.name, plus: e.plus, rules: e.rules, marking: e.marking, totalMinutes: e.totalMinutes, sections: e.sections.map(s => ({ code: s.code, name: s.name, questions: s.questions ?? 10, minutes: s.minutes, topics: s.topics })) }))}
          courses={courses.map(c => ({ id: c.id, name: c.name, exam: c.exam }))} nodes={nodes.map(n => ({ id: n.id, path: n.path, exam: n.exam }))} />
      )}
      {sp.new && (
        <Builder closeHref={link({})} pool={poolMap}
          exams={exams.map(e => ({ code: e.code, name: e.name, plus: e.plus, rules: e.rules, marking: e.marking, totalMinutes: e.totalMinutes, sections: e.sections.map(s => ({ code: s.code, name: s.name, questions: s.questions ?? 10, minutes: s.minutes, topics: s.topics })) }))}
          courses={courses.map(c => ({ id: c.id, name: c.name, exam: c.exam }))} nodes={nodes.map(n => ({ id: n.id, path: n.path, exam: n.exam }))} />
      )}
      <nav className="chips" aria-label="Courses" style={{ flexWrap: 'wrap' }}>
        <Link className="chip" aria-pressed={!tab} href={link({ course: '', page: '' })}>All tests</Link>
        {courses.map(c => (
          <Link key={c.id} className="chip" aria-pressed={tab === c.id} href={link({ course: c.id, page: '' })}>{c.name} · {c.tests}</Link>
        ))}
        <Link className="chip" aria-pressed={tab === 'free'} href={link({ course: 'free', page: '' })}>Free tests · {free}</Link>
        <Link className="chip" aria-pressed={tab === 'none'} href={link({ course: 'none', page: '' })}>Not in any course · {loose}</Link>
      </nav>
      {cur && (
        <div className="card pad row" style={{ justifyContent: 'space-between', '--gap': '12px' } as React.CSSProperties}>
          <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
            <b style={{ fontSize: 17 }}>{cur.name}</b>
            <span className="note">{cur.exam ?? 'All exams'} · {cur.price_paise ? '₹' + (cur.price_paise / 100).toLocaleString('en-IN') : 'Free'} · {cur.students.toLocaleString('en-IN')} students · {cur.status === 'live' ? 'on sale' : 'draft (not on sale)'} · {cur.tests} tests</span>
          </div>
          <Link className="btn ghost sm" href="/admin/courses">Edit course</Link>
        </div>
      )}
      <form className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
        {tab && <input type="hidden" name="course" value={tab} />}
        <input className="input" style={{ flex: '1 1 220px', width: 'auto' }} name="q" defaultValue={sp.q} placeholder="Search tests" aria-label="Search tests" />
        <select className="input" style={{ width: 'auto' }} name="exam" defaultValue={sp.exam ?? ''} aria-label="Exam"><option value="">All exams</option>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} name="status" defaultValue={sp.status ?? ''} aria-label="Status">
          <option value="">Any status</option><option value="live">Live</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </select>
        <button className="btn ghost">Filter</button>
      </form>
      <div className="note">{total.toLocaleString('en-IN')} tests{cur ? ' in ' + cur.name : tab === 'free' ? ' open to everyone' : tab === 'none' ? ' that no course unlocks and are not free' : ''}</div>
      <TestList appUrl={(process.env.APP_URL ?? '').replace(/\/$/, '')} tab={tab}
        courses={courses.map(c => ({ id: c.id, name: c.name, exam: c.exam }))} nodes={nodes.map(n => ({ id: n.id, path: n.path, exam: n.exam }))}
        rows={rows.map(t => ({
          id: t.id, slug: t.slug, name: t.name, type: t.type, typeLabel: TEST_TYPES[t.type] ?? t.type, exam: t.exam, q: t.q, minutes: t.duration_min, free: t.is_free,
          status: t.status === 'live' && t.live_from && new Date(t.live_from) > new Date() ? 'scheduled' : t.status,
          liveFrom: t.live_from ? new Date(t.live_from).toISOString() : '', windowEnd: t.window_end ? new Date(t.window_end).toISOString() : '',
          nodeId: t.node_id ?? '', solutions: t.solutions_visibility, ranking: t.ranking, views: t.views, started: t.started, attempts: t.attempts, courseIds: t.course_ids ?? [],
        }))} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {page > 1 ? <Link className="btn ghost sm" href={link({ page: String(page - 1) })}>← Newer</Link> : <span />}
        {total > page * PAGE && <Link className="btn ghost sm" href={link({ page: String(page + 1) })}>Older →</Link>}
      </div>
    </>
  );
}
