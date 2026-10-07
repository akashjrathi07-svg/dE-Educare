'use client';
import { useState, useTransition } from 'react';
import { replanWeek } from './actions';

export function ReplanButton() {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button type="button" className="btn soft" disabled={busy} onClick={() => start(async () => { await replanWeek(); setMsg('Guru rebalanced the rest of your week around your weak topics'); setTimeout(() => setMsg(null), 3000); })}>
        {busy ? 'Guru is planning…' : 'Replan my week with Guru'}
      </button>
      {msg && <div className="toast" role="status">{msg}</div>}
    </>
  );
}
