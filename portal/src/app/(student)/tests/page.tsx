import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { testAccessMap, availableCredits } from '@/lib/server/access';
import { rupees } from '@/lib/server/shell';

export const metadata = { title: 'Tests' };

const markOf = (name: string) => name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

export default async function Tests({ searchParams }: { searchParams: Promise<{ node?: string }> }) {
  const u = await requireUser('/tests');
  const { node: nodeParam } = await searchParams;
  const id = nodeParam || u.exam_group;
  const [node] = await sql`select n.*, e.status as exam_status from catalog_nodes n left join exams e on e.id = n.exam_id where n.id = ${id}`;
  if (!node) return <div className="empty">That section was not found. <Link href="/tests">Back to tests</Link></div>;

  const path = await sql`
    with recursive up as (select id, parent_id, name, 0 as d from catalog_nodes where id = ${id}
      union all select c.id, c.parent_id, c.name, up.d + 1 from catalog_nodes c join up on c.id = up.parent_id)
    select id, name from up order by d desc`;
  const children = await sql`
    select n.id, n.name, n.sub, n.is_free,
      (select count(*) from catalog_nodes c where c.parent_id = n.id)::int as kids,
      (select count(*) from tests t where t.node_id = n.id and t.status = 'live')::int as tests
    from catalog_nodes n where n.parent_id = ${id} order by n.sort`;
  const tests = await sql`
    select t.id, t.slug, t.name, t.type, t.duration_min, t.is_free,
      (select count(*) from test_questions q where q.test_id = t.id)::int as q
    from tests t where t.node_id = ${id} and t.status = 'live' and (t.live_from is null or t.live_from <= now())
    order by t.sort limit 200`;
  const { open, plans } = await testAccessMap(u.id, tests.map(t => t.id));
  const attempts = tests.length ? await sql`
    select distinct on (test_id) test_id, id, status, score::float, max_score::float, percentile::float
    from attempts where user_id = ${u.id} and test_id = any(${tests.map(t => t.id)})
    order by test_id, (status = 'in_progress') desc, submitted_at desc` : [];
  const byTest = new Map(attempts.map(a => [a.test_id, a]));
  const credits = tests.length ? await availableCredits(u.id) : { mock: 0, sectional: 0 };
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
      <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
        <h1 className="h1">{node.name}</h1>
        <div className="sub">{node.sub}</div>
      </div>

      {soon && !children.length && !tests.length && (
        <div className="card pad stack">
          <b>{node.name} test series is launching soon.</b>
          <span className="muted" style={{ fontSize: 14 }}>We’ll notify you when it goes live. Meanwhile, the free daily test and CAT tests are open.</span>
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
              <div className="mono faint" style={{ fontSize: 11 }}>{c.kids ? `${c.kids} sections` : c.tests ? `${c.tests} tests` : 'Coming soon'}</div>
            </Link>
          ))}
        </div>
      )}

      {tests.length > 0 && (
        <div className="tbl-wrap">
          <div className="tbl" style={{ '--minw': '560px', '--cols': 'minmax(0,1fr) 150px 120px' } as React.CSSProperties}>
            <div className="tr th"><span>Test</span><span>Status</span><span /></div>
            {tests.map(t => {
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
      )}
    </>
  );
}
