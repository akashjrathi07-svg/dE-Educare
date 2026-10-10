import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { examRefs, TEST_TYPES } from '@/lib/server/admin';
import { Head } from '../ui';
import { Builder, StatusMenu } from './tests-client';

type SP = { new?: string; exam?: string; status?: string; q?: string; page?: string };
const PAGE = 50;

export default async function Tests({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff('tests');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = ['live', 'draft', 'archived', 'scheduled'].includes(sp.status ?? '') ? sp.status! : null;
  const where = sql`where t.owner_id is null ${sp.exam ? sql`and e.code = ${sp.exam}` : sql``} ${sp.q ? sql`and t.name ilike ${'%' + sp.q + '%'}` : sql``}
    ${status === 'scheduled' ? sql`and t.status = 'live' and t.live_from > now()` : status === 'live' ? sql`and t.status = 'live' and (t.live_from is null or t.live_from <= now())` : status ? sql`and t.status = ${status}` : sql``}`;
  const [exams, rows, [{ total }], pool, topicPool, courses, nodes] = await Promise.all([
    examRefs(),
    sql`select t.id, t.slug, t.name, t.type, t.duration_min, t.is_free, t.status, t.live_from, e.code as exam,
          (select count(*)::int from test_questions q where q.test_id = t.id) as q,
          (select count(*)::int from attempts a where a.test_id = t.id and a.status = 'submitted') as attempts,
          (select string_agg(c.name, ', ' order by c.sort) from course_tests ct join courses c on c.id = ct.course_id where ct.test_id = t.id) as access
        from tests t join exams e on e.id = t.exam_id ${where}
        order by t.created_at desc, t.sort limit ${PAGE} offset ${(page - 1) * PAGE}`,
    sql`select count(*)::int as total from tests t join exams e on e.id = t.exam_id ${where}`,
    sql`select e.code as exam, s.code as sec, q.difficulty, count(*)::int as n from questions q join exams e on e.id = q.exam_id join sections s on s.id = q.section_id where q.status = 'live' group by 1, 2, 3`,
    sql`select e.code as exam, s.code as sec, t.name as topic, count(*)::int as n from questions q join exams e on e.id = q.exam_id join sections s on s.id = q.section_id join topics t on t.id = q.topic_id where q.status = 'live' group by 1, 2, 3`,
    sql`select c.id, c.name, e.code as exam from courses c left join exams e on e.id = c.exam_id order by c.sort`,
    sql`with recursive tree as (
          select id, parent_id, name, exam_id, name::text as path from catalog_nodes where parent_id is null
          union all select n.id, n.parent_id, n.name, n.exam_id, tree.path || ' › ' || n.name from catalog_nodes n join tree on n.parent_id = tree.id)
        select tree.id, tree.path, e.code as exam from tree left join exams e on e.id = tree.exam_id where e.code is not null order by tree.path`,
  ]);
  const poolMap: Record<string, number> = {};
  for (const p of pool) poolMap[`${p.exam}|${p.sec}|${p.difficulty}`] = p.n;
  for (const p of topicPool) poolMap[`${p.exam}|${p.sec}|t:${p.topic}`] = p.n;
  const link = (p: Partial<SP>) => '/admin/tests?' + new URLSearchParams(Object.entries({ exam: sp.exam, status: sp.status, q: sp.q, ...p }).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <Head title="Tests" sub="Mocks, sectionals, topic tests, daily tests and previous papers">
        <Link className="btn" href={link({ new: '1' })}>New test</Link>
      </Head>
      {sp.new && (
        <Builder closeHref={link({})} pool={poolMap}
          exams={exams.map(e => ({ code: e.code, name: e.name, plus: e.plus, rules: e.rules, marking: e.marking, totalMinutes: e.totalMinutes, sections: e.sections.map(s => ({ code: s.code, name: s.name, questions: s.questions ?? 10, minutes: s.minutes, topics: s.topics })) }))}
          courses={courses.map(c => ({ id: c.id, name: c.name, exam: c.exam }))} nodes={nodes.map(n => ({ id: n.id, path: n.path, exam: n.exam }))} />
      )}
      <form className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
        <input className="input" style={{ flex: '1 1 220px', width: 'auto' }} name="q" defaultValue={sp.q} placeholder="Search tests" aria-label="Search tests" />
        <select className="input" style={{ width: 'auto' }} name="exam" defaultValue={sp.exam ?? ''} aria-label="Exam"><option value="">All exams</option>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} name="status" defaultValue={sp.status ?? ''} aria-label="Status">
          <option value="">Any status</option><option value="live">Live</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </select>
        <button className="btn ghost">Filter</button>
      </form>
      <div className="note">{total.toLocaleString('en-IN')} tests</div>
      <div className="tbl-wrap">
        <div className="tbl" style={{ '--minw': '1000px', '--cols': 'minmax(0,1.6fr) 110px 80px 50px 50px minmax(0,1.4fr) 70px 120px' } as React.CSSProperties}>
          <div className="tr th"><span>Test</span><span>Type</span><span>Exam</span><span>Q</span><span>Min</span><span>Access</span><span>Attempts</span><span>Status</span></div>
          {rows.length === 0 && <div className="empty">No tests match.</div>}
          {rows.map(t => {
            const scheduled = t.status === 'live' && t.live_from && new Date(t.live_from) > new Date();
            return (
              <div key={t.id} className="tr">
                <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                  <span className="t">{t.name}</span>
                  <span className="s mono">{t.status === 'live' ? <Link href={`/test/${t.slug}`} target="_blank">{t.slug} ↗</Link> : t.slug}</span>
                </div>
                <span className="s">{TEST_TYPES[t.type]}</span><span className="s">{t.exam}</span><span className="mono">{t.q}</span><span className="mono">{t.duration_min}</span>
                <span className="s">{[t.is_free && 'Free', t.access].filter(Boolean).join(' · ') || 'Nobody yet'}</span>
                <span className="mono">{t.attempts.toLocaleString('en-IN')}</span>
                <StatusMenu id={t.id} status={scheduled ? 'scheduled' : t.status} when={scheduled ? new Date(t.live_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {page > 1 ? <Link className="btn ghost sm" href={link({ page: String(page - 1) })}>← Newer</Link> : <span />}
        {total > page * PAGE && <Link className="btn ghost sm" href={link({ page: String(page + 1) })}>Older →</Link>}
      </div>
    </>
  );
}
