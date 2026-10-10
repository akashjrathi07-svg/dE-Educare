'use client';
import { useState } from 'react';
import { useAction } from '../ui';
import { editReview, removeReviewPhoto, setReviewStatus } from './actions';

type R = { id: string; kind: string; rating: number; body: string; name: string; exam: string; status: string; hasPhoto: boolean; who: string; tests: number; date: string };
const KIND: Record<string, string> = { tests: 'Test series', classes: 'Classes', guru: 'Guru AI' };

export function ReviewCard({ r }: { r: R }) {
  const { busy, run } = useAction();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(r.name);
  const [exam, setExam] = useState(r.exam);
  return (
    <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {r.hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/public/reviews/${r.id}/photo?admin=1`} alt="" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }} />
      )}
      <div className="stack" style={{ '--gap': '10px', flex: 1, padding: 18 } as React.CSSProperties}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span style={{ color: '#F2A900', letterSpacing: 1 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
          <span className="tag">{KIND[r.kind]}</span>
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{r.body}</p>
        {edit ? (
          <div className="row">
            <input className="input" style={{ flex: '1 1 120px', width: 'auto' }} value={name} onChange={e => setName(e.target.value)} aria-label="Name shown" />
            <input className="input" style={{ flex: '1 1 100px', width: 'auto' }} value={exam} onChange={e => setExam(e.target.value)} aria-label="Exam shown" />
            <button type="button" className="btn sm" disabled={busy} onClick={() => run(() => editReview(r.id, name, exam), x => x.ok && setEdit(false))}>Save</button>
          </div>
        ) : (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b style={{ fontSize: 13 }}>{r.name}{r.exam ? ' · ' + r.exam : ''}</b>
            <button type="button" className="link" onClick={() => setEdit(true)}>Edit name</button>
          </div>
        )}
        <div className="note">{r.who} · {r.tests} tests taken · {r.date}</div>
        <div className="row" style={{ marginTop: 'auto' }}>
          {r.status !== 'approved' && <button type="button" className="btn sm" disabled={busy} onClick={() => run(() => setReviewStatus(r.id, 'approved'))}>Approve</button>}
          {r.status !== 'rejected' && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => run(() => setReviewStatus(r.id, 'rejected'))}>Hide</button>}
          {r.status !== 'pending' && <button type="button" className="btn soft sm" disabled={busy} onClick={() => run(() => setReviewStatus(r.id, 'pending'))}>Back to pending</button>}
          {r.hasPhoto && <button type="button" className="link" disabled={busy} onClick={() => run(() => removeReviewPhoto(r.id))}>Remove photo</button>}
        </div>
      </div>
    </div>
  );
}
