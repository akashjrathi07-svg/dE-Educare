'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toggleHand, saveRecording } from '../actions';

type M = { id: number; text: string; by: string; host: boolean; mine: boolean };

export function Room(p: { id: string; title: string; by: string; onAir: boolean; ended: boolean; embed: string | null; link: string | null; handUp: boolean }) {
  const [msgs, setMsgs] = useState<M[]>([]);
  const [watching, setWatching] = useState(0);
  const [draft, setDraft] = useState('');
  const [hand, setHand] = useState(p.handUp);
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();
  const last = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const r = await fetch(`/api/live/${p.id}?after=${last.current}`).then(r => r.json()).catch(() => null);
      if (!alive || !r) return;
      if (r.messages?.length) { last.current = r.messages[r.messages.length - 1].id; setMsgs(m => [...m, ...r.messages]); }
      setWatching(r.watching ?? 0);
    };
    poll();
    const t = setInterval(poll, p.ended ? 30000 : 3000);
    return () => { alive = false; clearInterval(t); };
  }, [p.id, p.ended]);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2400); };
  const send = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    const r = await fetch(`/api/live/${p.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: t }) }).then(r => r.json()).catch(() => null);
    if (!r?.ok) flash(r?.error ?? 'Message not sent.');
    else { const n = await fetch(`/api/live/${p.id}?after=${last.current}`).then(r => r.json()); if (n.messages?.length) { last.current = n.messages[n.messages.length - 1].id; setMsgs(m => [...m, ...n.messages]); } }
  };

  return (
    <div className="room-grid">
      <div className="stack" style={{ '--gap': '14px', minWidth: 0 } as React.CSSProperties}>
        <div className="room-video">
          {p.embed ? <iframe src={p.embed} title={p.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            : <div className="stack" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.8)', '--gap': '12px' } as React.CSSProperties}>
                <span style={{ fontWeight: 800 }}>{p.ended ? 'The recording will appear here soon.' : p.onAir ? 'This class streams in another window.' : 'The class hasn’t started yet.'}</span>
                {p.link && !p.ended && <a href={p.link} target="_blank" rel="noopener noreferrer" className="btn white">Open class stream</a>}
              </div>}
          {p.onAir && <span className="tag live" style={{ position: 'absolute', top: 14, left: 14 }}>LIVE{watching ? ` · ${watching}` : ''}</span>}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
          <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}><div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>{p.title}</div><div className="muted" style={{ fontSize: 13 }}>{p.by}</div></div>
          <div className="row">
            {p.onAir && <button type="button" className="btn ghost md" aria-pressed={hand} onClick={() => start(async () => { const up = await toggleHand(p.id); setHand(up); if (up) flash('The teacher will see your raised hand'); })}>{hand ? 'Hand raised' : 'Raise hand'}</button>}
            <button type="button" className="btn ghost md" onClick={() => start(async () => flash(await saveRecording(p.id)))}>Save recording</button>
          </div>
        </div>
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 520, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontSize: 14, fontWeight: 800 }}>Class chat</div>
        <div ref={box} className="stack" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', '--gap': '10px' } as React.CSSProperties} aria-live="polite">
          {msgs.length ? msgs.map(m => (
            <div key={m.id} className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
              <span style={{ fontSize: 12, fontWeight: 800, color: m.host ? 'var(--live)' : m.mine ? 'var(--pri)' : 'var(--muted)' }}>{m.mine ? 'You' : m.by}</span>
              <span style={{ fontSize: 13, lineHeight: 1.4 }}>{m.text}</span>
            </div>
          )) : <span className="muted" style={{ fontSize: 13 }}>No messages yet.</span>}
        </div>
        <form className="row" style={{ padding: 12, borderTop: '1px solid var(--line)', flexWrap: 'nowrap' }} onSubmit={e => { e.preventDefault(); send(); }}>
          <label className="sr" htmlFor="chat">Message</label>
          <input id="chat" className="input sunk" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask in chat" maxLength={500} autoComplete="off" />
          <button className="btn md" disabled={!draft.trim()}>Send</button>
        </form>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
