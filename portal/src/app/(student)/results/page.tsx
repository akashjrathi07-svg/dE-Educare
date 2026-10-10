import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

export const metadata = { title: 'Results' };

export default async function Results() {
  const u = await requireUser('/results');
  const rows = await sql`
    select a.id, a.score::float, a.max_score::float, a.percentile::float, a.percentile_estimated, a.accuracy, a.submitted_at, t.name, t.type, e.name as exam
    from attempts a join tests t on t.id = a.test_id join exams e on e.id = t.exam_id
    where a.user_id = ${u.id} and a.status = 'submitted' order by a.submitted_at desc limit 100`;
  return (
    <>
      <div className="head"><h1 className="h1">Results</h1><Link href="/tests" className="btn ghost">Take a test →</Link></div>
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
