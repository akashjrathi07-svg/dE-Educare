import Link from 'next/link';

export const metadata = { title: 'Privacy policy', robots: { index: true } };

const UPDATED = '20 October 2026';

/** Privacy policy for the website, portal and Android app (linked from the Play Store listing). */
export default function Privacy() {
  const H = ({ children }: { children: React.ReactNode }) => <h2 style={{ fontSize: 18, fontWeight: 800, margin: '10px 0 0' }}>{children}</h2>;
  return (
    <main className="stack" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px', '--gap': '12px', fontSize: 15, lineHeight: 1.65 } as React.CSSProperties}>
      <h1 className="h1">Privacy policy</h1>
      <p className="muted">DE EDUCARE LLP, Mumbai · Updated {UPDATED}</p>
      <p>This policy covers deeducare.com, the student portal (portal.deeducare.com) and the DE Educare Android app. They share one account: your mobile number.</p>

      <H>What we collect</H>
      <ul>
        <li><b>Account:</b> your mobile number (to send a sign-in code), and the name, email, city, target exam and year you choose to add.</li>
        <li><b>Learning data:</b> your test answers, time per question, scores, XP, streaks, study plan and saved items, so we can score tests and show your analysis.</li>
        <li><b>Guru and doubts:</b> the messages you send Guru, and photos or text of doubts you upload.</li>
        <li><b>Payments:</b> what you bought and the invoice. Card, UPI and bank details are handled by Razorpay; we never see or store them.</li>
        <li><b>Technical:</b> a sign-in cookie that keeps you logged in, and basic logs (device type, time) to keep the service secure.</li>
      </ul>

      <H>How we use it</H>
      <ul>
        <li>To run your tests, rankings, analysis, plans, live classes and Guru.</li>
        <li>To send sign-in codes and, if you enquire, to call or WhatsApp you about coaching.</li>
        <li>To improve questions and tests using anonymous, combined statistics.</li>
      </ul>
      <p>We do not sell your data or use it for third-party advertising.</p>

      <H>Who we share it with</H>
      <ul>
        <li><b>Anthropic</b> (Claude AI): your Guru messages, doubts and test results are sent to generate answers and analysis. They are not used to train AI models.</li>
        <li><b>Razorpay</b> for payments, <b>MSG91</b> for sign-in SMS, and our hosting providers (Vercel, Supabase) that store data securely.</li>
        <li>Government authorities only where the law requires it.</li>
      </ul>

      <H>How long we keep it</H>
      <p>While your account is active. If you delete your account, personal details and content are deleted immediately. Invoices are kept without your name or contact details for 8 years, as tax law requires.</p>

      <H>Your choices</H>
      <ul>
        <li>Edit your details any time in Profile.</li>
        <li>Delete your account any time at <Link href="/delete-account">portal.deeducare.com/delete-account</Link> (also in Profile).</li>
        <li>Ask us for a copy of your data or to correct it.</li>
      </ul>

      <H>Children</H>
      <p>DE Educare is meant for college students and graduates preparing for entrance exams. Students under 18 should use it with a parent’s permission.</p>

      <H>Security</H>
      <p>Data is sent over HTTPS, sign-in codes and session tokens are stored only as secure hashes, and staff access is limited by role.</p>

      <H>Contact</H>
      <p>DE EDUCARE LLP, Mumbai, India · deteam@gmail.com · +91 8830165057</p>
    </main>
  );
}
