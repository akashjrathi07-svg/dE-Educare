'use client';
import { useState, useTransition } from 'react';
import { askGuru } from '@/components/guru';
import { generateAiAnalysis } from './actions';

export function GuruButton({ text, label, soft }: { text: string; label: string; soft?: boolean }) {
  return <button type="button" className={soft ? 'btn soft md' : 'btn'} onClick={() => askGuru(text)}>{label}</button>;
}

/** Guru's written analysis: on demand, priced by test type (see lib/economy.ts). */
export function AiAnalysis({ attemptId, text, cost }: { attemptId: string; text: string | null; cost: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const run = () => start(async () => { const r = await generateAiAnalysis(attemptId); if (!r.ok) setError(r.message); });
  return (
    <div className="card pad stack" style={{ '--gap': '8px' } as React.CSSProperties}>
      <span className="eyebrow" style={{ color: 'var(--pri)' }}>Guru AI analysis and next plan</span>
      {text ? <div className="pre" style={{ fontSize: 14, lineHeight: 1.6 }}>{text}</div> : (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted" style={{ fontSize: 14, flex: '1 1 240px' }}>{pending ? 'Guru is reading your attempt…' : 'What went well, what cost marks, a time tip and the next two tests to take.'}</span>
          <button type="button" className="btn" disabled={pending} onClick={run}>{pending ? 'Analysing…' : `Analyse · ${cost} coin${cost > 1 ? 's' : ''}`}</button>
        </div>
      )}
      {error && <div className="alert err">{error}</div>}
    </div>
  );
}
