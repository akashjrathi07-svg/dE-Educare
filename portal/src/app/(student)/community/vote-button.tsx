'use client';
import { useOptimistic, useTransition } from 'react';
import { toggleVote } from './actions';

export function VoteButton({ id, votes, voted }: { id: string; votes: number; voted: boolean }) {
  const [s, set] = useOptimistic({ votes, voted });
  const [, start] = useTransition();
  return (
    <button type="button" className="vote" aria-pressed={s.voted} aria-label={s.voted ? 'Remove upvote' : 'Upvote'}
      onClick={() => start(async () => { set({ votes: s.votes + (s.voted ? -1 : 1), voted: !s.voted }); await toggleVote(id); })}>
      <span style={{ fontSize: 12, fontWeight: 800 }}>▲</span><span style={{ font: '800 14px var(--sans)' }}>{s.votes}</span>
    </button>
  );
}
