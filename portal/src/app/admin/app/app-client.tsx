'use client';
import { useState } from 'react';
import { Field, useAction, useToast } from '../ui';
import { saveAppSettings } from './actions';

export function AppSettings({ initial }: { initial: { fingerprints: string; reviewPhone: string; reviewOtp: string } }) {
  const [f, setF] = useState({ ...initial, reviewOtp: initial.reviewOtp || String(Math.floor(100000 + Math.random() * 900000)) });
  const { busy, run } = useAction();
  return (
    <div className="card pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <Field label="App SHA-256 fingerprints" hint="Paste the upload key SHA-256 (from the GitHub build summary) and, after the first Play upload, the App signing key SHA-256 (Play Console → App integrity). One per line.">
        <textarea className="input mono" rows={3} value={f.fingerprints} onChange={e => setF({ ...f, fingerprints: e.target.value })} placeholder="AB:CD:EF:…" />
      </Field>
      <div className="grid" style={{ '--min': '200px', '--gap': '12px' } as React.CSSProperties}>
        <Field label="Review login: mobile number" hint="A spare number of yours. It never receives an SMS."><input className="input" inputMode="tel" value={f.reviewPhone} onChange={e => setF({ ...f, reviewPhone: e.target.value })} placeholder="98765 43210" /></Field>
        <Field label="Review login: 6-digit code" hint="Google's reviewer types this instead of an OTP."><input className="input mono" inputMode="numeric" maxLength={6} value={f.reviewOtp} onChange={e => setF({ ...f, reviewOtp: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>
      <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => run(() => saveAppSettings(f))}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}

/** A block of text with a Copy button, for pasting into Play Console. */
export function Copy({ label, text }: { label: string; text: string }) {
  const toast = useToast();
  return (
    <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b style={{ fontSize: 13 }}>{label}</b>
        <button type="button" className="btn chip sm" onClick={() => navigator.clipboard.writeText(text).then(() => toast('Copied'), () => toast('Select the text and copy it'))}>Copy</button>
      </div>
      <div className="pre mono" style={{ fontSize: 12, padding: 12, borderRadius: 10, background: 'var(--sunk)', border: '1px solid var(--line2)', maxHeight: 220, overflowY: 'auto', userSelect: 'all' }}>{text}</div>
    </div>
  );
}
