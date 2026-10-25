'use client';
import { useActionState, useEffect, useState } from 'react';
import { loginAction, type LoginState } from './actions';

export function LoginForm({ next, signup }: { next: string; signup: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: 'phone', next });
  const otp = state.step === 'otp';
  const wa = state.channel === 'whatsapp';
  // "Get it by SMS" / "Resend" unlock 30 seconds after a code is sent (the server enforces the same wait).
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (!state.sentAt) return;
    const tick = () => setWait(Math.max(0, 30 - Math.floor((Date.now() - state.sentAt!) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [state.sentAt]);
  return (
    <form action={action} className="stack" style={{ padding: 32, '--gap': '18px' } as React.CSSProperties}>
      <input type="hidden" name="next" value={next} />
      <h1 style={{ margin: 0, font: '800 24px var(--sans)', letterSpacing: '-.02em' }}>{otp ? 'Verify your number' : signup ? 'Create your DE Educare ID' : 'Sign in'}</h1>
      {state.error && <p className="alert err" role="alert">{state.error}</p>}
      {!otp ? (
        <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <span className="muted" style={{ fontSize: 14 }}>{signup ? 'Free. Takes 20 seconds. Works on the app too.' : 'Use the number you signed up with on the app or website.'}</span>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <span className="input lg" style={{ width: 'auto', fontWeight: 800 }}>+91</span>
            <label className="sr" htmlFor="phone">Mobile number</label>
            <input id="phone" name="phone" className="input lg" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" defaultValue={state.phone?.replace('+91', '') ?? ''} required maxLength={14} autoFocus />
          </div>
          <button className="btn lg block" disabled={pending}>{pending ? 'Sending…' : 'Send OTP'}</button>
          <p className="note">We’ll send a 6-digit code on WhatsApp (or by SMS). By continuing you agree to the terms and <a href="/privacy">privacy policy</a>.</p>
        </div>
      ) : (
        <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <span className="muted" style={{ fontSize: 14 }}>
            {wa ? <>We sent a code on <b style={{ color: '#1F9D55' }}>WhatsApp</b> to {state.phone}. Open the chat from DE Educare and tap <b>Copy code</b>. If it can’t be delivered, we’ll text it to you.</> : <>Enter the 6-digit code sent by SMS to {state.phone}</>}
          </span>
          {state.devCode && <p className="alert info">Development mode: your code is <b className="mono">{state.devCode}</b></p>}
          <label className="sr" htmlFor="otp">One-time code</label>
          <input id="otp" name="otp" className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="······" required autoFocus />
          <button className="btn lg block" name="intent" value="verify" disabled={pending}>{pending ? 'Checking…' : 'Verify and continue'}</button>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button className="back" name="intent" value="change" formNoValidate>← Change number</button>
            {wa
              ? <button className="back" name="intent" value="sms" formNoValidate disabled={wait > 0}>{wait > 0 ? `No WhatsApp? SMS in ${wait}s` : 'Get the code by SMS'}</button>
              : <button className="back" name="intent" value="send" formNoValidate disabled={wait > 0}>{wait > 0 ? `Resend in ${wait}s` : 'Resend code'}</button>}
          </div>
        </div>
      )}
    </form>
  );
}
