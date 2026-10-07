'use client';
import { useState, useTransition } from 'react';
import { redeem } from './actions';

export function RedeemButton({ id, need }: { id: string; need: number }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button type="button" className={need ? 'btn chip sm' : 'btn sm'} disabled={busy || need > 0}
        onClick={() => start(async () => { const r = await redeem(id); setMsg(r.message); setTimeout(() => setMsg(null), 5000); })}>
        {need ? `Need ${need.toLocaleString('en-IN')}` : busy ? 'Redeeming…' : 'Redeem'}
      </button>
      {msg && <div className="toast" role="status">{msg}</div>}
    </>
  );
}
