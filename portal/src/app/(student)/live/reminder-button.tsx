'use client';
import { useOptimistic, useTransition } from 'react';
import { toggleReminder } from './actions';

export function ReminderButton({ id, on }: { id: string; on: boolean }) {
  const [state, set] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <button type="button" className={state ? 'btn sm' : 'btn chip sm'} style={state ? { background: 'var(--ok-bg)', color: 'var(--ok-ink)' } : undefined}
      aria-pressed={state} onClick={() => start(async () => { set(!state); await toggleReminder(id); })}>
      {state ? 'Reminder set' : 'Remind me'}
    </button>
  );
}
