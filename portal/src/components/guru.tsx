'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/** Other components open Guru with a question: askGuru('Make a 7-day fix plan'). */
export function askGuru(text: string) {
  window.dispatchEvent(new CustomEvent('guru:ask', { detail: text }));
}

const CTX: [prefix: string, label: string, sugg: string[]][] = [
  ['/results', 'Mock result', ['Why did my weakest section go wrong?', 'Make a 7-day fix plan']],
  ['/tests', 'Test library', ['Which test should I take next?', 'Sectional or full mock this week?']],
  ['/live', 'Live classes', ['Summarise this class', 'Quiz me on TSD']],
  ['/planner', 'Study planner', ['I only have 1 hour today', 'Move DILR to the morning']],
  ['/library', 'Library', ['Which video should I watch first?']],
  ['/doubts', 'Doubt solver', ['Explain relative speed simply']],
  ['/community', 'Community', ['Help me answer the percentage question']],
  ['/profile', 'Profile & rewards', ['How do I reach the top 25?']],
  ['/plans', 'Plans', ['Which plan suits me?']],
  ['/checkout', 'Plans', ['Which plan suits me?']],
  ['/', 'Dashboard', ['What should I study today?', 'Am I on track for 99?']],
];

type Msg = { role: 'user' | 'assistant'; text: string };
type Voice = 'idle' | 'listening' | 'thinking' | 'speaking';

