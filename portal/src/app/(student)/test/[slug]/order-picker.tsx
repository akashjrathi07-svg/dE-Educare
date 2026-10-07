'use client';
import { useState } from 'react';

/** NMAT-style: the student chooses the order of sections before starting. */
export function OrderPicker({ sections }: { sections: string[] }) {
  const [order, setOrder] = useState(sections.map((_, i) => i));
  const move = (pos: number, dir: -1 | 1) => {
    const next = [...order];
    const j = pos + dir;
    if (j < 0 || j >= next.length) return;
    [next[pos], next[j]] = [next[j], next[pos]];
    setOrder(next);
  };
  return (
    <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
      <span style={{ fontSize: 13, fontWeight: 800 }}>Choose your section order</span>
      <input type="hidden" name="order" value={order.join(',')} />
      {order.map((si, pos) => (
        <div key={si} className="row" style={{ justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, background: 'var(--sunk)', flexWrap: 'nowrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{pos + 1}. {sections[si]}</span>
          <span className="row" style={{ gap: 4 }}>
            <button type="button" className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => move(pos, -1)} aria-label={`Move ${sections[si]} up`}>↑</button>
            <button type="button" className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => move(pos, 1)} aria-label={`Move ${sections[si]} down`}>↓</button>
          </span>
        </div>
      ))}
    </div>
  );
}
