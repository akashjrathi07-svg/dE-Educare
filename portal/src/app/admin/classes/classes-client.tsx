'use client';
import { useState } from 'react';
import { Chips, Drawer, Field, Head, Status, useAction } from '../ui';
import { scheduleClass, updateClass } from './actions';

type Row = { id: string; title: string; batch: string; faculty: string; when: string; duration: number; status: string; link: string; recording: string; record: boolean };
type Batch = { id: string; name: string; facultyId: string | null };

export function ClassesClient({ rows, batches, faculty, startOpen, startBatch, tomorrow }: { rows: Row[]; batches: Batch[]; faculty: { id: string; name: string }[]; startOpen: boolean; startBatch: string; tomorrow: string }) {
  const blank = (batchId = batches[0]?.id ?? '') => ({
    title: '', batchId, facultyId: batches.find(b => b.id === batchId)?.facultyId ?? faculty[0]?.id ?? '', topic: '', date: tomorrow, time: '19:00', duration: 60, link: '', record: true, group: 'mba',
  });
  const [form, setForm] = useState(startOpen ? blank(startBatch || undefined) : null);
  const [edit, setEdit] = useState<Row | null>(null);
  const [link, setLink] = useState(''), [rec, setRec] = useState('');
  const { busy, run } = useAction();
  const set = (p: Partial<ReturnType<typeof blank>>) => setForm(f => f && { ...f, ...p });

  return (
    <>
      <Head title="Live classes" sub="Schedule, stream and record classes for each batch">
        <button type="button" className="btn" onClick={() => setForm(blank())}>Schedule class</button>
      </Head>
      {form && (
        <div className="card pad stack" style={{ '--gap': '16px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 17 }}>Schedule a class</b><button type="button" className="btn ghost sm" onClick={() => setForm(null)}>Close</button></div>
          <div className="form-grid">
            <Field label="Class title" req span><input className="input" value={form.title} placeholder="Geometry in 60 minutes" onChange={e => set({ title: e.target.value })} /></Field>
            <Field label="Batch">
              <select className="input" value={form.batchId} onChange={e => set({ batchId: e.target.value, facultyId: batches.find(b => b.id === e.target.value)?.facultyId ?? form.facultyId })}>
                <option value="">Open class (everyone in the exam group)</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            {!form.batchId && (
              <Field label="Exam group">
                <select className="input" value={form.group} onChange={e => set({ group: e.target.value })}>{[['mba', 'MBA'], ['upsc', 'UPSC'], ['bank', 'Bank PO'], ['ug', 'Undergrad']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </Field>
            )}
            <Field label="Faculty">
              <select className="input" value={form.facultyId} onChange={e => set({ facultyId: e.target.value })}><option value="">Not assigned</option>{faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
            </Field>
            <Field label="Topic"><input className="input" value={form.topic} placeholder="Quant · Geometry" onChange={e => set({ topic: e.target.value })} /></Field>
            <Field label="Date (IST)"><input className="input" type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
            <Field label="Start time (IST)"><input className="input" type="time" value={form.time} onChange={e => set({ time: e.target.value })} /></Field>
            <Field label="Duration (min)" group><Chips options={['45', '60', '90', '120']} value={String(form.duration)} onChange={v => set({ duration: Number(v) })} /></Field>
            <Field label="Stream link" hint="YouTube Live or Vimeo plays inside the class room; other links (Zoom) open in a new tab">
              <input className="input" value={form.link} placeholder="https://youtube.com/live/…" onChange={e => set({ link: e.target.value })} />
            </Field>
            <Field label="Recording" group span>
              <Chips options={['yes', 'no']} labels={{ yes: 'Save recording to library', no: 'Don’t record' }} value={form.record ? 'yes' : 'no'} onChange={v => set({ record: v === 'yes' })} />
            </Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" disabled={busy} onClick={() => run(() => scheduleClass(form), r => r.ok && setForm(null))}>{busy ? 'Scheduling…' : 'Schedule class'}</button>
          </div>
        </div>
      )}
      <div className="tbl-wrap">
        <div className="tbl" style={{ '--minw': '860px', '--cols': 'minmax(0,1.6fr) minmax(0,1.2fr) minmax(0,1fr) 130px 70px 100px' } as React.CSSProperties}>
          <div className="tr th"><span>Class</span><span>Batch</span><span>Faculty</span><span>When (IST)</span><span>Min</span><span>Status</span></div>
          {rows.length === 0 && <div className="empty">No classes yet.</div>}
          {rows.map(c => (
            <button key={c.id} type="button" className="tr" onClick={() => { setEdit(c); setLink(c.link); setRec(c.recording); }}>
              <span className="t">{c.title}</span><span className="s">{c.batch}</span><span className="s">{c.faculty}</span><span className="mono">{c.when}</span><span className="mono">{c.duration}</span><Status s={c.status} />
            </button>
          ))}
        </div>
      </div>

      {edit && (
        <Drawer title={edit.title} onClose={() => setEdit(null)}
          foot={edit.status === 'Scheduled' ? <button type="button" className="btn danger" disabled={busy} onClick={() => confirm('Cancel this class? Students will no longer see it.') && run(() => updateClass(edit.id, { cancel: true }), r => r.ok && setEdit(null))}>Cancel class</button> : <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Close</button>}>
          <div className="note">{edit.batch} · {edit.faculty} · {edit.when} · {edit.duration} min</div>
          <Field label="Stream link"><input className="input" value={link} placeholder="https://" onChange={e => setLink(e.target.value)} /></Field>
          <button type="button" className="btn soft md" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => run(() => updateClass(edit.id, { link }))}>Save stream link</button>
          <Field label="Recording link" hint={edit.record ? 'Saved recordings also appear in the Library' : 'This class was set to not record'}>
            <input className="input" value={rec} placeholder="https://youtube.com/watch?v=…" onChange={e => setRec(e.target.value)} />
          </Field>
          <button type="button" className="btn soft md" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => run(() => updateClass(edit.id, { recording: rec }))}>Save recording</button>
        </Drawer>
      )}
    </>
  );
}
