'use client';
import { useRef, useState } from 'react';
import { submitReview } from './actions';

type Existing = Record<string, { rating: number; body: string; name: string; exam: string; hasPhoto: boolean }>;
const KINDS: [string, string, string][] = [
  ['tests', 'Test series', 'Mocks, sectionals, topic tests and the analysis'],
  ['classes', 'Classes', 'Live and recorded classes, mentors, books'],
  ['guru', 'Guru AI', 'Doubts, plans and voice'],
];

/** Shrinks a photo to 1000px on the long side as JPEG, so uploads stay small. */
async function shrink(file: File): Promise<File> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.82));
  return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
}

export function ReviewForm({ defaults, existing, initialKind, testsTaken }: { defaults: { name: string; exam: string }; existing: Existing; initialKind: string; testsTaken: number }) {
  const [kind, setKind] = useState(initialKind);
  const ex = existing[kind];
  const [rating, setRating] = useState(ex?.rating ?? 0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const pickKind = (k: string) => { setKind(k); setRating(existing[k]?.rating ?? 0); setMsg(null); setPhoto(null); setPreview(null); setRemovePhoto(false); };
  const onPhoto = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg({ ok: false, text: 'Please choose an image.' }); return; }
    const small = await shrink(f).catch(() => f);
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
    setRemovePhoto(false);
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('kind', kind);
    fd.set('rating', String(rating));
    if (photo) fd.set('photo', photo); else fd.delete('photo');
    if (removePhoto) fd.set('removePhoto', '1');
    setBusy(true);
    try {
      const r = await submitReview(fd);
      setMsg({ ok: r.ok, text: r.message });
    } catch {
      setMsg({ ok: false, text: 'Could not send. Please try again.' });
    } finally { setBusy(false); }
  };

  return (
    <form ref={formRef} key={kind} className="card pad stack" style={{ '--gap': '18px', maxWidth: 720 } as React.CSSProperties} onSubmit={submit}>
      {testsTaken === 0 && kind === 'tests' && <div className="note">Take a test first so your review is based on real use.</div>}
      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <span className="label">What are you reviewing?</span>
        <div className="seg-cards">
          {KINDS.map(([k, t, d]) => (
            <button key={k} type="button" className="seg-card" aria-pressed={kind === k} onClick={() => pickKind(k)}>
              <b>{t}</b><span>{d}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <span className="label" id="rate-l">Your rating</span>
        <div className="stars" role="radiogroup" aria-labelledby="rate-l">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>★</button>
          ))}
        </div>
      </div>
      <label className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <span className="label">Your review</span>
        <textarea className="input" name="body" rows={4} minLength={30} maxLength={600} required defaultValue={ex?.body ?? ''}
          placeholder="What helped you most? Mention a mock, a class or a Guru plan, and what changed in your scores." />
      </label>
      <div className="form-grid">
        <label className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <span className="label">Name to show</span>
          <input className="input" name="name" required maxLength={40} defaultValue={ex?.name ?? defaults.name} />
        </label>
        <label className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <span className="label">Exam and year</span>
          <input className="input" name="exam" maxLength={40} defaultValue={ex?.exam ?? defaults.exam} placeholder="CAT 2026" />
        </label>
      </div>
      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <span className="label">Photo of you practising on DE Educare <span className="muted">(optional)</span></span>
        <div className="row" style={{ '--gap': '12px' } as React.CSSProperties}>
          {(preview || (ex?.hasPhoto && !removePhoto)) && (
            // eslint-disable-next-line @next/next/no-img-element
            preview ? <img src={preview} alt="Your photo" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 10 }} /> : <span className="tag ok">Photo added</span>
          )}
          <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
            {preview || ex?.hasPhoto ? 'Change photo' : 'Add a photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => onPhoto(e.target.files?.[0])} />
          </label>
          {(preview || (ex?.hasPhoto && !removePhoto)) && <button type="button" className="link" onClick={() => { setPhoto(null); setPreview(null); setRemovePhoto(true); }}>Remove</button>}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>A photo of you with the portal open (laptop or phone) works best. Don’t include other people without asking them.</span>
      </div>
      <label className="row" style={{ '--gap': '10px', alignItems: 'flex-start', flexWrap: 'nowrap', fontSize: 13, fontWeight: 600 } as React.CSSProperties}>
        <input type="checkbox" name="consent" required defaultChecked={!!ex} style={{ marginTop: 2 }} />
        <span>I allow DE Educare to show this review, my name and photo on deeducare.com. I can edit or remove it any time from this page.</span>
      </label>
      {msg && <div className={'alert ' + (msg.ok ? 'ok' : 'err')} role="status">{msg.text}</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" disabled={busy || rating === 0}>{busy ? 'Sending…' : ex ? 'Update review' : 'Send review'}</button>
      </div>
    </form>
  );
}
