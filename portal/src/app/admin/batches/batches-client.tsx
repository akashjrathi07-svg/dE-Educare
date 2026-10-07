'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Chips, Field, Head, useAction } from '../ui';
import { saveBatch } from './actions';

type Opt = { id: string; name: string };
type Batch = { id: string | null; name: string; examId: string | null; courseId: string | null; facultyId: string | null; days: string[]; time: string; start: string; capacity: number };
type Row = Batch & { id: string; exam: string; course: string; faculty: string; members: number };

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function BatchesClient({ batches, exams, courses, faculty }: { batches: Row[]; exams: Opt[]; courses: Opt[]; faculty: Opt[] }) {
  const blank = (): Batch => ({ id: null, name: '', examId: exams[0]?.id ?? null, courseId: courses[0]?.id ?? null, facultyId: faculty[0]?.id ?? null, days: ['Sat', 'Sun'], time: '10:00', start: '', capacity: 120 });
  const [form, setForm] = useState<Batch | null>(null);
  const { busy, run } = useAction();
  const set = (p: Partial<Batch>) => setForm(f => f && { ...f, ...p });
  const sel = (v: string | null, opts: Opt[], on: (v: string | null) => void, none: string) => (
    <select className="input" value={v ?? ''} onChange={e => on(e.target.value || null)}><option value="">{none}</option>{opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
  );

  return (
    <>
      <Head title="Batches" sub="Groups of students with a schedule and faculty">
        <button type="button" className="btn" onClick={() => setForm(blank())}>New batch</button>
      </Head>
      {form && (
        <div className="card pad stack" style={{ '--gap': '16px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 17 }}>{form.id ? 'Edit batch' : 'New batch'}</b><button type="button" className="btn ghost sm" onClick={() => setForm(null)}>Close</button></div>
          <div className="form-grid">
            <Field label="Batch name" req><input className="input" value={form.name} placeholder="CAT 2027 Weekend B" onChange={e => set({ name: e.target.value })} /></Field>
            <Field label="Exam">{sel(form.examId, exams, v => set({ examId: v }), 'Any exam')}</Field>
            <Field label="Linked course">{sel(form.courseId, courses, v => set({ courseId: v }), 'No course')}</Field>
            <Field label="Faculty">{sel(form.facultyId, faculty, v => set({ facultyId: v }), 'Not assigned')}</Field>
            <Field label="Days" group span><Chips options={DAYS} value={form.days} onChange={v => set({ days: v as string[] })} /></Field>
            <Field label="Class time"><input className="input" type="time" value={form.time} onChange={e => set({ time: e.target.value })} /></Field>
            <Field label="Start date"><input className="input" type="date" value={form.start} onChange={e => set({ start: e.target.value })} /></Field>
            <Field label="Capacity"><input className="input" type="number" min={1} value={form.capacity} onChange={e => set({ capacity: Number(e.target.value) })} /></Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" disabled={busy} onClick={() => run(() => saveBatch(form), r => r.ok && setForm(null))}>{busy ? 'Saving…' : form.id ? 'Save batch' : 'Create batch'}</button>
          </div>
        </div>
      )}
      {batches.length === 0 && <div className="card empty">No batches yet.</div>}
      <div className="grid" style={{ '--min': '300px' } as React.CSSProperties}>
        {batches.map(b => {
          const fill = Math.round((100 * b.members) / Math.max(1, b.capacity));
          return (
            <div key={b.id} className="card pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}><b style={{ fontSize: 16 }}>{b.name}</b><span className="note">{b.exam} · {b.course}</span></div>
                <button type="button" className="link" onClick={() => setForm({ ...b })}>Edit</button>
              </div>
              <div className="note">{b.faculty} · {b.days.join(', ') || 'No days'}{b.time ? ' · ' + b.time : ''} · {b.start ? 'Starts ' + new Date(b.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No date'}</div>
              <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, fontWeight: 800 }}><span>{b.members} / {b.capacity} students</span><span>{fill}%</span></div>
                <div className="bar"><i style={{ width: Math.min(100, fill) + '%', background: fill > 90 ? 'oklch(0.6 0.19 40)' : undefined }} /></div>
              </div>
              <div className="row">
                <Link className="btn ghost sm" href={`/admin/students?batch=${b.id}`}>Students</Link>
                <Link className="btn soft sm" href={`/admin/classes?new=1&batch=${b.id}`}>Schedule class</Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