export function Guru({ firstName, quota }: { firstName: string; quota: { limit: number | null; used: number; credits: number } }) {
  const path = usePathname();
  const ctx = CTX.find(([p]) => (p === '/' ? path === '/' : path.startsWith(p))) ?? CTX[CTX.length - 1];
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(quota.limit == null ? null : Math.max(0, quota.limit - quota.used));
  const [voice, setVoice] = useState<Voice>('idle');
  const [voiceQ, setVoiceQ] = useState('');
  const [voiceA, setVoiceA] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const recog = useRef<{ stop(): void } | null>(null);

  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs, busy]);

  const load = useCallback(async () => {
    if (loaded) return;
    setLoaded(true);
    const r = await fetch('/api/guru').then(r => r.json()).catch(() => ({ messages: [] }));
    setMsgs(r.messages?.length ? r.messages : [{ role: 'assistant', text: `Hi ${firstName}, I'm Guru. I've read your recent tests. Ask me about any question, topic or your study plan.` }]);
  }, [loaded, firstName]);

  const ask = useCallback(async (text: string, viaVoice = false): Promise<string | null> => {
    text = text.trim();
    if (!text || busy) return null;
    setBusy(true);
    setDraft('');
    setMsgs(m => [...m, { role: 'user', text }, { role: 'assistant', text: '' }]);
    let reply = '';
    try {
      const res = await fetch('/api/guru', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, page: ctx[1], mode: viaVoice ? 'voice' : 'chat' }) });
      const h = res.headers.get('x-guru-left');
      if (h) setLeft(h === 'unlimited' ? null : Number(h));
      if (!res.ok || !res.body) {
        reply = await res.text();
        if (res.status === 429) setLeft(0);
      } else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          reply += dec.decode(value, { stream: true });
          const r = reply;
          setMsgs(m => [...m.slice(0, -1), { role: 'assistant', text: r }]);
        }
      }
    } catch {
      reply = 'Guru is offline right now. Please try again in a minute.';
    }
    setMsgs(m => [...m.slice(0, -1), { role: 'assistant', text: reply }]);
    setBusy(false);
    return reply;
  }, [busy, ctx]);

  useEffect(() => {
    const onAsk = (e: Event) => { setOpen(true); setMode('chat'); load().then(() => ask((e as CustomEvent<string>).detail)); };
    window.addEventListener('guru:ask', onAsk);
    return () => window.removeEventListener('guru:ask', onAsk);
  }, [ask, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (path.startsWith('/exam')) return null;

  const speak = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-IN';
      u.onend = () => setVoice('idle');
      window.speechSynthesis.speak(u);
      setVoice('speaking');
    } catch { setVoice('idle'); }
  };

  const talk = () => {
    if (voice === 'speaking') { window.speechSynthesis.cancel(); setVoice('idle'); return; }
    if (voice === 'listening') { recog.current?.stop(); return; }
    if (voice !== 'idle') return;
    type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void; start(): void; stop(): void };
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) { setVoiceA('Voice input is not supported in this browser. Try Chrome, or type in Chat.'); return; }
    const r = new Ctor();
    r.lang = 'en-IN';
    r.interimResults = false;
    let heard = '';
    r.onresult = e => { heard = e.results[0][0].transcript; };
    r.onerror = () => setVoice('idle');
    r.onend = async () => {
      if (!heard) { setVoice('idle'); return; }
      setVoiceQ(heard);
      setVoiceA('');
      setVoice('thinking');
      const a = await ask(heard, true);
      if (!a) { setVoice('idle'); return; }
      setVoiceA(a);
      speak(a);
    };
    recog.current = r;
    setVoiceQ('');
    setVoice('listening');
    r.start();
  };

  const quotaLabel = left == null ? 'Unlimited · AI mentor' : `${left} of ${quota.limit} free questions left today${quota.credits ? ` · ${quota.credits} credits` : ''}`;
  const vlabel = { idle: 'Tap to talk', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking' }[voice];

  if (!open) {
    return (
      <button type="button" className="fab" onClick={() => { setOpen(true); load(); }} aria-label="Ask Guru">
        <span className="orb" />
        <span className="fab-label"><span style={{ fontSize: 14, fontWeight: 800 }}>Ask Guru</span><span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>Chat or voice · knows this page</span></span>
      </button>
    );
  }

  return (
    <aside ref={panel} className="guru" aria-label="Guru, AI mentor">
      <div className="row" style={{ gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
        <span className="orb" />
        <div className="stack" style={{ flex: 1, '--gap': '0' } as React.CSSProperties}>
          <span style={{ font: '800 17px var(--sans)', letterSpacing: '-.02em' }}>Guru</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{quotaLabel}</span>
        </div>
        <div className="seg sm">
          <button type="button" aria-pressed={mode === 'chat'} onClick={() => setMode('chat')}>Chat</button>
          <button type="button" aria-pressed={mode === 'voice'} onClick={() => setMode('voice')}>Voice</button>
        </div>
        <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Minimise Guru" title="Minimise" style={{ width: 30, height: 30, fontWeight: 800 }}>×</button>
      </div>
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--line2)', fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
        Looking at: <span style={{ color: 'var(--ink)' }}>{ctx[1]}</span>
      </div>
      {mode === 'chat' ? (
        <>
          <div ref={box} className="guru-msgs" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={'bubble' + (m.role === 'user' ? ' me' : '')}>{m.text || (busy && i === msgs.length - 1 ? 'Guru is thinking…' : '')}</div>
            ))}
          </div>
          <div className="chips" style={{ padding: '0 18px 10px' }}>
            {ctx[2].map(s => <button key={s} type="button" className="btn soft sm" onClick={() => ask(s)} disabled={busy}>{s}</button>)}
          </div>
          <form className="row" style={{ padding: '12px 18px 18px', borderTop: '1px solid var(--line)', flexWrap: 'nowrap' }} onSubmit={e => { e.preventDefault(); ask(draft); }}>
            <label className="sr" htmlFor="guru-in">Ask Guru</label>
            <input id="guru-in" className="input sunk" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask Guru anything" maxLength={2000} autoComplete="off" />
            <button className="btn" disabled={busy || !draft.trim()}>Send</button>
          </form>
        </>
      ) : (
        <>
          <div className="stack" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, padding: 24, textAlign: 'center' }}>
            <div className="voice-orb" style={{ width: voice === 'idle' ? 120 : 150, height: voice === 'idle' ? 120 : 150, boxShadow: `0 0 0 ${voice === 'listening' ? 24 : voice === 'speaking' ? 16 : 0}px var(--priSoft)` }} />
            <div style={{ font: '800 20px var(--sans)', letterSpacing: '-.02em' }}>{vlabel}</div>
            {voiceQ && <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>“{voiceQ}”</div>}
            {voiceA && <div style={{ fontSize: 14, lineHeight: 1.55, padding: 14, borderRadius: 14, background: 'var(--sunk)', textAlign: 'left' }}>{voiceA}</div>}
          </div>
          <div style={{ padding: 18, borderTop: '1px solid var(--line)' }}>
            <button type="button" className={'btn lg block' + (voice === 'speaking' ? ' danger' : '')} onClick={talk}>{voice === 'speaking' ? 'Stop' : voice === 'listening' ? 'Done talking' : vlabel}</button>
          </div>
        </>
      )}
    </aside>
  );
}
