'use client';
import { useState } from 'react';
import { Field, useAction } from '../ui';
import { saveInterface, type IfaceInput } from './actions';

const TOGGLES: [keyof IfaceInput['rules'], string, string][] = [
  ['secTimer', 'Sectional timers', 'Each section has its own clock'], ['lock', 'Lock sections', 'Can’t return to a section after moving on'],
  ['chooseOrder', 'Student picks section order', 'Like NMAT'], ['calc', 'On-screen calculator', 'Basic calculator in the header'],
  ['tita', 'TITA answers', 'Numeric keypad, no options'], ['review', 'Mark for review', 'Purple palette state'],
  ['lang', 'English / Hindi switch', 'Per-question language toggle'], ['omr', 'OMR answer sheet', 'Bubble sheet instead of a palette'], ['split', 'Split screen for sets', 'Passage left, question right'],
];
const PS = { a: 'oklch(0.55 0.15 150)', v: 'oklch(0.6 0.2 28)', n: '#E2E4EE', m: 'oklch(0.5 0.17 300)' };

export function IfaceEditor({ exam, initial, sectionNames }: { exam: { code: string; name: string }; initial: IfaceInput; sectionNames: string[] }) {
  const [f, setF] = useState(initial);
  const { busy, run } = useAction();
  const R = f.rules;
  const setR = (p: Partial<IfaceInput['rules']>) => setF(x => ({ ...x, rules: { ...x.rules, ...p } }));
  const setSec = (i: number, p: Partial<IfaceInput['sections'][number]>) => setF(x => ({ ...x, sections: x.sections.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const omr = R.omr || R.palette === 'OMR bubbles';
  const total = f.totalMinutes ?? f.sections.reduce((a, s) => a + (s.minutes ?? 0), 0);
  const timer = R.secTimer ? `${String(f.sections[0]?.minutes ?? 20).padStart(2, '0')}:00` : `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
  const seq = ['a', 'a', 'v', 'n', 'm', 'a', 'n', 'am', 'v', 'n'];
  const legend: [string, string][] = R.palette === '4 states' ? [['Answered', PS.a], ['Not answered', PS.v], ['Not visited', PS.n], ['Marked', PS.m]]
    : [['Answered', PS.a], ['Not answered', PS.v], ['Not visited', PS.n], ['Marked', PS.m], ['Answered & marked', PS.m]];

  return (
    <div className="grid" style={{ '--min': '400px', alignItems: 'start', '--gap': '16px' } as React.CSSProperties}>
      <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
        <div className="list">
          {TOGGLES.map(([k, t, d]) => (
            <div key={k} className="list-row">
              <div className="stack" style={{ flex: 1, '--gap': '0' } as React.CSSProperties}><b style={{ fontSize: 14 }}>{t}</b><span className="note">{d}</span></div>
              <button type="button" role="switch" className="toggle" aria-checked={!!R[k]} aria-label={t} onClick={() => setR({ [k]: !R[k] })} />
            </div>
          ))}
        </div>
        <div className="card pad form-grid">
          <Field label="Navigation">
            <select className="input" value={R.nav} onChange={e => setR({ nav: e.target.value })}>{['Within the current section', 'Free across sections', 'Free across main sections', 'Free'].map(o => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="Question palette">
            <select className="input" value={R.palette} onChange={e => setR({ palette: e.target.value })}>{['5 states', '4 states', 'OMR bubbles'].map(o => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="Marking" hint="Shown to students; new questions take default marks from it" span><input className="input" value={f.marking} onChange={e => setF({ ...f, marking: e.target.value })} /></Field>
          <Field label="Total minutes (common timer)"><input className="input" type="number" min={0} value={f.totalMinutes ?? ''} onChange={e => setF({ ...f, totalMinutes: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label="Note for students" span><textarea className="input" rows={2} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></Field>
        </div>
        <div className="tbl-wrap">
          <div className="tbl" style={{ '--minw': '0', '--cols': 'minmax(0,1fr) 100px 100px' } as React.CSSProperties}>
            <div className="tr th"><span>Section</span><span>Questions</span><span>Minutes</span></div>
            {f.sections.map((s, i) => (
              <div key={s.code} className="tr">
                <span className="t">{sectionNames[i]}</span>
                <input className="input" type="number" min={0} aria-label={sectionNames[i] + ' questions'} value={s.questions} onChange={e => setSec(i, { questions: Number(e.target.value) })} />
                <input className="input" type="number" min={0} aria-label={sectionNames[i] + ' minutes'} placeholder="—" value={s.minutes ?? ''} onChange={e => setSec(i, { minutes: e.target.value ? Number(e.target.value) : null })} />
              </div>
            ))}
          </div>
        </div>
        <p className="note">Calculator, palette, language, split screen, navigation and marking text apply to every {exam.name} test straight away. Section timers and question counts are used when a test is built, so tests built earlier keep their timings.</p>
        <button type="button" className="btn" style={{ alignSelf: 'flex-end' }} disabled={busy} onClick={() => run(() => saveInterface(f))}>{busy ? 'Saving…' : 'Save template'}</button>
      </div>

      <div className="stack" style={{ position: 'sticky', top: 20, '--gap': '10px' } as React.CSSProperties}>
        <span className="eyebrow">Live preview</span>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="row" style={{ background: '#10142B', color: '#fff', padding: '10px 14px', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <b style={{ fontSize: 13 }}>{exam.name} · Mock</b>
            <div className="row" style={{ '--gap': '8px', flexWrap: 'nowrap' } as React.CSSProperties}>
              {R.lang && <span className="tag" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>EN / हि</span>}
              {R.calc && <span className="tag" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>Calc</span>}
              <div className="stack" style={{ '--gap': '0', textAlign: 'right' } as React.CSSProperties}><span style={{ font: '600 8px var(--mono)', opacity: 0.7 }}>{R.secTimer ? 'SECTION TIME LEFT' : 'TIME LEFT'}</span><b className="mono">{timer}</b></div>
            </div>
          </div>
          {!omr && f.sections.length > 1 && (
            <div className="row" style={{ padding: '0 14px', borderBottom: '1px solid var(--line)', '--gap': '14px', overflowX: 'auto', flexWrap: 'nowrap' } as React.CSSProperties}>
              {sectionNames.map((n, i) => (
                <span key={n} style={{ padding: '10px 0', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', borderBottom: '2px solid ' + (i === 0 ? '#1F3A8A' : 'transparent'), color: i === 0 ? '#1F3A8A' : R.lock ? '#B9BED0' : 'var(--muted)' }}>
                  {n}{R.lock && i > 0 ? ' · locked' : ''}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: (R.split && !R.omr ? 'minmax(0,1fr) ' : '') + 'minmax(0,1.2fr) ' + (omr ? '150px' : '130px'), gap: 12, padding: 14 }}>
            {R.split && !R.omr && <div className="stripes" style={{ borderRadius: 10, minHeight: 150 }} title="Passage" />}
            <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
              <div className="stripes" style={{ height: 34, borderRadius: 8 }} />
              {R.tita ? (
                <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                  <div style={{ height: 30, borderRadius: 8, border: '1px solid var(--line)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <span key={n} style={{ height: 18, borderRadius: 4, background: 'var(--chip)' }} />)}</div>
                </div>
              ) : ['70%', '55%', '82%', '48%'].map((w, i) => <div key={i} className="row" style={{ flexWrap: 'nowrap', '--gap': '6px' } as React.CSSProperties}><span style={{ width: 14, height: 14, borderRadius: 7, border: '2px solid var(--line)' }} /><span style={{ height: 10, width: w, borderRadius: 5, background: 'var(--chip)' }} /></div>)}
              <div className="row" style={{ '--gap': '6px', marginTop: 6 } as React.CSSProperties}>
                {R.review && <span className="tag" style={{ background: PS.m, color: '#fff' }}>Mark for review</span>}
                <span className="tag solid">Save & next</span>
              </div>
            </div>
            {omr ? (
              <div className="stack" style={{ '--gap': '5px' } as React.CSSProperties}>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <div key={n} className="row" style={{ '--gap': '5px', flexWrap: 'nowrap' } as React.CSSProperties}>
                    <span className="mono" style={{ width: 14, fontSize: 10 }}>{n}</span>
                    {[0, 1, 2, 3].map(j => <span key={j} style={{ width: 14, height: 14, borderRadius: 7, border: '1.5px solid #10142B', background: (n === 2 && j === 1) || (n === 5 && j === 3) || (n === 1 && j === 2) ? '#10142B' : 'transparent' }} />)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                  {seq.map((k, i) => <span key={i} style={{ height: 22, borderRadius: 5, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, background: k === 'am' ? PS.m : PS[k as keyof typeof PS], color: k === 'n' ? '#5A5F78' : '#fff', outline: k === 'am' && R.palette !== '4 states' ? '2px solid ' + PS.a : undefined, outlineOffset: -2 }}>{i + 1}</span>)}
                </div>
                <div className="stack" style={{ '--gap': '3px' } as React.CSSProperties}>
                  {legend.map(([t, c]) => <div key={t} className="row" style={{ '--gap': '5px', fontSize: 10, fontWeight: 700, flexWrap: 'nowrap' } as React.CSSProperties}><span style={{ width: 8, height: 8, borderRadius: 2, background: c, flex: 'none' }} />{t}</div>)}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="chips">
          {[`${f.sections.length} section${f.sections.length > 1 ? 's' : ''}`, R.secTimer ? 'Sectional timers' : 'One timer', f.marking, R.nav].map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>
    </div>
  );
}
