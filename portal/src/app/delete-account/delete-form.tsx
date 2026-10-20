'use client';
import { useActionState } from 'react';
import { deleteMyAccount } from './actions';

export function DeleteForm() {
  const [state, action, pending] = useActionState(deleteMyAccount, { error: '' });
  return (
    <form action={action} className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
      <label className="stack" style={{ '--gap': '6px', fontSize: 14, fontWeight: 700 } as React.CSSProperties}>
        Type DELETE to confirm
        <input className="input" name="confirm" autoComplete="off" placeholder="DELETE" />
      </label>
      {state.error && <div className="alert err">{state.error}</div>}
      <button className="btn danger lg" disabled={pending}>{pending ? 'Deleting…' : 'Delete my account'}</button>
    </form>
  );
}
