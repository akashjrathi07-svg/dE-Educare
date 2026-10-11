'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Chips, Drawer, Field, useAction } from '../ui';
import { enrol, enrolMany, updateStudent, type StudentUpdate } from './actions';

type Opt = { id: string; name: string };
type Course = Opt & { price: number };
type Batch = Opt & { courseId?: string | null };
const PAY = { upi: 'UPI', cash: 'Cash', bank: 'Bank transfer', cheque: 'Cheque', card: 'Card (POS)', emi: 'EMI', free: 'Free / scholarship' } as const;
type Row = { id: string; name: string; phone: string; deId: string; role: string; exam: string; plans: string; batchId: string | null; batch: string; pct: string; attempts: number; credits: number; last: string; joined: string };

const ini = (n: string) => n.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
const phone = (p: string) => p.replace(/^\+91(\d{5})(\d{5})$/, '$1 $2');

export function StudentsClient({ rows, exams, batches, courses, role, openId, enrolOpen }: { rows: Row[]; exams: Opt[]; batches: Batch[]; courses: Course[]; role: string; openId: string | null; enrolOpen: boolean }) {
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
      {enrolOpen && canGrant && <EnrolDrawer courses={courses} batches={batches} />}
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

/** Enrol one student or a list (offline admissions, payments taken outside the website). */
function EnrolDrawer({ courses, batches }: { courses: Course[]; batches: Batch[] }) {
  const router = useRouter();
  const close = () => router.push('/admin/students');
  const [many, setMany] = useState(false);
  const [f, setF] = useState({ phone: '', name: '', lines: '', courseId: '', batchId: '', pay: 'upi' as keyof typeof PAY, amount: '', reference: '', note: '' });
  const { busy, run } = useAction();
  const set = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }));
  const course = courses.find(c => c.id === f.courseId);
  const courseBatches = batches.filter(b => b.courseId === f.courseId);
  const common = { courseId: f.courseId, batchId: f.batchId, pay: f.pay, amount: Number(f.amount) || 0, reference: f.reference, note: f.note };
  const submit = () => run(() => (many ? enrolMany(f.lines, common) : enrol({ ...common, phone: f.phone, name: f.name })), r => {
    if (!r.ok) return;
    if (many) close();
    else { set({ phone: '', name: '', reference: '', note: '' }); router.refresh(); }
  });
  return (
    <Drawer title="Enrol students" onClose={close}
      foot={<><button type="button" className="btn ghost" onClick={close}>Done</button>
        <button type="button" className="btn" disabled={busy || !f.courseId || (many ? !f.lines.trim() : !f.phone.trim())} onClick={submit}>{busy ? 'Enrolling…' : many ? 'Enrol everyone' : 'Enrol student'}</button></>}>
      <div className="note">For admissions at the centre or payments taken outside the website. Online purchases unlock on their own, and coaching buyers join the course&apos;s open batch automatically.</div>
      <Chips options={['one', 'many']} labels={{ one: 'One student', many: 'A list' }} value={many ? 'many' : 'one'} onChange={v => setMany(v === 'many')} />
      {many ? (
        <Field label="Students" hint="One per line: mobile, name (and amount if it differs). You can paste two columns from Excel.">
          <textarea className="input mono" rows={7} value={f.lines} placeholder={'9876543210, Riya Sharma\n9123456780, Aman Verma, 20000'} onChange={e => set({ lines: e.target.value })} />
        </Field>
      ) : <>
        <Field label="Mobile number" req hint="Their DE Educare ID. New numbers get an account; they sign in with this number."><input className="input" inputMode="tel" value={f.phone} placeholder="98765 43210" onChange={e => set({ phone: e.target.value })} /></Field>
        <Field label="Name"><input className="input" value={f.name} onChange={e => set({ name: e.target.value })} /></Field>
      </>}
      <Field label="Course" req>
        <select className="input" value={f.courseId} onChange={e => { const c = courses.find(x => x.id === e.target.value); set({ courseId: e.target.value, batchId: '', amount: c && c.price ? String(c.price) : '' }); }}>
          <option value="">Pick a course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}{c.price ? ` · ₹${c.price.toLocaleString('en-IN')}` : ''}</option>)}
        </select>
      </Field>
      <Field label="Batch" hint={course && !courseBatches.length ? 'This course has no batches yet (Admin → Batches)' : undefined}>
        <select className="input" value={f.batchId} onChange={e => set({ batchId: e.target.value })}>
          <option value="">{courseBatches.length ? 'Automatic: the newest batch with seats' : 'None'}</option>
          {courseBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          <option value="none">No batch</option>
          {batches.filter(b => b.courseId !== f.courseId).map(b => <option key={b.id} value={b.id}>{b.name} (other course)</option>)}
        </select>
      </Field>
      <Field label="Paid by" group>
        <Chips options={Object.keys(PAY) as (keyof typeof PAY)[]} labels={PAY} value={f.pay} onChange={v => set({ pay: v as keyof typeof PAY })} />
      </Field>
      {f.pay !== 'free' && <>
        <Field label="Amount paid (₹)" req hint={f.pay === 'emi' ? 'Amount received so far' : undefined}><input className="input" type="number" min={1} value={f.amount} onChange={e => set({ amount: e.target.value })} /></Field>
        <Field label="Receipt or transaction no."><input className="input" value={f.reference} placeholder="UTR / receipt no." onChange={e => set({ reference: e.target.value })} /></Field>
      </>}
      <Field label="Note"><input className="input" value={f.note} placeholder="e.g. EMI 1 of 3, scholarship 50%" onChange={e => set({ note: e.target.value })} /></Field>
    </Drawer>
  );
}
