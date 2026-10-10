import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { reportCost } from '@/lib/economy';
import { ReportButton } from './report-button';

export const metadata = { title: 'Results' };

export default async function Results() {
  const u = await requireUser('/results');
  const [rows, [report]] = await Promise.all([
    sql`
      select a.id, a.score::float, a.max_score::float, a.percentile::float, a.percentile_estimated, a.accuracy, a.submitted_at, t.name, t.type, e.name as exam
      from attempts a join tests t on t.id = a.test_id join exams e on e.id = t.exam_id
      where a.user_id = ${u.id} and a.status = 'submitted' order by a.submitted_at desc limit 100`,
    sql`select body, tests, created_at from progress_reports where user_id = ${u.id} order by created_at desc limit 1`,
  ]);
  const reportTests = Math.min(30, rows.length);
  return (
    <>
      <div className="head"><h1 className="h1">Results</h1><Link href="/tests" className="btn ghost">Take a test →</Link></div>
      {rows.length >= 2 && (
        <div className="card pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
              <span className="eyebrow" style={{ color: 'var(--pri)' }}>Guru progress report</span>
              <span className="muted" style={{ fontSize: 13 }}>Your trend, strengths, weak topics and a 14-day plan from your last {reportTests} tests.</span>
            </div>
            <ReportButton cost={reportCost(reportTests)} label={report ? 'Refresh report' : 'Get my report'} />
          </div>
          {report && (
            <details open={Date.now() - new Date(report.created_at).getTime() < 86400000}>
              <summary className="link" style={{ cursor: 'pointer' }}>Report from {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {report.tests} tests</summary>
              <div className="pre" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>{report.body}</div>
            </details>
          )}
        </div>
      )}
      {rows.length ? (
        <div className="tbl-wrap">
          <div className="tbl" style={{ '--minw': '620px', '--cols': 'minmax(0,1.6fr) 110px 110px 90px 110px' } as React.CSSProperties}>
            <div className="tr th"><span>Test</span><span>Score</span><span>Percentile</span><span>Accuracy</span><span>Date</span></div>
            {rows.map(r => (
              <Link key={r.id} href={`/results/${r.id}`} className="tr">
                <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}><span className="t">{r.name}</span><span className="s">{r.exam} · {r.type.replace('_', ' ')}</span></span>
                <span className="mono">{r.score} / {r.max_score}</span>
                <span className="mono" style={{ color: 'var(--pri)' }}>{Number(r.percentile).toFixed(1)}{r.percentile_estimated ? '*' : ''}</span>
                <span className="mono">{r.accuracy}%</span>
                <span className="muted">{new Date(r.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : <div className="card empty stack" style={{ alignItems: 'center', '--gap': '12px' } as React.CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/hero-mock-test.webp" alt="" width={1200} height={1000} style={{ width: 'min(320px, 80%)', height: 'auto' }} />
        <span>No results yet. Submit a test and its full analysis appears here.</span>
        <Link href="/daily/cat" className="btn">Take today’s free test</Link>
      </div>}
      {rows.some(r => r.percentile_estimated) && <p className="note">* Estimated from recent score trends until 200 students have taken the test.</p>}
    </>
  );
}
