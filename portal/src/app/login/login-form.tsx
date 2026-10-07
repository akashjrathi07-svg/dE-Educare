'use client';
import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

export function LoginForm({ next, signup }: { next: string; signup: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: 'phone', next });
  const otp = state.step === 'otp';
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
          <p className="note">We’ll text you a 6-digit code. By continuing you agree to the terms and privacy policy.</p>
        </div>
      ) : (
        <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <span className="muted" style={{ fontSize: 14 }}>Enter the 6-digit code sent to {state.phone}</span>
          {state.devCode && <p className="alert info">Development mode: your code is <b className="mono">{state.devCode}</b></p>}
          <label className="sr" htmlFor="otp">One-time code</label>
          <input id="otp" name="otp" className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="······" required autoFocus />
          <button className="btn lg block" name="intent" value="verify" disabled={pending}>{pending ? 'Checking…' : 'Verify and continue'}</button>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button className="back" name="intent" value="change" formNoValidate>← Change number</button>
            <button className="back" name="intent" value="send" formNoValidate>Resend code</button>
          </div>
        </div>
      )}
    </form>
  );
}
