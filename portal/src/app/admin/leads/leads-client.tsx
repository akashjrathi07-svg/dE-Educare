'use client';
import { useState } from 'react';
import { useAction } from '../ui';
import { setContacted } from './actions';

/** Contacted tick with a short note, for one lead. */
export function LeadStatus({ id, contacted, note }: { id: string; contacted: boolean; note: string }) {
  const [text, setText] = useState(note);
  const { busy, run } = useAction();
  return (
    <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
      <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Note (optional)" maxLength={500} style={{ fontSize: 13, padding: '8px 10px' }} />
      <button type="button" className={'btn sm ' + (contacted ? 'ghost' : '')} disabled={busy} onClick={() => run(() => setContacted(id, !contacted, text))}>
        {contacted ? 'Move back to new' : 'Mark contacted'}
      </button>
    </div>
  );
}
