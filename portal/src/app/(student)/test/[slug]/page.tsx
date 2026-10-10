import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { canTakeTest, availableCredits } from '@/lib/server/access';
import { loadTest } from '@/lib/server/attempts';
import { rupees } from '@/lib/server/shell';
import { isSectional } from '@/lib/exam-logic';
import { startTest, spendCredit } from './actions';
import { OrderPicker } from './order-picker';

export const metadata = { title: 'Test' };

export default async function TestLaunch({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ err?: string }> }) {
  const { slug } = await params;
  const { err } = await searchParams;
  const u = await requireUser(`/test/${slug}`);
  const [t] = await sql`select id from tests where slug = ${slug} and status = 'live'`;
  if (!t) return <div className="empty">This test isn’t available yet. <Link href="/tests">Browse tests</Link></div>;
  const [b0, [open], last, access, allCredits] = await Promise.all([
    loadTest(t.id),
    sql`select id from attempts where user_id = ${u.id} and test_id = ${t.id} and status = 'in_progress'`,
    sql`select id, score::float, max_score::float, percentile::float, submitted_at from attempts where user_id = ${u.id} and test_id = ${t.id} and status = 'submitted' order by submitted_at desc limit 3`,
    canTakeTest(u.id, t.id),
    availableCredits(u.id),
  ]);
  if (open) redirect(`/exam/${open.id}`);
  const b = b0!;
  const credits = access.allowed ? null : allCredits;
  const creditOk = credits && ((b.test.type === 'full_mock' && credits.mock > 0) || (b.test.type === 'sectional' && credits.sectional + credits.mock > 0));
  const sectional = isSectional(b.rules, b.sections.map(s => s.duration_min));
  const counts = b.sections.map(s => b.questions.filter(q => q.test_section_id === s.id).length);
  const rules = [
    sectional ? 'Each section has its own timer and closes when the time runs out' : `One timer for the whole test (${b.test.duration_min} min)`,
    sectional || b.rules.lock ? 'You can’t return to a section after moving on' : 'Move freely between sections',
    b.rules.review !== false && 'Mark questions for review and come back to them',
    b.rules.calc && 'An on-screen calculator is available',
    b.rules.tita && 'Some questions need a typed numeric answer (TITA)',
    'Answers save automatically. If you get disconnected, reopen the test to continue. The timer keeps running.',
  ].filter(Boolean) as string[];

  return (
    <>
      <Link href={b.test.node_id ? `/tests?node=${b.test.node_id}` : '/tests'} className="back">← Back to tests</Link>
      <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
        <span className="kicker">{b.test.exam_name} · {b.marking.label}</span>
        <h1 className="h1">{b.test.name}</h1>
      </div>
      {err === 'locked' && <p className="alert err">This test is part of a paid plan.</p>}
      {err === 'empty' && <p className="alert err">This test has no questions yet. Please try another.</p>}
      {err === 'credit' && <p className="alert err">No free credit is available for this test.</p>}

      <div className="grid" style={{ '--min': '320px', '--gap': '16px', alignItems: 'start' } as React.CSSProperties}>
        <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          <div className="tbl-wrap">
            <div className="tbl" style={{ '--minw': '360px', '--cols': 'minmax(0,1fr) 90px 110px' } as React.CSSProperties}>
              <div className="tr th"><span>Section</span><span>Questions</span><span>Time</span></div>
              {b.sections.map((s, i) => <div key={s.id} className="tr"><span className="t">{s.name}</span><span>{counts[i]}</span><span>{sectional ? s.duration_min + ' min' : 'Common timer'}</span></div>)}
              <div className="tr"><span className="t">Total</span><span>{b.questions.length}</span><span>{b.test.duration_min} min</span></div>
            </div>
          </div>
          <div className="card pad stack">
            <b>Before you start</b>
            {rules.map(r => <div key={r} className="row" style={{ fontSize: 14, flexWrap: 'nowrap', alignItems: 'baseline' }}><span style={{ color: 'var(--ok)', fontWeight: 800 }}>✓</span>{r}</div>)}
          </div>
        </div>

        <div className="card pad stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          {access.allowed ? (
            <form action={startTest} className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
              <input type="hidden" name="testId" value={t.id} />
              <input type="hidden" name="slug" value={slug} />
              {b.rules.chooseOrder && b.sections.length > 1 && <OrderPicker sections={b.sections.map(s => s.name)} />}
              <button className="btn lg block">{last.length ? 'Retake test' : 'Start test'}</button>
              <span className="note">The timer starts when you press start. +XP when you submit.</span>
            </form>
          ) : (
            <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
              <span className="tag">LOCKED</span>
              <b style={{ fontSize: 18 }}>{access.plan ? `Included in ${access.plan.name}` : 'Part of a paid plan'}</b>
              {access.plan?.status === 'live' && <span className="muted" style={{ fontSize: 14 }}>{rupees(access.plan.price_paise)} · unlocks instantly on web and app</span>}
              {creditOk && (
                <form action={spendCredit}>
                  <input type="hidden" name="testId" value={t.id} /><input type="hidden" name="slug" value={slug} />
                  <button className="btn ok block">Use a free {b.test.type === 'full_mock' ? 'mock' : 'test'} credit</button>
                </form>
              )}
              {access.plan?.status === 'live'
                ? <Link href={`/checkout?plan=${access.plan.slug}&test=${slug}`} className="btn block">Unlock with {access.plan.name}</Link>
                : <span className="note">Pricing for this plan is coming soon.</span>}
              <Link href="/plans" className="btn ghost block">Compare plans</Link>
            </div>
          )}
          {last.length > 0 && (
            <div className="stack" style={{ '--gap': '6px', paddingTop: 12, borderTop: '1px solid var(--line2)' } as React.CSSProperties}>
              <span className="eyebrow">Your attempts</span>
              {last.map(a => (
                <Link key={a.id} href={`/results/${a.id}`} className="row" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                  <span>{new Date(a.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  <span className="mono">{a.score} / {a.max_score} · {Number(a.percentile).toFixed(1)} %ile →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
