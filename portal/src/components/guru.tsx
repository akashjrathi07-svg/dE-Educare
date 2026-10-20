'use client';
import { COIN_COST } from '@/lib/economy';
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
type Lesson = {
  title: string; idea: string; steps: { heading: string; body: string }[];
  example: { question: string; steps: string[]; answer: string }; traps: string[];
  check: { question: string; options: string[]; answer_index: number; why: string }; next: string[];
};

/** Speaks text in an Indian English voice when the device has one. */
function say(text: string, onEnd?: () => void) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(x => x.lang === 'en-IN') ?? voices.find(x => x.lang.startsWith('en-GB')) ?? voices.find(x => x.lang.startsWith('en'));
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'en-IN';
    u.rate = 0.98;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  } catch { onEnd?.(); }
}
type Voice = 'idle' | 'listening' | 'thinking' | 'speaking';

export function Guru({ firstName, quota }: { firstName: string; quota: { limit: number | null; used: number; credits: number } }) {
  const path = usePathname();
  const ctx = CTX.find(([p]) => (p === '/' ? path === '/' : path.startsWith(p))) ?? CTX[CTX.length - 1];
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice' | 'teach'>('chat');
  const [handsFree, setHandsFree] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(quota.limit == null ? null : Math.max(0, quota.limit - quota.used));
  const [bonus, setBonus] = useState(quota.credits);
  const [voice, setVoice] = useState<Voice>('idle');
  const [voiceQ, setVoiceQ] = useState('');
  const [voiceA, setVoiceA] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const recog = useRef<{ stop(): void } | null>(null);
  const talkRef = useRef<(() => void) | null>(null);
  const handsFreeRef = useRef(false);
  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);

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
      const hb = res.headers.get('x-guru-bonus');
      if (hb) setBonus(Number(hb));
      if (!res.ok || !res.body) {
        reply = await res.text();
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
    setVoice('speaking');
    say(text, () => { setVoice('idle'); if (handsFreeRef.current) setTimeout(() => talkRef.current?.(), 350); });
  };
  const readBubble = (i: number, text: string) => {
    if (reading === i) { window.speechSynthesis.cancel(); setReading(null); return; }
    setReading(i);
    say(text, () => setReading(r => (r === i ? null : r)));
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
  talkRef.current = talk;

  const quotaLabel = left == null ? 'Unlimited coins · AI mentor' : `${left} of ${quota.limit} coins left today${bonus ? ` · ${bonus} bonus` : ''} · ${mode === 'voice' ? `${COIN_COST.voice} coins per voice reply` : mode === 'teach' ? `${COIN_COST.teach} coins per lesson` : `${COIN_COST.chat} coin per message`}`;
  const vlabel = { idle: 'Tap to talk', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking' }[voice];

  if (!open) {
    return (
      <button type="button" className="fab" onClick={() => { setOpen(true); load(); }} aria-label="Ask Guru">
        <span className="orb" />
        <span className="fab-label"><span style={{ fontSize: 14, fontWeight: 800 }}>Ask Guru</span><span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>Chat or voice tutor · knows this page</span></span>
      </button>
    );
  }

  return (
    <aside ref={panel} className="guru" aria-label="Guru, AI mentor">
      <div className="row guru-head" style={{ gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
        <span className="orb" />
        <div className="stack" style={{ flex: 1, '--gap': '0' } as React.CSSProperties}>
          <span style={{ font: '800 17px var(--sans)', letterSpacing: '-.02em' }}>Guru</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{quotaLabel}</span>
        </div>
        <div className="seg sm">
          <button type="button" aria-pressed={mode === 'chat'} onClick={() => setMode('chat')}>Chat</button>
          <button type="button" aria-pressed={mode === 'voice'} onClick={() => setMode('voice')}>Voice</button>
          <button type="button" aria-pressed={mode === 'teach'} onClick={() => setMode('teach')}>Teach</button>
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
              <div key={i} className={'bubble' + (m.role === 'user' ? ' me' : '')}>
                {m.text || (busy && i === msgs.length - 1 ? 'Guru is thinking…' : '')}
                {m.role === 'assistant' && m.text && !(busy && i === msgs.length - 1) && (
                  <button type="button" className="bubble-say" onClick={() => readBubble(i, m.text)} aria-label={reading === i ? 'Stop reading' : 'Read aloud'} title={reading === i ? 'Stop' : 'Read aloud'}>{reading === i ? '■' : '🔊'}</button>
                )}
              </div>
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
      ) : mode === 'teach' ? (
        <Teach page={ctx[1]} onCoins={(l, b) => { setLeft(l); setBonus(b); }} onAsk={q => { setMode('chat'); load(); setDraft(q); }} />
      ) : (
        <>
          <div className="stack" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, padding: 24, textAlign: 'center' }}>
            <div className="voice-orb" style={{ width: voice === 'idle' ? 120 : 150, height: voice === 'idle' ? 120 : 150, boxShadow: `0 0 0 ${voice === 'listening' ? 24 : voice === 'speaking' ? 16 : 0}px var(--priSoft)` }} />
            <div style={{ font: '800 20px var(--sans)', letterSpacing: '-.02em' }}>{vlabel}</div>
            {voiceQ && <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>“{voiceQ}”</div>}
            {voiceA && <div style={{ fontSize: 14, lineHeight: 1.55, padding: 14, borderRadius: 14, background: 'var(--sunk)', textAlign: 'left' }}>{voiceA}</div>}
          </div>
          <div className="stack" style={{ padding: 18, borderTop: '1px solid var(--line)', '--gap': '10px' } as React.CSSProperties}>
            <label className="row" style={{ gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--muted)', justifyContent: 'center' }}>
              <input type="checkbox" checked={handsFree} onChange={e => setHandsFree(e.target.checked)} /> Hands-free: keep listening after Guru answers
            </label>
            <button type="button" className={'btn lg block' + (voice === 'speaking' ? ' danger' : '')} onClick={talk}>{voice === 'speaking' ? 'Stop' : voice === 'listening' ? 'Done talking' : vlabel}</button>
          </div>
        </>
      )}
    </aside>
  );
}

