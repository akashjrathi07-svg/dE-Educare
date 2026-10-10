'use client';
import { useState, useTransition } from 'react';
import { convertXp, redeem } from './actions';

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

/** Turns XP into bonus coins (100 XP = 1 coin). */
export function ConvertXp({ balance }: { balance: number }) {
  const max = Math.floor(balance / 100);
  const [n, setN] = useState(Math.min(10, max));
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
      <input className="input" type="number" min={1} max={Math.max(1, max)} value={n} onChange={e => setN(Math.max(1, Math.round(Number(e.target.value) || 1)))} style={{ width: 90 }} aria-label="Coins to get" />
      <button type="button" className="btn sm" disabled={busy || max < 1 || n > max}
        onClick={() => start(async () => { const r = await convertXp(n); setMsg(r.message); setTimeout(() => setMsg(null), 5000); })}>
        {max < 1 ? 'Need 100 XP' : busy ? 'Converting…' : `Get ${n} coin${n > 1 ? 's' : ''} for ${(n * 100).toLocaleString('en-IN')} XP`}
      </button>
      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  );
}
