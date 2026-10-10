'use client';
import { useState, useTransition } from 'react';
import { generateProgressReport } from './actions';

export function ReportButton({ cost, label }: { cost: number; label: string }) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState('');
  return (
    <div className="stack" style={{ '--gap': '8px', alignItems: 'flex-start' } as React.CSSProperties}>
      <button type="button" className="btn" disabled={busy} onClick={() => start(async () => { const r = await generateProgressReport(); setErr(r.ok ? '' : r.message); })}>
        {busy ? 'Guru is writing your report…' : `${label} · ${cost} coins`}
      </button>
      {err && <div className="alert err">{err}</div>}
    </div>
  );
}
