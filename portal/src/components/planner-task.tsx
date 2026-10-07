'use client';
import { useOptimistic, useTransition } from 'react';
import { togglePlannerTask } from '@/app/(student)/planner/actions';

type Task = { id: string; title: string; meta: string | null; tag: string | null; done: boolean };

export function PlannerTask({ task, variant, locked = false }: { task: Task; variant: 'row' | 'card'; locked?: boolean }) {
  const [done, setDone] = useOptimistic(task.done);
  const [, start] = useTransition();
  const toggle = () => { if (locked) return; start(async () => { setDone(!done); await togglePlannerTask(task.id); }); };
  const box = <span className={'check' + (done ? ' on' : '')} style={variant === 'card' ? { width: 16, height: 16, borderRadius: 5, fontSize: 10 } : undefined} aria-hidden>{done ? '✓' : ''}</span>;
  if (variant === 'row') {
    return (
      <button type="button" className="list-row" onClick={toggle} aria-pressed={done} style={{ padding: '13px 16px', gap: 12 }}>
        {box}
        <span className="stack" style={{ flex: 1, '--gap': '2px', opacity: done ? 0.6 : 1 } as React.CSSProperties}>
          <span style={{ fontSize: 14, fontWeight: 700, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</span>
          <span className="muted" style={{ fontSize: 12 }}>{task.meta}</span>
        </span>
        {task.tag && <span className="tag">{task.tag}</span>}
      </button>
    );
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={done} disabled={locked} className="card" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', borderRadius: 12, opacity: done ? 0.6 : 1, cursor: locked ? 'default' : 'pointer' }}>
      <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>{task.tag && <span className="tag" style={{ fontSize: 10, padding: '3px 6px' }}>{task.tag}</span>}{box}</span>
      <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</span>
      <span className="muted" style={{ fontSize: 11 }}>{task.meta}</span>
    </button>
  );
}
