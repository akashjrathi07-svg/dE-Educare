'use client';
import { useState } from 'react';
import { Drawer, Field, useAction } from '../ui';
import { updateStudent, type StudentUpdate } from './actions';

type Opt = { id: string; name: string };
type Row = { id: string; name: string; phone: string; deId: string; role: string; exam: string; plans: string; batchId: string | null; batch: string; pct: string; attempts: number; credits: number; last: string; joined: string };

const ini = (n: string) => n.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
const phone = (p: string) => p.replace(/^\+91(\d{5})(\d{5})$/, '$1 $2');

export function StudentsClient({ rows, exams, batches, courses, role, openId }: { rows: Row[]; exams: Opt[]; batches: Opt[]; courses: Opt[]; role: string; openId: string | null }) {
  const first = rows.find(r => r.id === openId);
  const init = (r: Row): StudentUpdate => ({ userId: r.id, exam: r.exam, grant: '', batchId: r.batchId ?? 'none', credits: 0, role: r.role });
  const [open, setOpen] = useState<Row | null>(first ?? null);
  const [form, setForm] = useState<StudentUpdate | null>(first ? init(first) : null);
  const { busy, run } = useAction();
  const canGrant = role === 'admin' || role === 'support';
  const set = (p: Partial<StudentUpdate>) => setForm(f => f && { ...f, ...p });
  const close = () => { setOpen(null); setForm(null); };

  return (
    <>
      <div className="tbl-wrap">
        <div className="tbl" style={{ '--minw': '940px', '--cols': 'minmax(0,1.4fr) 110px minmax(0,1.2fr) minmax(0,1fr) 80px 70px 90px' } as React.CSSProperties}>
          <div className="tr th"><span>Student</span><span>Exam</span><span>Plan</span><span>Batch</span><span>Avg %ile</span><span>Tests</span><span>Last active</span></div>
          {rows.length === 0 && <div className="empty">No one matches.</div>}
          {rows.map(r => (
            <button key={r.id} type="button" className="tr" onClick={() => { setOpen(r); setForm(init(r)); }}>
              <div className="row" style={{ flexWrap: 'nowrap', '--gap': '10px' } as React.CSSProperties}>
                <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{ini(r.name)}</span>
                <div className="stack" style={{ '--gap': '0' } as React.CSSProperties}><span className="t">{r.name}</span><span className="s mono">{phone(r.phone)}</span></div>
              </div>
              <span>{r.exam || '—'}</span><span className="s">{r.plans}</span><span className="s">{r.batch}</span>
              <span className="mono">{r.pct}</span><span className="mono">{r.attempts}</span><span className="s">{r.last}</span>
            </button>
          ))}
        </div>
      </div>
      {rows.length === 200 && <p className="note">Showing the newest 200. Search to find someone else.</p>}

      {open && form && (
        <Drawer title={open.name} onClose={close}
          foot={<><button type="button" className="btn ghost" onClick={close}>Cancel</button>
            <button type="button" className="btn" disabled={busy} onClick={() => run(() => updateStudent(form), r => r.ok && close())}>{busy ? 'Saving…' : 'Save'}</button></>}>
          <div className="note mono">{open.deId} · {phone(open.phone)}</div>
          <div className="grid" style={{ '--min': '110px', '--gap': '8px' } as React.CSSProperties}>
            {[['Avg %ile', open.pct], ['Tests taken', open.attempts], ['Joined', open.joined]].map(([k, v]) => (
              <div key={k} className="card" style={{ padding: 12, background: 'var(--sunk)' }}><div className="eyebrow">{k}</div><div style={{ fontSize: 18, fontWeight: 800 }}>{v}</div></div>
            ))}
          </div>
          <div className="note">Plans: <b>{open.plans}</b> · Bonus Guru coins: <b>{open.credits}</b></div>
          <Field label="Preparing for">
            <select className="input" value={form.exam} onChange={e => set({ exam: e.target.value })}>{!form.exam && <option value="">Not set</option>}{exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          </Field>
          {canGrant && (
            <Field label="Grant a plan" hint="Granting a plan unlocks it instantly on web and app">
              <select className="input" value={form.grant} onChange={e => set({ grant: e.target.value })}>
                <option value="">No change</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="none">Remove granted plans (purchases stay)</option>
              </select>
            </Field>
          )}
          <Field label="Batch">
            <select className="input" value={form.batchId} onChange={e => set({ batchId: e.target.value })}><option value="none">None</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          </Field>
          {canGrant && (
            <Field label="Add bonus Guru coins" hint="Never expire; used after the daily coins">
              <input className="input" type="number" min={0} max={1000} value={form.credits} onChange={e => set({ credits: Number(e.target.value) })} />
            </Field>
          )}
          {role === 'admin' && (
            <Field label="Role" hint="Staff roles open parts of this admin panel">
              <select className="input" value={form.role} onChange={e => set({ role: e.target.value })}>
                {[['student', 'Student'], ['faculty', 'Faculty · batches, classes'], ['content', 'Content · question bank, tests'], ['support', 'Support · students'], ['admin', 'Admin · everything']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          )}
        </Drawer>
      )}
    </>
  );
}
