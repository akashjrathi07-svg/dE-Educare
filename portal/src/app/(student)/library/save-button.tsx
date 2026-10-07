'use client';
import { useOptimistic, useTransition } from 'react';
import { toggleSaved } from './actions';

export function SaveButton({ id, saved }: { id: string; saved: boolean }) {
  const [on, set] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button type="button" className="btn sm" aria-pressed={on} style={{ flex: 1, background: on ? 'var(--ok-bg)' : 'var(--priSoft)', color: on ? 'var(--ok-ink)' : 'var(--priInk)' }}
      onClick={() => start(async () => { set(!on); await toggleSaved(id); })}>
      {on ? 'Saved offline' : 'Save offline'}
    </button>
  );
}
