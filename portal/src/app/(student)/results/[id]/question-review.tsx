'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fmt, type Analysis } from '@/lib/analysis';
import { RichText } from '@/components/rich-text';
import { ReportQuestion } from './report-question';

type Row = Analysis['timeRows'][number];
const RES = { ok: ['Correct', 'ok'], bad: ['Incorrect', 'bad'], skip: ['Skipped', 'skip'] } as const;
const FILTERS = [['all', 'All'], ['bad', 'Incorrect'], ['skip', 'Skipped'], ['ok', 'Correct']] as const;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const signed = (m: number) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');

/** Opens question n in the review from anywhere on the page (charts below use it). */
export const showQuestion = (n: number) => window.dispatchEvent(new CustomEvent('de:review', { detail: n }));

/**
 * Question-by-question review: the question as it appeared in the test, your answer and the correct one,
 * the written solution and a short analysis, with Previous / Next and a palette coloured by result.
 */
export function QuestionReview({ rows, solutionsOpen, peersReady }: { rows: Row[]; solutionsOpen: boolean; peersReady: boolean }) {
  const sections = useMemo(() => [...new Set(rows.map(r => r.section))], [rows]);
  const [section, setSection] = useState('all');
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [n, setN] = useState(() => (rows.find(r => r.result === 'bad') ?? rows[0])?.n ?? 1);
  const [pane, setPane] = useState<'solution' | 'analysis'>('solution');
  const box = useRef<HTMLElement>(null);

  const list = useMemo(() => rows.filter(r => (section === 'all' || r.section === section) && (filter === 'all' || r.result === filter)), [rows, section, filter]);
  const i = Math.max(0, list.findIndex(r => r.n === n));
  const q = list[i];
  const go = useCallback((to: number) => { if (list[to]) setN(list[to].n); }, [list]);

  // Keep the current question inside the filtered list.
  useEffect(() => { if (list.length && !list.some(r => r.n === n)) setN(list[0].n); }, [list, n]);
  // Charts below ask for a question: clear filters, open it, scroll here.
  useEffect(() => {
    const open = (e: Event) => { setSection('all'); setFilter('all'); setN((e as CustomEvent<number>).detail); box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    window.addEventListener('de:review', open);
    return () => window.removeEventListener('de:review', open);
  }, []);
  // Arrow keys move between questions (not while typing).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') go(i + 1);
      if (e.key === 'ArrowLeft') go(i - 1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [go, i]);

  if (!rows.length) return null;
  const count = (k: string) => rows.filter(r => (section === 'all' || r.section === section) && (k === 'all' || r.result === k)).length;
  const ref = q?.peer ?? q?.ideal ?? 0;

  return (
    <section ref={box} className="card qr" aria-label="Question review">
      <div className="qr-head">
        <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
          <span className="eyebrow" style={{ color: 'var(--pri)' }}>Question review</span>
          <b style={{ fontSize: 18 }}>See every question with its solution</b>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {sections.length > 1 && (
            <select className="input sunk" aria-label="Section" value={section} onChange={e => setSection(e.target.value)} style={{ width: 'auto', padding: '8px 12px' }}>
              <option value="all">All sections</option>{sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="chips" role="tablist" aria-label="Show">
        {FILTERS.map(([id, l]) => <button key={id} type="button" className="chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>{l} · {count(id)}</button>)}
      </div>

      <div className="qr-palette" aria-label="Questions">
        {list.map(r => (
          <button key={r.n} type="button" className={'qr-dot ' + RES[r.result][1]} aria-current={r.n === q?.n} onClick={() => setN(r.n)}
            title={`Q${r.n} · ${RES[r.result][0]} · ${r.topic}`} aria-label={`Question ${r.n}, ${RES[r.result][0]}`}>{r.n}</button>
        ))}
      </div>

      {!q ? <div className="empty" style={{ padding: 24 }}>No questions here.</div> : (
        <>
          <div className={'qr-banner ' + RES[q.result][1]}>
            <b>{RES[q.result][0]} · {signed(q.marks)} mark{Math.abs(q.marks) === 1 ? '' : 's'}</b>
            <span>Your time <b>{fmt(q.you)}</b></span>
            <span>{peersReady && q.peer != null ? 'Average' : 'Ideal'} <b>{fmt(ref)}</b></span>
            <span>{q.peerAcc != null ? <><b>{q.peerAcc}%</b> got it right</> : 'Peer accuracy after 50 attempts'}</span>
          </div>

          <div className="qr-meta">
            <span className="mono">Q{q.n} of {rows.length}</span><span>{q.section}</span><span>{q.topic}</span>
            <span className={'tag ' + (q.difficulty === 'easy' ? 'ok' : q.difficulty === 'hard' ? 'bad' : 'mid')}>{cap(q.difficulty)}</span>
          </div>

          {q.setText && (
            <details className="qr-set" open>
              <summary>Passage / data set</summary>
              <RichText className="pre" style={{ fontSize: 14, lineHeight: 1.6 }} text={q.setText} />
            </details>
          )}
          <RichText className="pre qr-q" text={q.text} />

          {q.type === 'TITA' ? (
            <div className="qr-tita">
              <div className={'qr-opt ' + (q.result === 'ok' ? 'right' : q.answer ? 'wrong' : '')}><span className="qr-k">You</span><span>{q.answer ?? 'Not answered'}</span></div>
              {q.correct != null && <div className="qr-opt right"><span className="qr-k">✓</span><span>Correct answer: <b>{q.correct}</b></span></div>}
            </div>
          ) : (
            <div className="qr-opts">
              {q.options.map(o => {
                const right = q.correct != null && q.correct.split('|').includes(o.key);
                const mine = !!q.answer && q.answer.split('|').includes(o.key);
                return (
                  <div key={o.key} className={'qr-opt' + (right ? ' right' : mine ? ' wrong' : '')}>
                    <span className="qr-k">{right ? '✓' : mine ? '✗' : o.key}</span>
                    <RichText className="pre" style={{ flex: 1 }} text={o.text} />
                    {(right || mine) && <span className="qr-why">{right && mine ? 'Your answer · correct' : right ? 'Correct answer' : 'Your answer'}</span>}
                  </div>
                );
              })}
              {!q.answer && <span className="muted" style={{ fontSize: 13 }}>You skipped this question.</span>}
            </div>
          )}

          <div className="seg" role="tablist" style={{ alignSelf: 'flex-start' }}>
            <button type="button" role="tab" aria-current={pane === 'solution'} onClick={() => setPane('solution')}>Solution</button>
            <button type="button" role="tab" aria-current={pane === 'analysis'} onClick={() => setPane('analysis')}>Question analysis</button>
          </div>

          {pane === 'solution' ? (
            <div className="sol" style={{ margin: 0 }}>
              {solutionsOpen
                ? <RichText className="pre" style={{ lineHeight: 1.65 }} text={q.solution || 'The written solution for this question is coming soon.'} />
                : <span className="muted">Solutions open after the test window closes.</span>}
              {solutionsOpen && q.video && <a href={q.video} target="_blank" rel="noopener noreferrer" className="link">Watch the video solution →</a>}
            </div>
          ) : (
            <QuestionAnalysis q={q} peersReady={peersReady} />
          )}
          <ReportQuestion questionId={q.questionId} />

          <div className="qr-nav">
            <button type="button" className="btn ghost" disabled={i === 0} onClick={() => go(i - 1)}>← Previous</button>
            <span className="muted mono" style={{ fontSize: 12 }}>{i + 1} / {list.length}</span>
            <button type="button" className="btn" disabled={i >= list.length - 1} onClick={() => go(i + 1)}>Next →</button>
          </div>
        </>
      )}
    </section>
  );
}

/** Time bars (you, average, topper, ideal) and how many students got it right. */
function QuestionAnalysis({ q, peersReady }: { q: Row; peersReady: boolean }) {
  const bars = [
    ['You', q.you, q.sink ? 'var(--sink)' : 'var(--pri)'],
    ...(q.peer != null ? [['Average', q.peer, 'var(--faint)']] : []),
    ...(q.topper != null ? [['Topper', q.topper, 'var(--ok-solid)']] : []),
    ['Ideal', q.ideal, 'var(--faint)'],
  ] as [string, number, string][];
  const max = Math.max(1, ...bars.map(b => b[1]));
  const ref = q.peer ?? q.ideal;
  const tip = q.sink ? `You spent ${fmt(q.you - ref)} more than ${q.peer != null ? 'the average' : 'the ideal'}: in the exam, move on sooner on questions like this.`
    : q.result === 'bad' ? 'Your time was fine but the answer was wrong: read the solution for the concept, then retry a topic test.'
    : q.result === 'skip' ? (q.peerAcc != null && q.peerAcc >= 60 ? `${q.peerAcc}% of students got this right: it was worth attempting.` : 'Skipping was reasonable if you were unsure.')
    : 'Right and on time. Well done.';
  return (
    <div className="qr-ana">
      <div className="stack" style={{ '--gap': '8px', flex: '2 1 260px' } as React.CSSProperties}>
        <span className="eyebrow">Time on this question</span>
        {bars.map(([l, v, c]) => (
          <div key={l} className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
            <span style={{ width: 58, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{l}</span>
            <div className="bar" style={{ height: 10 }}><i style={{ width: Math.max(3, Math.round((v / max) * 100)) + '%', background: c }} /></div>
            <span className="mono" style={{ width: 56, textAlign: 'right', fontSize: 12 }}>{fmt(v)}</span>
          </div>
        ))}
        {!peersReady && <span className="muted" style={{ fontSize: 12 }}>Average and topper times appear once 50 students have answered.</span>}
      </div>
      <div className="stack" style={{ '--gap': '8px', alignItems: 'center', flex: '1 1 140px' } as React.CSSProperties}>
        <span className="eyebrow">Students who got it right</span>
        {q.peerAcc != null ? <Donut parts={[[q.peerAcc, 'var(--ok-solid)'], [100 - q.peerAcc, 'var(--line)']]} label={q.peerAcc + '%'} size={96} /> : <span className="muted" style={{ fontSize: 13 }}>After 50 attempts</span>}
      </div>
      <p className="qr-tip">{tip}</p>
    </div>
  );
}

/** Ring chart: parts are [value, colour]; 2px gaps between segments. */
export function Donut({ parts, label, sub, size = 140 }: { parts: [number, string, string?][]; label: string; sub?: string; size?: number }) {
  const total = parts.reduce((a, p) => a + p[0], 0) || 1;
  const r = 42, c = 2 * Math.PI * r, gap = parts.filter(p => p[0] > 0).length > 1 ? 1.2 : 0;
  let at = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={parts.map(p => `${p[2] ?? ''} ${p[0]}`).join(', ')}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--chip)" strokeWidth="12" />
        {parts.map(([v, col, name], k) => {
          if (v <= 0) return null;
          const len = Math.max(0, (v / total) * c - gap);
          const el = (
            <circle key={k} cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="12" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-at} transform="rotate(-90 50 50)">
              {name && <title>{`${name}: ${v}`}</title>}
            </circle>
          );
          at += (v / total) * c;
          return el;
        })}
      </svg>
      <div className="donut-c"><b>{label}</b>{sub && <span>{sub}</span>}</div>
    </div>
  );
}
