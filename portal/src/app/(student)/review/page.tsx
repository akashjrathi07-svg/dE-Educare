import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { ReviewForm } from './review-form';

export const metadata = { title: 'Write a review' };

const STATUS: Record<string, string> = { pending: 'Waiting for approval', approved: 'Live on deeducare.com', rejected: 'Not published' };

export default async function Review({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const u = await requireUser('/review');
  const [mine, [stats]] = await Promise.all([
    sql`select kind, rating, body, display_name, exam_label, status, photo is not null as has_photo from reviews where user_id = ${u.id}`,
    sql`select (select count(*)::int from attempts where user_id = ${u.id} and status = 'submitted') as tests`,
  ]);
  const want = (await searchParams).kind;
  const exam = u.target_exam ? `${u.target_exam}${u.target_year ? ' ' + u.target_year : ''}` : '';
  return (
    <>
      <div className="head">
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <h1 className="h1">Write a review</h1>
          <span className="muted" style={{ fontSize: 14 }}>Tell other students what worked for you, and what didn’t. Honest reviews help us improve.</span>
        </div>
      </div>
      {mine.length > 0 && (
        <div className="grid" style={{ '--min': '240px', '--gap': '10px' } as React.CSSProperties}>
          {mine.map(r => (
            <div key={r.kind} className="card pad stack" style={{ '--gap': '6px' } as React.CSSProperties}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b style={{ fontSize: 14 }}>{({ tests: 'Test series', classes: 'Classes', guru: 'Guru AI' } as Record<string, string>)[r.kind]}</b>
                <span className={'tag ' + (r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'bad' : 'pri')}>{STATUS[r.status]}</span>
              </div>
              <span style={{ color: '#F2A900', letterSpacing: 1 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{r.body}</span>
            </div>
          ))}
        </div>
      )}
      <ReviewForm
        defaults={{ name: (u.name ?? '').split(' ').map((p, i) => (i === 0 ? p : p.charAt(0) + '.')).join(' '), exam }}
        existing={Object.fromEntries(mine.map(r => [r.kind, { rating: r.rating, body: r.body, name: r.display_name, exam: r.exam_label ?? '', hasPhoto: r.has_photo }]))}
        initialKind={['tests', 'classes', 'guru'].includes(want ?? '') ? want! : 'tests'}
        testsTaken={stats.tests}
      />
    </>
  );
}
