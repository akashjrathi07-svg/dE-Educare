'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Chips, Field, Status, useAction } from '../ui';
import { createTest, setTestStatus, type TestInput } from './actions';

type Sec = { code: string; name: string; questions: number; minutes: number | null; topics: string[] };
type Exam = { code: string; name: string; plus: number; rules: Record<string, unknown>; marking: string; totalMinutes: number | null; sections: Sec[] };

const TYPES = { full_mock: 'Full mock', sectional: 'Sectional', topic: 'Topic test', daily: 'Daily free', pyq: 'Previous paper' };
const DIFFS = ['easy', 'medium', 'hard'] as const;

function plan(exam: Exam, type: TestInput['type'], secCode: string) {
  const sec = exam.sections.find(s => s.code === secCode) ?? exam.sections[0];
  const allQ = exam.sections.reduce((a, s) => a + s.questions, 0);
  if (type === 'sectional') return { secs: [{ code: sec.code, count: sec.questions }], minutes: sec.minutes ?? Math.round(((exam.totalMinutes ?? 60) * sec.questions) / Math.max(1, allQ)) };
  if (type === 'topic') return { secs: [{ code: sec.code, count: 10 }], minutes: 15 };
  if (type === 'daily') {
    // 5 questions spread across up to 5 sections.
    const n = Math.min(5, exam.sections.length);
    return { secs: exam.sections.slice(0, n).map((s, i) => ({ code: s.code, count: Math.floor(5 / n) + (i < 5 % n ? 1 : 0) })), minutes: 10 };
  }
  return { secs: exam.sections.map(s => ({ code: s.code, count: s.questions })), minutes: exam.totalMinutes ?? (exam.sections.reduce((a, s) => a + (s.minutes ?? 0), 0) || 60) };
}

