import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/server/auth';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (user) redirect(user.onboarded ? sp.next || '/' : '/onboarding');
  const perks = ['Same mobile number on web, portal and app', 'Purchases unlock everywhere at once', 'Scores, percentiles and streaks stay in sync', 'Guru remembers your chats across devices'];
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-side">
          <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
            <span className="eyebrow" style={{ color: '#FFC44D', fontSize: 11 }}>ONE DE EDUCARE ID</span>
            <span style={{ font: '800 30px/1.1 var(--sans)', letterSpacing: '-.03em' }}>One login for the website, the portal and the app.</span>
          </div>
          <div className="stack">
            {perks.map(p => <div key={p} className="row" style={{ fontSize: 14, fontWeight: 600, flexWrap: 'nowrap' }}><span style={{ color: '#FFC44D' }}>✓</span>{p}</div>)}
          </div>
        </div>
        <LoginForm next={sp.next ?? '/'} signup={sp.mode === 'signup'} />
      </div>
    </main>
  );
}
