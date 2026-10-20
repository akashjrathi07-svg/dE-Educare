import Link from 'next/link';
import { currentUser } from '@/lib/server/auth';
import { DeleteForm } from './delete-form';

export const metadata = { title: 'Delete your account' };

/** Account deletion, linked from the app's Play Store listing and from Profile. */
export default async function DeleteAccount({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done } = await searchParams;
  const u = await currentUser().catch(() => null);
  return (
    <main className="stack" style={{ maxWidth: 620, margin: '0 auto', padding: '40px 20px', '--gap': '18px' } as React.CSSProperties}>
      <h1 className="h1">Delete your DE Educare account</h1>
      {done ? (
        <div className="alert ok">Your account has been deleted and you have been signed out. Thank you for learning with DE Educare.</div>
      ) : (
        <>
          <div className="card pad stack" style={{ '--gap': '8px', fontSize: 14, lineHeight: 1.6 } as React.CSSProperties}>
            <b>What is deleted</b>
            <span>Your name, mobile number, email and city; your Guru chats; doubts and their photos; your study planner, reminders, saved items and reviews; and any active plans.</span>
            <b>What is kept</b>
            <span>Invoices for payments you made, without your name, number or email, because tax law requires us to keep them for 8 years. Your past test scores stay only as anonymous numbers in percentile statistics.</span>
            <span className="muted">Deletion is immediate and cannot be undone. Signing up again with the same number creates a new, empty account.</span>
          </div>
          {u ? (
            u.role === 'student' ? (
              <div className="card pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
                <span style={{ fontSize: 14 }}>Signed in as <b>{u.name || u.phone}</b> · {u.de_id}</span>
                <DeleteForm />
              </div>
            ) : <div className="alert">Staff accounts are removed by an admin. Ask the DE Educare team.</div>
          ) : (
            <div className="card pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
              <span style={{ fontSize: 14 }}>Sign in with the mobile number of the account you want to delete.</span>
              <Link className="btn lg" href="/login?next=/delete-account">Sign in to delete my account</Link>
              <span className="muted" style={{ fontSize: 13 }}>Can’t sign in? WhatsApp or call +91 8830165057 from the registered number, or email deteam@gmail.com, and we will delete it within 7 days.</span>
            </div>
          )}
        </>
      )}
      <Link href="/privacy" className="muted" style={{ fontSize: 13 }}>Privacy policy</Link>
    </main>
  );
}