export function Builder({ exams, courses, nodes, pool, closeHref }: { exams: Exam[]; courses: { id: string; name: string; exam: string | null }[]; nodes: { id: string; path: string; exam: string }[]; pool: Record<string, number>; closeHref: string }) {
  const first = exams[0];
  const init = (examCode: string, type: TestInput['type'], sec = '', prev?: TestInput): TestInput => {
    const exam = exams.find(e => e.code === examCode) ?? first;
    const s = exam.sections.find(x => x.code === sec) ?? exam.sections[0];
    const p = plan(exam, type, s.code);
    return {
      name: prev?.name ?? '', type, exam: exam.code, sections: p.secs.map(x => ({ ...x, ids: '' })), topic: type === 'topic' ? (s.topics[0] ?? '') : '', mode: prev?.mode ?? 'auto',
      easy: prev?.easy ?? 30, medium: prev?.medium ?? 50, hard: prev?.hard ?? 20, minutes: p.minutes, free: type === 'daily' || type === 'pyq' ? true : prev?.free ?? false,
      courses: exam.code === prev?.exam ? prev.courses : [], solutions: prev?.solutions ?? 'after_submit', windowEnd: prev?.windowEnd ?? '', ranking: prev?.ranking ?? 'all_india',
      publish: prev?.publish ?? 'now', date: prev?.date ?? '', time: prev?.time ?? '09:00', nodeId: exam.code === prev?.exam ? prev.nodeId : '',
    };
  };
  const [f, setF] = useState<TestInput>(() => init(first.code, 'full_mock'));
  const router = useRouter();
  const { busy, run } = useAction();
  const set = (p: Partial<TestInput>) => setF(x => ({ ...x, ...p }));
  const exam = exams.find(e => e.code === f.exam) ?? first;
  const r = exam.rules as Record<string, string | boolean>;
  const one = f.type === 'sectional' || f.type === 'topic';
  const secCode = f.sections[0]?.code ?? exam.sections[0].code;
  const totQ = f.sections.reduce((a, s) => a + (s.count || 0), 0);
  const avail = (code: string) => f.type === 'topic' ? pool[`${exam.code}|${code}|t:${f.topic}`] ?? 0 : DIFFS.reduce((a, d) => a + (pool[`${exam.code}|${code}|${d}`] ?? 0), 0);
  const pctOk = Math.round(f.easy + f.medium + f.hard) === 100;
  const label = f.publish === 'draft' ? 'Save draft' : f.publish === 'schedule' ? 'Schedule test' : 'Publish test';

  return (
    <div className="grid" style={{ '--min': '420px', alignItems: 'start', '--gap': '16px' } as React.CSSProperties}>
      <div className="card pad stack" style={{ '--gap': '16px' } as React.CSSProperties}>
        <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 17 }}>New test</b><Link className="btn ghost sm" href={closeHref}>Close</Link></div>
        <div className="form-grid">
          <Field label="Test name" req span><input className="input" value={f.name} placeholder="CAT Mock 11" onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="Test type" group span><Chips options={Object.keys(TYPES) as TestInput['type'][]} labels={TYPES} value={f.type} onChange={v => setF(init(f.exam, v as TestInput['type'], secCode, f))} /></Field>
          <Field label="Exam interface" hint="Sets sections, timers and marking">
            <select className="input" value={f.exam} onChange={e => setF(init(e.target.value, f.type, '', f))}>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}</select>
          </Field>
          {one && (
            <Field label="Section">
              <select className="input" value={secCode} onChange={e => setF(init(f.exam, f.type, e.target.value, f))}>{exam.sections.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
            </Field>
          )}
          {f.type === 'topic' && (
            <Field label="Topic" req>
              <select className="input" value={f.topic} onChange={e => set({ topic: e.target.value })}>{(exam.sections.find(s => s.code === secCode)?.topics ?? []).map(t => <option key={t}>{t}</option>)}</select>
            </Field>
          )}
          <Field label="Question selection" group><Chips options={['auto', 'manual']} labels={{ auto: 'Auto blueprint', manual: 'Pick manually' }} value={f.mode} onChange={v => set({ mode: v as 'auto' | 'manual' })} /></Field>
          {f.mode === 'auto' && DIFFS.map(d => (
            <Field key={d} label={d[0].toUpperCase() + d.slice(1) + ' %'} hint={d === 'hard' ? (pctOk ? 'Adds up to 100%' : 'Should add up to 100%') : undefined}>
              <input className="input" type="number" min={0} max={100} value={f[d]} onChange={e => set({ [d]: Number(e.target.value) })} />
            </Field>
          ))}
          <Field label="Duration (min)" hint={r.secTimer && !one && f.type !== 'daily' ? 'Sections keep their own timers' : undefined}><input className="input" type="number" min={1} value={f.minutes} onChange={e => set({ minutes: Number(e.target.value) })} /></Field>
        </div>

        <div className="list">
          {f.sections.map((s, i) => {
            const sec = exam.sections.find(x => x.code === s.code)!;
            const av = avail(s.code);
            const upd = (p: Partial<typeof s>) => set({ sections: f.sections.map((x, j) => (j === i ? { ...x, ...p } : x)) });
            return (
              <div key={s.code} className="list-row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div className="stack" style={{ flex: '1 1 200px', '--gap': '2px' } as React.CSSProperties}>
                  <b style={{ fontSize: 14 }}>{sec.name}{f.type === 'topic' ? ' · ' + f.topic : ''}</b>
                  <span style={{ fontSize: 12, fontWeight: 700, color: f.mode === 'auto' && av < s.count ? 'var(--bad)' : 'var(--ok)' }}>
                    {f.mode === 'auto' ? `${av} live questions match${av < s.count ? ' · not enough' : ''}` : `List ${s.count} question IDs`}
                  </span>
                </div>
                <label className="row" style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Questions
                  <input className="input" type="number" min={0} style={{ width: 80 }} value={s.count} onChange={e => upd({ count: Number(e.target.value) })} />
                </label>
                {f.mode === 'manual' && <textarea className="input" rows={2} style={{ flexBasis: '100%' }} placeholder="Q1001, Q1002, …" value={s.ids} onChange={e => upd({ ids: e.target.value })} />}
              </div>
            );
          })}
        </div>

        <div className="form-grid">
          <Field label="Who can take it" group span hint="Free tests are open to everyone; otherwise the selected plans unlock it">
            <div className="chips">
              <button type="button" className="chip" aria-pressed={f.free} onClick={() => set({ free: !f.free })}>Free</button>
              {courses.filter(c => !c.exam || c.exam === f.exam).map(c => (
                <button key={c.id} type="button" className="chip" aria-pressed={f.courses.includes(c.id)}
                  onClick={() => set({ courses: f.courses.includes(c.id) ? f.courses.filter(x => x !== c.id) : [...f.courses, c.id] })}>{c.name}</button>
              ))}
            </div>
          </Field>
          <Field label="Show on the Tests screen under" span>
            <select className="input" value={f.nodeId} onChange={e => set({ nodeId: e.target.value })}>
              <option value="">Not listed (direct link only)</option>{nodes.filter(n => n.exam === f.exam).map(n => <option key={n.id} value={n.id}>{n.path}</option>)}
            </select>
          </Field>
          <Field label="Show solutions" group><Chips options={['after_submit', 'after_window']} labels={{ after_submit: 'Right after submit', after_window: 'After the test window closes' }} value={f.solutions} onChange={v => set({ solutions: v as TestInput['solutions'] })} /></Field>
          {f.solutions === 'after_window' && <Field label="Window closes on"><input className="input" type="date" value={f.windowEnd} onChange={e => set({ windowEnd: e.target.value })} /></Field>}
          <Field label="Ranking" group><Chips options={['all_india', 'batch', 'none']} labels={{ all_india: 'All-India percentile', batch: 'Batch rank only', none: 'No ranking' }} value={f.ranking} onChange={v => set({ ranking: v as TestInput['ranking'] })} /></Field>
          <Field label="Publish" group><Chips options={['now', 'schedule', 'draft']} labels={{ now: 'Publish now', schedule: 'Schedule', draft: 'Save as draft' }} value={f.publish} onChange={v => set({ publish: v as TestInput['publish'] })} /></Field>
          {f.publish === 'schedule' && <>
            <Field label="Go-live date"><input className="input" type="date" value={f.date} onChange={e => set({ date: e.target.value })} /></Field>
            <Field label="Time (IST)"><input className="input" type="time" value={f.time} onChange={e => set({ time: e.target.value })} /></Field>
          </>}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" disabled={busy} onClick={() => run(() => createTest(f), res => res.ok && router.push(closeHref))}>{busy ? 'Building…' : label}</button>
        </div>
      </div>

      <div className="dark-panel stack" style={{ position: 'sticky', top: 20, '--gap': '14px' } as React.CSSProperties}>
        <span className="eyebrow" style={{ color: '#FFC44D' }}>Summary</span>
        <b style={{ fontSize: 20 }}>{f.name || 'Untitled test'}</b>
        <div className="grid" style={{ '--min': '80px', '--gap': '8px' } as React.CSSProperties}>
          {[['Questions', totQ], ['Minutes', f.minutes], ['Max marks', +(totQ * exam.plus).toFixed(1)]].map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: 12 }}><div style={{ font: '800 24px var(--sans)' }}>{v}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>{k}</div></div>
          ))}
        </div>
        <div className="stack" style={{ '--gap': '6px', fontSize: 13 } as React.CSSProperties}>
          {[['Timer', r.secTimer ? 'Sectional' : 'One common timer'], ['Navigation', String(r.nav ?? '—')], ['Marking', exam.marking || '—'], ['Calculator', r.calc ? 'On' : 'Off'], ['Palette', String(r.palette ?? '—')], ['Language', r.lang ? 'English / Hindi' : 'English']].map(([k, v]) => (
            <div key={k} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><span style={{ color: 'rgba(255,255,255,.6)' }}>{k}</span><b style={{ textAlign: 'right' }}>{v}</b></div>
          ))}
        </div>
        <Link href={`/admin/interfaces?exam=${encodeURIComponent(exam.code)}`} style={{ color: '#AFC0FF', fontSize: 13, fontWeight: 800 }}>Edit the {exam.name} interface →</Link>
      </div>
    </div>
  );
}

export function StatusMenu({ id, status, when }: { id: string; status: string; when: string }) {
  const { busy, run } = useAction();
  const label = status === 'scheduled' ? 'Scheduled' : status === 'live' ? 'Live' : status === 'draft' ? 'Draft' : 'Archived';
  return (
    <div className="row" style={{ '--gap': '6px', flexWrap: 'nowrap' } as React.CSSProperties}>
      <Status s={label} />
      <select className="input" style={{ width: 28, padding: '4px', fontSize: 11 }} aria-label="Change status" title={when ? 'Goes live ' + when : 'Change status'} value="" disabled={busy}
        onChange={e => e.target.value && run(() => setTestStatus(id, e.target.value as 'live' | 'draft' | 'archived'))}>
        <option value="">⋯</option>
        {status !== 'live' && <option value="live">Publish now</option>}
        {status !== 'draft' && <option value="draft">Move to draft</option>}
        {status !== 'archived' && <option value="archived">Archive</option>}
      </select>
    </div>
  );
}
