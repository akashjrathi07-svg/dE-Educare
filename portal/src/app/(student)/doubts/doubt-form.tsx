'use client';
import { useRef, useState, useTransition } from 'react';
import { solveDoubt } from './actions';

export function DoubtForm({ recent }: { recent: { id: string; q: string; a: string; t: string }[] }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    const dt = new DataTransfer();
    dt.items.add(f);
    if (fileRef.current) fileRef.current.files = dt.files;
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  return (
    <div className="grid" style={{ '--min': '320px', '--gap': '16px', alignItems: 'start' } as React.CSSProperties}>
      <form ref={formRef} className="stack" style={{ '--gap': '12px' } as React.CSSProperties}
        action={fd => start(async () => { setError(null); setAnswer(null); const r = await solveDoubt(fd); if (r.error) setError(r.error); else setAnswer(r.answer ?? ''); })}>
        <input ref={fileRef} type="file" name="image" accept="image/png,image/jpeg,image/webp" hidden onChange={e => pick(e.target.files?.[0])} />
        <button type="button" className={'dropzone' + (over ? ' over' : '')} onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}>
          {preview ? <img src={preview} alt="Your question" /> : (
            <>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--pri)' }}>Drop an image or click to upload</span>
              <span className="muted" style={{ fontSize: 13 }}>Screenshot or photo · PNG, JPG or WebP up to 5 MB</span>
            </>
          )}
        </button>
        {preview && <button type="button" className="back" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}>Remove image</button>}
        <label className="sr" htmlFor="doubt">Your doubt</label>
        <textarea id="doubt" name="text" className="input" placeholder="Add context, e.g. 'I got 24, the answer says 30. Where did I go wrong?'" maxLength={2000} style={{ minHeight: 100, padding: 14, borderRadius: 14 }} />
        {error && <p className="alert err" role="alert" style={{ margin: 0 }}>{error}</p>}
        <button className="btn lg block" disabled={busy}>{busy ? 'Guru is solving…' : 'Solve with Guru'}</button>
      </form>
      <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        {answer != null && (
          <div className="card pad stack" style={{ '--gap': '10px' } as React.CSSProperties} aria-live="polite">
            <div className="row" style={{ gap: 8 }}><span className="orb" style={{ width: 24, height: 24 }} /><b style={{ fontSize: 13, color: 'var(--priInk)' }}>Guru’s solution</b></div>
            <div className="pre" style={{ fontSize: 14, lineHeight: 1.6 }}>{answer}</div>
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 800 }}>Recent doubts</div>
        <div className="list">
          {recent.length ? recent.map(r => (
            <details key={r.id} style={{ padding: '13px 16px' }}>
              <summary className="row" style={{ justifyContent: 'space-between', cursor: 'pointer', listStyle: 'none', flexWrap: 'nowrap' }}><span style={{ fontSize: 13, fontWeight: 700 }}>{r.q}</span><span className="faint" style={{ fontSize: 11, fontWeight: 700, flex: 'none' }}>{r.t}</span></summary>
              <div className="pre muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 8 }}>{r.a}</div>
            </details>
          )) : <div className="list-row muted" style={{ fontSize: 13 }}>No doubts yet.</div>}
        </div>
      </div>
    </div>
  );
}
