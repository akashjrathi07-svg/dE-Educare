'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Field, Status, useAction, useToast } from '../ui';
import { deleteResource, finishUpload, saveResource, uploadPart, type ResourceInput } from './actions';

type Row = ResourceInput & { id: string; parts: number; sizeMb: number | null; saves: number };
const PART = 3 * 1024 * 1024;
const MAX_MB = 30;

export function ResourcesClient({ kind, rows, exams }: { kind: 'pdf' | 'video'; rows: Row[]; exams: { code: string; name: string }[] }) {
  const blank = (): ResourceInput => ({ id: null, kind, title: '', examCode: exams[0]?.code ?? '', description: '', meta: '', url: '', pages: null, isPublic: kind === 'pdf', status: 'live', examGroup: 'mba' });
  const [form, setForm] = useState<ResourceInput | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const { busy, run } = useAction();
  const toast = useToast();
  const set = (p: Partial<ResourceInput>) => setForm(f => f && { ...f, ...p });

  const save = async () => {
    if (!form) return;
    if (file && file.size > MAX_MB * 1048576) { toast(`PDFs up to ${MAX_MB} MB, please compress it first`); return; }
    const r = await run(() => saveResource(form));
    if (!r.ok || !('id' in r) || !r.id || !file) { if (r.ok) setForm(null); return; }
    const id = r.id as string;
    const parts = Math.ceil(file.size / PART);
    try {
      for (let n = 0; n < parts; n++) {
        setProgress(Math.round((n / parts) * 100));
        const fd = new FormData();
        fd.set('id', id);
        fd.set('n', String(n));
        fd.set('part', file.slice(n * PART, (n + 1) * PART));
        const up = await uploadPart(fd);
        if (!up.ok) { toast(up.message); setProgress(null); return; }
      }
      await run(() => finishUpload(id, file.size));
      setForm(null);
      setFile(null);
    } catch {
      toast('Upload failed. Check your connection and try again.');
    } finally { setProgress(null); }
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={() => { setForm(blank()); setFile(null); }}>{kind === 'pdf' ? 'Upload a PDF' : 'Add a recording'}</button>
      </div>
      {form && (
        <div className="card pad stack" style={{ '--gap': '16px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 17 }}>{form.id ? 'Edit' : kind === 'pdf' ? 'New PDF' : 'New recording'}</b><button type="button" className="btn ghost sm" onClick={() => setForm(null)}>Close</button></div>
          <div className="form-grid">
            <Field label="Title" req span><input className="input" value={form.title} maxLength={120} placeholder="Quant formula sheet: Arithmetic" onChange={e => set({ title: e.target.value })} /></Field>
            <Field label="Exam">
              <select className="input" value={form.examCode} onChange={e => set({ examCode: e.target.value })}>
                <option value="">All exams</option>{exams.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}
              </select>
            </Field>
            <Field label="Short label" hint="Shown under the title in the app, e.g. 12 pages · Arithmetic"><input className="input" value={form.meta} maxLength={80} onChange={e => set({ meta: e.target.value })} /></Field>
            <Field label="Description" span hint="Shown on the reader and on the website"><input className="input" value={form.description} maxLength={300} onChange={e => set({ description: e.target.value })} /></Field>
            {kind === 'pdf' ? (
              <>
                <Field label={form.id ? 'Replace PDF (optional)' : 'PDF file'} req={!form.id} hint={`Up to ${MAX_MB} MB. Students can read it but there is no download button.`}>
                  <input className="input" type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </Field>
                <Field label="Pages"><input className="input" type="number" min={1} value={form.pages ?? ''} onChange={e => set({ pages: e.target.value ? Number(e.target.value) : null })} /></Field>
              </>
            ) : (
              <Field label="Video link" span hint="YouTube (unlisted), Vimeo or a class recording link"><input className="input" value={form.url} placeholder="https://" onChange={e => set({ url: e.target.value })} /></Field>
            )}
            <Field label="Status">
              <select className="input" value={form.status} onChange={e => set({ status: e.target.value as 'live' | 'draft' })}><option value="live">Live</option><option value="draft">Draft (hidden)</option></select>
            </Field>
            {kind === 'pdf' && (
              <label className="row span" style={{ '--gap': '10px', fontSize: 14, fontWeight: 700 } as React.CSSProperties}>
                <input type="checkbox" checked={form.isPublic} onChange={e => set({ isPublic: e.target.checked })} />
                List on deeducare.com → Free resources (visitors sign in free to read it)
              </label>
            )}
          </div>
          {progress !== null && <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}><span className="note">Uploading… {progress}%</span><div className="bar"><i style={{ width: progress + '%' }} /></div></div>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" disabled={busy || progress !== null || (kind === 'pdf' && !form.id && !file)} onClick={save}>{busy || progress !== null ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}
      {rows.length === 0 && <div className="card empty">Nothing yet.</div>}
      <div className="tbl-wrap">
        <div className="tbl" style={{ '--minw': '760px', '--cols': 'minmax(0,2fr) 90px 110px 80px 70px 150px' } as React.CSSProperties}>
          <div className="tr th"><span>Title</span><span>Exam</span><span>File</span><span>Website</span><span>Saves</span><span>Status</span></div>
          {rows.map(r => (
            <div key={r.id} className="tr">
              <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                <span className="t">{r.title}</span>
                <span className="s">{r.kind === 'pdf' && r.parts ? <Link href={`/library/${r.id}`} target="_blank">Open reader ↗</Link> : r.url ? <a href={r.url} target="_blank" rel="noopener">Open link ↗</a> : 'No file yet'}</span>
              </div>
              <span className="s">{r.examCode || 'All'}</span>
              <span className="s">{r.kind === 'pdf' ? (r.parts ? `${r.sizeMb ?? '?'} MB${r.pages ? ' · ' + r.pages + ' p' : ''}` : 'Missing') : 'Video'}</span>
              <span className="s">{r.isPublic ? 'Listed' : '—'}</span>
              <span className="mono">{r.saves}</span>
              <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
                <Status s={r.status === 'live' ? 'Live' : 'Draft'} />
                <button type="button" className="link" onClick={() => { setForm({ ...r }); setFile(null); }}>Edit</button>
                <button type="button" className="link" style={{ color: 'var(--bad)' }} disabled={busy} onClick={() => confirm(`Delete “${r.title}”?`) && run(() => deleteResource(r.id))}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
