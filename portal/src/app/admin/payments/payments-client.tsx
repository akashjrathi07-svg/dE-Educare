'use client';
import { useAction } from '../ui';
import { checkAll, checkOne, unlockAnyway } from './actions';

export function CheckAll({ n }: { n: number }) {
  const { busy, run } = useAction();
  return <button type="button" className="btn" disabled={busy || !n} onClick={() => run(checkAll)}>{busy ? 'Checking…' : 'Check all with Razorpay'}</button>;
}

/** Buttons for one unconfirmed order. */
export function OrderActions({ id, admin }: { id: string; admin: boolean }) {
  const { busy, run } = useAction();
  const unlock = () => {
    const ref = prompt('Unlock this plan without Razorpay confirming it?\nOnly if you have seen the money arrive. Payment or UTR reference (optional):');
    if (ref !== null) run(() => unlockAnyway(id, ref));
  };
  return (
    <div className="row" style={{ gap: 6 }}>
      <button type="button" className="btn chip sm" disabled={busy} onClick={() => run(() => checkOne(id))}>Check</button>
      {admin && <button type="button" className="btn ghost sm" disabled={busy} onClick={unlock}>Unlock anyway</button>}
    </div>
  );
}
