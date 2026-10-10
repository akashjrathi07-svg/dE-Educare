'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { practiceCost } from '@/lib/economy';
import { createPracticeSet } from './actions';

type Exam = { code: string; name: string; sections: { code: string; name: string; topics: string[] }[] };

export function PracticeForm({ exams, defaultExam }: { exams: Exam[]; defaultExam: string }) {
  const router = useRouter();
  const [exam, setExam] = useState(exams.some(e => e.code === defaultExam) ? defaultExam : exams[0]?.code ?? '');
  const ex = useMemo(() => exams.find(e => e.code === exam), [exams, exam]);
  const [section, setSection] = useState(ex?.sections[0]?.code ?? '');
  const sec = ex?.sections.find(s => s.code === section) ?? ex?.sections[0];
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [level, setLevel] = useState('');
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  if (!ex) return <div className="card empty">No exams set up yet.</div>;
  const go = () => start(async () => {
    setErr('');
    const r = await createPracticeSet({ exam, section: sec?.code ?? '', topic, count, level });
    if (r.ok) router.push(`/test/${r.slug}`); else setErr(r.message);
  });
  return (
    <div className="card pad stack" style={{ '--gap': '16px', maxWidth: 760 } as React.CSSProperties}>
      <div className="form-grid">
        <label className="stack" style={{ '--gap': '6px' } as React.CSSProperties}><span className="label">Exam</span>
          <select className="input" value={exam} onChange={e => { setExam(e.target.value); setSection(exams.find(x => x.code === e.target.value)?.sections[0]?.code ?? ''); setTopic(''); }}>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}</select>
        </label>
        <label className="stack" style={{ '--gap': '6px' } as React.CSSProperties}><span className="label">Section</span>
          <select className="input" value={sec?.code ?? ''} onChange={e => { setSection(e.target.value); setTopic(''); }}>{ex.sections.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
        </label>
        <label className="stack" style={{ '--gap': '6px' } as React.CSSProperties}><span className="label">Topic</span>
          <select className="input" value={topic} onChange={e => setTopic(e.target.value)}><option value="">Whole section (mixed)</option>{(sec?.topics ?? []).map(t => <option key={t} value={t}>{t}</option>)}</select>
        </label>
        <label className="stack" style={{ '--gap': '6px' } as React.CSSProperties}><span className="label">Level</span>
          <select className="input" value={level} onChange={e => setLevel(e.target.value)}><option value="">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
        </label>
      </div>
      <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
        <span className="label">Questions</span>
        <div className="seg" role="group" aria-label="Questions">
          {[10, 20, 30].map(n => <button key={n} type="button" aria-current={count === n} onClick={() => setCount(n)}>{n} · {practiceCost(n)} coin{practiceCost(n) > 1 ? 's' : ''}</button>)}
        </div>
      </div>
      {err && <div className="alert err">{err}</div>}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="note">About {Math.ceil(count * 1.5)} minutes · not ranked · full solutions and analysis after you submit</span>
        <button type="button" className="btn" disabled={busy} onClick={go}>{busy ? 'Building…' : `Build my set · ${practiceCost(count)} coin${practiceCost(count) > 1 ? 's' : ''}`}</button>
      </div>
    </div>
  );
}
