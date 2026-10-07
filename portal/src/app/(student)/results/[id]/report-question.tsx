'use client';
import { useState, useTransition } from 'react';
import { reportQuestion } from './actions';

const REASONS = ['Wrong answer key', 'Question unclear', 'Solution wrong or missing', 'Typo or formatting', 'Other'];

export function ReportQuestion({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  if (msg) return <span className="note">{msg}</span>;
  if (!open) return <button type="button" className="link" style={{ color: 'var(--muted)', alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>Report a problem</button>;
  return (
    <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
      <select className="input" style={{ width: 'auto' }} value={reason} onChange={e => setReason(e.target.value)} aria-label="Reason">{REASONS.map(r => <option key={r}>{r}</option>)}</select>
      <input className="input" style={{ flex: '1 1 180px', width: 'auto' }} value={note} maxLength={500} placeholder="What’s wrong? (optional)" onChange={e => setNote(e.target.value)} aria-label="Details" />
      <button type="button" className="btn sm" disabled={busy} onClick={() => start(async () => setMsg((await reportQuestion(questionId, reason, note)).message))}>Send</button>
    </div>
  );
}
