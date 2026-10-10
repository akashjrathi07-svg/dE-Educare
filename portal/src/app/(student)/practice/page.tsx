import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { examRefs } from '@/lib/server/admin';
import { PracticeForm } from './practice-form';

export const metadata = { title: 'Practice sets' };

export default async function Practice() {
  const u = await requireUser('/practice');
  const [exams, mine] = await Promise.all([
    examRefs(),
    sql`select t.slug, t.name, t.created_at, (select a.id from attempts a where a.test_id = t.id and a.user_id = ${u.id} and a.status = 'submitted' order by a.submitted_at desc limit 1) as result
        from tests t where t.owner_id = ${u.id} and t.type = 'practice' order by t.created_at desc limit 10`,
  ]);
  const list = exams.filter(e => e.group === u.exam_group).map(e => ({ code: e.code, name: e.name, sections: e.sections.map(s => ({ code: s.code, name: s.name, topics: s.topics })) }));
  return (
    <>
      <div className="head">
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <h1 className="h1">Practice sets</h1>
          <span className="muted" style={{ fontSize: 14 }}>Guru builds a set from the question bank on any topic, preferring questions you haven’t seen. 1 coin per 10 questions.</span>
        </div>
        <Link href="/tests" className="btn ghost">All tests</Link>
      </div>
      <PracticeForm exams={list} defaultExam={u.target_exam ?? list[0]?.code ?? 'CAT'} />
      {mine.length > 0 && (
        <section className="list">
          <div style={{ padding: '14px 16px', fontWeight: 800 }}>Your recent sets</div>
          {mine.map(t => (
            <div key={t.slug} className="row" style={{ padding: '11px 16px', justifyContent: 'space-between' }}>
              <span className="stack" style={{ '--gap': '1px' } as React.CSSProperties}><b style={{ fontSize: 14 }}>{t.name}</b><span className="muted" style={{ fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></span>
              {t.result ? <Link className="btn ghost sm" href={`/results/${t.result}`}>Result</Link> : <Link className="btn sm" href={`/test/${t.slug}`}>Start</Link>}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