/** Teach mode: a lesson shown one step at a time, read aloud on request, with a worked example and a check question. */
function Teach({ page, onCoins, onAsk }: { page: string; onCoins: (left: number | null, bonus: number) => void; onAsk: (q: string) => void }) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'basic' | 'standard' | 'advanced'>('standard');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [shown, setShown] = useState(1);
  const [exShown, setExShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const learn = async (t: string, style: 'new' | 'simpler' | 'another' | 'deeper' = 'new') => {
    t = t.trim();
    if (!t || busy) return;
    window.speechSynthesis?.cancel(); setSpeaking(false);
    setBusy(true); setErr('');
    const res = await fetch('/api/guru/teach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic: t, level, style, page }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok || !d.lesson) { setErr(d.message ?? 'Guru is offline right now. Please try again in a minute.'); return; }
    setTopic(t); setLesson(d.lesson); setShown(1); setExShown(0); setPicked(null);
    onCoins(d.left ?? null, d.bonus ?? 0);
    top.current?.scrollTo({ top: 0 });
  };
  const readAll = () => {
    if (!lesson) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const parts = [lesson.title + '.', lesson.idea, ...lesson.steps.slice(0, shown).map(s => s.heading + '. ' + s.body)];
    setSpeaking(true);
    say(parts.join(' '), () => setSpeaking(false));
  };

  if (!lesson) {
    return (
      <div className="stack" style={{ flex: 1, padding: 20, gap: 14, overflowY: 'auto' } as React.CSSProperties}>
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <b style={{ fontSize: 18 }}>What do you want to learn?</b>
          <span className="muted" style={{ fontSize: 13 }}>Guru teaches it step by step with a worked example, common traps and a quick check. Tap 🔊 to hear it.</span>
        </div>
        <form className="stack" style={{ '--gap': '10px' } as React.CSSProperties} onSubmit={e => { e.preventDefault(); learn(topic); }}>
          <label className="sr" htmlFor="teach-in">Topic or question</label>
          <textarea id="teach-in" className="input sunk" rows={3} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Successive percentage change, Para jumbles, or paste a question you are stuck on" maxLength={300} />
          <div className="seg sm" role="group" aria-label="Level">
            {(['basic', 'standard', 'advanced'] as const).map(l => <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}>{{ basic: 'Beginner', standard: 'Know basics', advanced: 'Aiming 99' }[l]}</button>)}
          </div>
          <button className="btn lg block" disabled={busy || !topic.trim()}>{busy ? 'Preparing your lesson…' : 'Teach me'}</button>
        </form>
        {err && <div className="alert err">{err}</div>}
        <div className="chips">
          {['Time, speed and distance', 'Ratio and proportion', 'Para jumbles', 'Arrangements (DILR)', 'Syllogisms', 'Probability basics'].map(t => <button key={t} type="button" className="btn soft sm" disabled={busy} onClick={() => learn(t)}>{t}</button>)}
        </div>
        <a href="/doubts" className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Stuck on a question in a book? Snap a photo in Doubt solver →</a>
      </div>
    );
  }

  const L = lesson;
  const allSteps = shown >= L.steps.length;
  return (
    <div ref={top} className="stack teach" style={{ flex: 1, padding: 18, gap: 14, overflowY: 'auto' } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', gap: 8 }}>
        <button type="button" className="btn ghost sm" onClick={() => { window.speechSynthesis?.cancel(); setLesson(null); }}>← New topic</button>
        <button type="button" className="btn soft sm" onClick={readAll} aria-pressed={speaking}>{speaking ? '■ Stop' : '🔊 Read aloud'}</button>
      </div>
      <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
        <span className="eyebrow">Lesson</span>
        <b style={{ font: '800 20px var(--sans)', letterSpacing: '-.02em' }}>{L.title}</b>
        <div className="teach-idea">{L.idea}</div>
      </div>
      <ol className="teach-steps">
        {L.steps.slice(0, shown).map((st, i) => <li key={i}><b>{st.heading}</b><span>{st.body}</span></li>)}
      </ol>
      {!allSteps ? (
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn md" onClick={() => setShown(n => n + 1)}>Next step ({shown}/{L.steps.length})</button>
          <button type="button" className="btn ghost md" onClick={() => setShown(L.steps.length)}>Show all</button>
        </div>
      ) : (
        <>
          <div className="teach-card">
            <span className="eyebrow">Worked example</span>
            <div style={{ fontWeight: 700, lineHeight: 1.5 }}>{L.example.question}</div>
            {exShown > 0 && <ol className="teach-ex">{L.example.steps.slice(0, exShown).map((s, i) => <li key={i}>{s}</li>)}</ol>}
            {exShown < L.example.steps.length
              ? <button type="button" className="btn soft sm" onClick={() => setExShown(n => n + 1)}>{exShown ? 'Next line' : 'Solve it with me'}</button>
              : <div className="teach-ans">Answer: {L.example.answer}</div>}
          </div>
          {L.traps.length > 0 && (
            <div className="teach-card warn">
              <span className="eyebrow">Common traps</span>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, fontSize: 14 }}>{L.traps.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          <div className="teach-card">
            <span className="eyebrow">Quick check</span>
            <div style={{ fontWeight: 700, lineHeight: 1.5 }}>{L.check.question}</div>
            <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
              {L.check.options.map((o, i) => {
                const st = picked == null ? '' : i === L.check.answer_index ? ' right' : i === picked ? ' wrong' : '';
                return <button key={i} type="button" className={'teach-opt' + st} disabled={picked != null} onClick={() => setPicked(i)}><span className="mono">{'ABCD'[i] ?? i + 1}.</span> {o}</button>;
              })}
            </div>
            {picked != null && <div className={'teach-why ' + (picked === L.check.answer_index ? 'ok' : 'bad')}>{picked === L.check.answer_index ? 'Correct! ' : 'Not quite. '}{L.check.why}</div>}
          </div>
        </>
      )}
      <div className="stack" style={{ '--gap': '8px', borderTop: '1px solid var(--line)', paddingTop: 12 } as React.CSSProperties}>
        <div className="chips">
          <button type="button" className="btn soft sm" disabled={busy} onClick={() => learn(topic, 'simpler')}>Explain simpler</button>
          <button type="button" className="btn soft sm" disabled={busy} onClick={() => learn(topic, 'another')}>Another example</button>
          <button type="button" className="btn soft sm" disabled={busy} onClick={() => learn(topic, 'deeper')}>Go deeper</button>
          <button type="button" className="btn soft sm" onClick={() => onAsk(`About "${L.title}": `)}>Ask a doubt</button>
        </div>
        {L.next.length > 0 && (
          <div className="chips"><span className="muted" style={{ fontSize: 12, fontWeight: 800 }}>Learn next:</span>
            {L.next.map(n => <button key={n} type="button" className="btn ghost sm" disabled={busy} onClick={() => learn(n)}>{n}</button>)}
          </div>
        )}
        {busy && <span className="muted" style={{ fontSize: 13 }}>Preparing…</span>}
        {err && <div className="alert err">{err}</div>}
      </div>
    </div>
  );
}
