'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { attemptState } from '@/lib/server/attempts';

type State = Extract<NonNullable<Awaited<ReturnType<typeof attemptState>>>, { submitted: false }>;
type Q = State['questions'][number];
type Change = { questionId: string; answer?: string | null; marked?: boolean; timeDelta?: number; visit?: boolean };
type Status = 'a' | 'v' | 'n' | 'm' | 'am';

const fmtClock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(x).padStart(2, '0');
};

export function ExamWindow({ initial }: { initial: State }) {
  const router = useRouter();
  const [st, setSt] = useState(initial);
  const qs = st.questions;
  const sectional = st.sectional;
  const fourStates = st.rules.palette === '4 states';
  const omr = !!st.rules.omr || st.rules.palette === 'OMR bubbles';

  const [answers, setAnswers] = useState<Record<string, string | null>>(() => Object.fromEntries(Object.entries(initial.saved).map(([k, v]) => [k, v.answer])));
  const [marked, setMarked] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.entries(initial.saved).map(([k, v]) => [k, v.marked])));
  const [visited, setVisited] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.entries(initial.saved).filter(([, v]) => v.visits > 0).map(([k]) => [k, true])));
  const startQ = () => {
    const cur = st.order[Math.min(st.currentPos, st.order.length - 1)];
    const last = initial.lastQuestion && qs.find(q => q.id === initial.lastQuestion);
    if (last && (!sectional || last.sectionIndex === cur)) return last.id;
    return (qs.find(q => !sectional || q.sectionIndex === cur) ?? qs[0]).id;
  };
  const [cur, setCur] = useState<string>(startQ);
  const [left, setLeft] = useState(initial.secondsLeft);
  const [confirm, setConfirm] = useState<'submit' | 'section' | null>(null);
  const [busy, setBusy] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [netError, setNetError] = useState(false);

  const deadline = useRef(Date.now() + initial.secondsLeft * 1000);
  const pending = useRef<Map<string, Change>>(new Map());
  const shownAt = useRef(Date.now());
  const curRef = useRef(cur);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ending = useRef(false);

  const q = qs.find(x => x.id === cur) ?? qs[0];
  const openSection = sectional ? st.order[Math.min(st.currentPos, st.order.length - 1)] : q.sectionIndex;
  const isLastSection = !sectional || st.currentPos >= st.order.length - 1;

  const queue = (id: string, patch: Omit<Change, 'questionId'>) => {
    const prev = pending.current.get(id) ?? { questionId: id };
    pending.current.set(id, { ...prev, ...patch, timeDelta: (prev.timeDelta ?? 0) + (patch.timeDelta ?? 0), visit: prev.visit || patch.visit });
  };
  /** Adds the time spent on the visible question to its pending change. */
  const tally = () => {
    const now = Date.now();
    const secs = Math.round((now - shownAt.current) / 1000);
    shownAt.current = now;
    if (secs > 0 && document.visibilityState === 'visible') queue(curRef.current, { timeDelta: secs });
  };
  const drain = () => { tally(); const c = [...pending.current.values()]; pending.current.clear(); return c; };

  const flush = useCallback(async () => {
    const changes = drain();
    if (!changes.length) return;
    try {
      const r = await fetch(`/api/attempts/${st.attemptId}/save`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ changes, current: curRef.current }) });
      const j = await r.json();
      setNetError(false);
      if (!j.ok && (j.error === 'time_up' || j.error === 'closed')) { router.replace(`/results/${st.attemptId}`); return; }
      if (typeof j.secondsLeft === 'number') deadline.current = Date.now() + j.secondsLeft * 1000;
    } catch {
      // Keep the changes and retry on the next flush.
      for (const c of changes) queue(c.questionId, { ...c, timeDelta: c.timeDelta });
      setNetError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.attemptId, router]);

  const soon = () => { if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(flush, 800); };

  const refetch = useCallback(async () => {
    const r = await fetch(`/api/attempts/${st.attemptId}/state`).then(r => r.json());
    if (r.submitted) { router.replace(`/results/${st.attemptId}`); return; }
    setSt(r);
    deadline.current = Date.now() + r.secondsLeft * 1000;
    const next = r.questions.find((x: Q) => !r.sectional || x.sectionIndex === r.order[r.currentPos]);
    if (next) go(next.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.attemptId, router]);

  const submit = useCallback(async () => {
    if (ending.current) return;
    ending.current = true;
    setBusy(true);
    const changes = drain();
    await fetch(`/api/attempts/${st.attemptId}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ changes }) }).catch(() => {});
    router.replace(`/results/${st.attemptId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.attemptId, router]);

  const nextSection = useCallback(async () => {
    setBusy(true);
    const changes = drain();
    const r = await fetch(`/api/attempts/${st.attemptId}/next-section`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ changes }) }).then(r => r.json()).catch(() => null);
    setConfirm(null);
    if (r?.submitted) { router.replace(`/results/${st.attemptId}`); return; }
    await refetch();
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.attemptId, router, refetch]);

  // Clock. The server is the authority; we resync on every save.
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0 && !ending.current) {
        if (sectional && st.currentPos < st.order.length - 1) { deadline.current = Date.now() + 60_000; nextSection(); }
        else submit();
      }
    }, 500);
    return () => clearInterval(t);
  }, [sectional, st.currentPos, st.order.length, nextSection, submit]);

  // Autosave every 10 seconds and when the tab is hidden or closed.
  useEffect(() => {
    const t = setInterval(flush, 10_000);
    const onHide = () => {
      if (document.visibilityState !== 'hidden') { shownAt.current = Date.now(); return; }
      const changes = drain();
      if (changes.length) navigator.sendBeacon(`/api/attempts/${st.attemptId}/save`, new Blob([JSON.stringify({ changes, current: curRef.current })], { type: 'application/json' }));
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onHide); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush, st.attemptId]);

  useEffect(() => { queue(cur, { visit: true }); setVisited(v => ({ ...v, [cur]: true })); /* first question */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(id: string) {
    if (id === curRef.current) return;
    tally();
    curRef.current = id;
    shownAt.current = Date.now();
    setCur(id);
    setVisited(v => ({ ...v, [id]: true }));
    queue(id, { visit: true });
    soon();
  }

  const inSection = useMemo(() => qs.filter(x => x.sectionIndex === openSection), [qs, openSection]);
  const navList = sectional ? inSection : qs;
  const idx = navList.findIndex(x => x.id === q.id);
  const goNext = () => { const n = navList[idx + 1]; if (n) go(n.id); };
  const goPrev = () => { const p = navList[idx - 1]; if (p) go(p.id); };

  const setAnswer = (id: string, a: string | null) => { setAnswers(s => ({ ...s, [id]: a })); queue(id, { answer: a }); soon(); };
  const status = (x: Q): Status => {
    const a = answers[x.id] != null && answers[x.id] !== '', m = !!marked[x.id];
    if (a && m) return fourStates ? 'm' : 'am';
    if (m) return 'm';
    if (a) return 'a';
    return visited[x.id] ? 'v' : 'n';
  };
  const scope = sectional ? inSection : qs;
  const legendDefs: [Status, string][] = fourStates
    ? [['a', 'Answered'], ['v', 'Not answered'], ['n', 'Not visited'], ['m', 'Marked for review']]
    : [['a', 'Answered'], ['v', 'Not answered'], ['n', 'Not visited'], ['m', 'Marked for review'], ['am', 'Answered & marked']];
  const legend = legendDefs.map(([k, label]) => ({ k, label, n: scope.filter(x => status(x) === k).length }));

  const saveNext = () => { if (marked[q.id]) { setMarked(m => ({ ...m, [q.id]: false })); queue(q.id, { marked: false }); } goNext(); soon(); };
  const markNext = () => { setMarked(m => ({ ...m, [q.id]: true })); queue(q.id, { marked: true }); goNext(); soon(); };
  const clear = () => setAnswer(q.id, null);

  const text = lang === 'hi' && q.textHi ? q.textHi : q.text;
  const options = (lang === 'hi' && Array.isArray(q.optionsHi) ? q.optionsHi : q.options) as { key: string; text: string }[];
  const a = answers[q.id] ?? null;
  const split = !!st.rules.split && !!q.setText;
  const qNum = qs.findIndex(x => x.id === q.id) + 1;
  const typeLabel = q.type === 'TITA' ? 'type in answer' : q.type === 'MSQ' ? 'one or more correct' : 'single correct';
  const [mc, mw] = q.marks;

  return (
    <div className="exam">
      <div className="exam-top">
        <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
          <span className="brand-mark" style={{ width: 32, height: 32, borderRadius: 9, fontSize: 12, background: '#1F3A8A' }}>De</span>
          <div className="stack" style={{ '--gap': '0' } as React.CSSProperties}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{st.test.name}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>{st.markingLabel}</span>
          </div>
        </div>
        <div className="row" style={{ gap: 14 }}>
          {netError && <span style={{ fontSize: 12, fontWeight: 800, color: 'oklch(0.8 0.15 70)' }}>Offline · answers will sync</span>}
          {st.rules.lang && <button type="button" className="btn sm" style={{ background: 'rgba(255,255,255,.14)' }} onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>{lang === 'en' ? 'English ▾ हिंदी' : 'हिंदी ▾ English'}</button>}
          {st.rules.calc && <button type="button" className="btn sm" style={{ background: 'rgba(255,255,255,.14)' }} onClick={() => setCalcOpen(o => !o)} aria-pressed={calcOpen}>Calculator</button>}
          <div className="stack" style={{ alignItems: 'flex-end', '--gap': '0' } as React.CSSProperties}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{sectional ? 'Section time left' : 'Time left'}</span>
            <span className="mono" style={{ font: '600 22px var(--mono)', color: left < 300 ? 'oklch(0.75 0.17 30)' : '#fff' }} role="timer" aria-live="off">{fmtClock(left)}</span>
          </div>
          <button type="button" className="btn sm" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.25)' }} onClick={async () => { await flush(); router.push('/tests'); }}>Exit</button>
        </div>
      </div>

      {!omr && st.sections.length > 1 && (
        <div className="exam-tabs" role="tablist">
          {st.sections.map(s => {
            const locked = sectional && s.index !== openSection;
            return (
              <button key={s.index} type="button" role="tab" aria-current={s.index === openSection} disabled={locked}
                onClick={() => { const first = qs.find(x => x.sectionIndex === s.index); if (first) go(first.id); }}>
                {s.name} <span style={{ fontWeight: 600, color: 'var(--faint)' }}>({s.count}){locked ? ' · locked' : ''}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="exam-body">
        <section className="exam-q" aria-label={`Question ${qNum}`}>
          <div className="exam-qhead">
            <span style={{ fontSize: 15, fontWeight: 800 }}>Question {qNum}</span>
            <span className="mono muted" style={{ fontSize: 12 }}>{st.sections[q.sectionIndex]?.name} · {typeLabel} · +{mc}{mw ? ` / −${mw}` : ''}</span>
          </div>
          <div className={'exam-content' + (split ? ' split' : '')}>
            {split && <div className="exam-passage pre">{q.setText}</div>}
            <div className="exam-main">
              {!split && q.setText && <div className="card pad pre" style={{ fontSize: 14, lineHeight: 1.6, background: 'var(--sunk)' }}>{q.setText}</div>}
              <div className="exam-text">{text}</div>
              {q.image && <img src={q.image} alt="Question figure" style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid var(--line)' }} />}
              {q.type === 'TITA' ? (
                <Tita value={a ?? ''} onChange={v => setAnswer(q.id, v === '' ? null : v)} />
              ) : (
                <div className="stack" role={q.type === 'MSQ' ? 'group' : 'radiogroup'} aria-label="Options">
                  {options.map(o => {
                    const sel = q.type === 'MSQ' ? (a ?? '').split('|').includes(o.key) : a === o.key;
                    const pick = () => {
                      if (q.type === 'MSQ') {
                        const set = new Set((a ?? '').split('|').filter(Boolean));
                        if (set.has(o.key)) set.delete(o.key); else set.add(o.key);
                        setAnswer(q.id, [...set].sort().join('|') || null);
                      } else setAnswer(q.id, o.key);
                    };
                    return (
                      <button key={o.key} type="button" className="opt" role={q.type === 'MSQ' ? 'checkbox' : 'radio'} aria-checked={sel} onClick={pick}>
                        <span className={'radio' + (q.type === 'MSQ' ? ' sq' : '')} />
                        <span style={{ fontSize: 15, fontWeight: 700 }}><span className="mono muted">{o.key}.</span> {o.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="exam-foot">
            {st.rules.review !== false && <button type="button" className="btn review md" onClick={markNext}>Mark for review &amp; next</button>}
            <button type="button" className="btn ghost md" onClick={clear}>Clear response</button>
            <button type="button" className="btn ghost md" onClick={goPrev} disabled={idx <= 0}>← Previous</button>
            <button type="button" className="btn ok md" style={{ marginLeft: 'auto', padding: '11px 22px' }} onClick={saveNext}>Save &amp; next</button>
          </div>
        </section>

        <aside className="exam-side" aria-label="Question palette">
          <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
            <div className="stripes" style={{ width: 52, height: 60, borderRadius: 8 }} aria-hidden />
            <div className="stack" style={{ '--gap': '0' } as React.CSSProperties}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{st.student.name}</span>
              <span className="mono muted" style={{ fontSize: 11 }}>{st.student.deId}</span>
            </div>
          </div>
          {omr ? (
            <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>OMR answer sheet</span>
              <div className="omr">
                {qs.map((x, i) => (
                  <div key={x.id} className="omr-row">
                    <b><button type="button" onClick={() => go(x.id)} style={{ all: 'unset', cursor: 'pointer', textDecoration: x.id === q.id ? 'underline' : 'none' }}>{i + 1}</button></b>
                    {(x.options as { key: string }[]).map(o => (
                      <button key={o.key} type="button" aria-pressed={answers[x.id] === o.key} aria-label={`Question ${i + 1} option ${o.key}`}
                        onClick={() => setAnswer(x.id, answers[x.id] === o.key ? null : o.key)}>{o.key}</button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="legend">
                {legend.map(l => <div key={l.k}><span className={'pal st-' + l.k}>{l.n}</span>{l.label}</div>)}
              </div>
              <div className="stack" style={{ '--gap': '10px', paddingTop: 14, borderTop: '1px solid var(--line)' } as React.CSSProperties}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{st.sections.length > 1 ? `Section: ${st.sections[openSection]?.name}` : 'Questions'}</div>
                <div className="palette">
                  {(st.sections.length > 1 ? inSection : qs).map(x => {
                    const s = status(x);
                    return (
                      <button key={x.id} type="button" className={'st-' + s} aria-current={x.id === q.id} onClick={() => go(x.id)} aria-label={`Question ${qs.indexOf(x) + 1}`}>
                        {qs.indexOf(x) + 1}{s === 'am' && <span className="dot" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          <div className="stack" style={{ marginTop: 'auto', '--gap': '8px' } as React.CSSProperties}>
            {sectional && !isLastSection && <button type="button" className="btn ghost block" onClick={() => setConfirm('section')} disabled={busy}>Submit section →</button>}
            <button type="button" className="btn strong block" style={{ padding: 13 }} onClick={() => setConfirm('submit')} disabled={busy}>{busy ? 'Submitting…' : 'Submit test'}</button>
          </div>
        </aside>
      </div>

      {confirm && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="confirm-h">
          <div className="modal">
            <div id="confirm-h" style={{ font: '800 22px var(--sans)' }}>{confirm === 'submit' ? 'Submit this test?' : `Submit ${st.sections[openSection]?.name}?`}</div>
            {confirm === 'section' && <p className="muted" style={{ margin: 0, fontSize: 14 }}>You won’t be able to come back to this section. The next section’s timer starts now.</p>}
            <div className="legend">
              {legend.map(l => <div key={l.k} style={{ justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--sunk)' }}><span>{l.label}</span><span className="mono">{l.n}</span></div>)}
            </div>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <button type="button" className="btn chip block" onClick={() => setConfirm(null)}>Keep going</button>
              <button type="button" className="btn block" disabled={busy} onClick={() => (confirm === 'submit' ? submit() : nextSection())}>{confirm === 'submit' ? 'Submit' : 'Submit section'}</button>
            </div>
          </div>
        </div>
      )}
      {calcOpen && <Calculator onClose={() => setCalcOpen(false)} />}
    </div>
  );
}

function Tita({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (k: string) => {
    if (k === '⌫') return onChange(value.slice(0, -1));
    if (k === 'C') return onChange('');
    if (k === '.' && value.includes('.')) return;
    if (k === '-' ) return onChange(value.startsWith('-') ? value.slice(1) : '-' + value);
    onChange((value + k).slice(0, 12));
  };
  return (
    <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
      <label className="sr" htmlFor="tita">Your answer</label>
      <input id="tita" className="input lg mono" style={{ maxWidth: 240 }} inputMode="decimal" value={value} placeholder="Type your answer" onChange={e => onChange(e.target.value.replace(/[^0-9.\-]/g, '').slice(0, 12))} />
      <div className="keypad" aria-label="Keypad">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '-', 'C', '⌫'].map(k => <button key={k} type="button" onClick={() => press(k)}>{k}</button>)}
      </div>
    </div>
  );
}

/** Basic four-function calculator, like the one in the CAT window. */
function Calculator({ onClose }: { onClose: () => void }) {
  const [disp, setDisp] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const num = (d: string) => { setDisp(fresh || disp === '0' ? (d === '.' ? '0.' : d) : disp.includes('.') && d === '.' ? disp : (disp + d).slice(0, 14)); setFresh(false); };
  const calc = (a: number, b: number, o: string) => (o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : b === 0 ? NaN : a / b);
  const operator = (o: string) => {
    const v = parseFloat(disp);
    if (acc != null && op && !fresh) { const r = calc(acc, v, op); setAcc(r); setDisp(String(+r.toPrecision(12))); } else setAcc(v);
    setOp(o); setFresh(true);
  };
  const equals = () => { if (acc == null || !op) return; const r = calc(acc, parseFloat(disp), op); setDisp(Number.isFinite(r) ? String(+r.toPrecision(12)) : 'Error'); setAcc(null); setOp(null); setFresh(true); };
  const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'];
  return (
    <div className="calc" role="dialog" aria-label="Calculator">
      <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 13 }}>Calculator</b><button type="button" className="icon-btn" style={{ width: 26, height: 26 }} onClick={onClose} aria-label="Close calculator">×</button></div>
      <div className="mono" style={{ textAlign: 'right', fontSize: 22, padding: '8px 10px', borderRadius: 8, background: 'var(--sunk)', overflow: 'hidden' }}>{disp}</div>
      <div className="calc-grid">
        <button type="button" onClick={() => { setDisp('0'); setAcc(null); setOp(null); setFresh(true); }} style={{ gridColumn: 'span 2' }}>C</button>
        <button type="button" onClick={() => setDisp(disp.length > 1 ? disp.slice(0, -1) : '0')} style={{ gridColumn: 'span 2' }}>⌫</button>
        {keys.map(k => <button key={k} type="button" onClick={() => (/[0-9.]/.test(k) ? num(k) : k === '=' ? equals() : operator(k))}>{k}</button>)}
      </div>
    </div>
  );
}
