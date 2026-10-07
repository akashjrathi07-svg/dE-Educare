'use client';
import { useEffect, useTransition } from 'react';
import { askGuru } from '@/components/guru';
import { generateAiAnalysis } from './actions';

export function GuruButton({ text, label, soft }: { text: string; label: string; soft?: boolean }) {
  return <button type="button" className={soft ? 'btn soft md' : 'btn'} onClick={() => askGuru(text)}>{label}</button>;
}

/** Generates Guru's written analysis once, right after the result opens. */
export function AiAnalysis({ attemptId, text }: { attemptId: string; text: string | null }) {
  const [pending, start] = useTransition();
  useEffect(() => { if (!text) start(() => generateAiAnalysis(attemptId)); }, [attemptId, text]);
  return (
    <div className="card pad stack" style={{ '--gap': '8px' } as React.CSSProperties}>
      <span className="eyebrow" style={{ color: 'var(--pri)' }}>Guru AI analysis</span>
      {text ? <div className="pre" style={{ fontSize: 14, lineHeight: 1.6 }}>{text}</div>
        : <div className="muted" style={{ fontSize: 14 }}>{pending ? 'Guru is reading your attempt…' : 'Preparing your analysis…'}</div>}
    </div>
  );
}
