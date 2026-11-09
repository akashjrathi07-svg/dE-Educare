import Link from 'next/link';

export const LEGAL_UPDATED = '9 November 2026';
export const CONTACT = 'DE EDUCARE LLP, Mumbai, Maharashtra, India · deteam@gmail.com · +91 8830165057 (9 AM – 6 PM, Mon – Fri)';

const PAGES = [['/privacy', 'Privacy policy'], ['/terms', 'Terms and conditions'], ['/shipping', 'Shipping and delivery'], ['/refunds', 'Cancellation and refunds']] as const;

export function H({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 18, fontWeight: 800, margin: '10px 0 0' }}>{children}</h2>;
}

/** Shared layout for the public policy pages (also linked from the website footer and the Play Store listing). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="stack" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px', '--gap': '12px', fontSize: 15, lineHeight: 1.65 } as React.CSSProperties}>
      <h1 className="h1">{title}</h1>
      <p className="muted">DE EDUCARE LLP, Mumbai · Updated {LEGAL_UPDATED}</p>
      {children}
      <H>Contact</H>
      <p>{CONTACT}</p>
      <nav className="row" style={{ gap: 16, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid var(--line2)', fontSize: 14 }}>
        {PAGES.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        <a href="https://deeducare.com">deeducare.com</a>
      </nav>
    </main>
  );
}
