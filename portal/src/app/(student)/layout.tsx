import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { shellData } from '@/lib/server/shell';
import { Sidebar } from '@/components/sidebar';
import { Guru } from '@/components/guru';
import { syncUnpaidOrders } from '@/lib/server/payments';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  // Paid but the browser never confirmed? Ask Razorpay, so access starts without waiting for support.
  await syncUnpaidOrders(u.id).catch(() => 0);
  const s = await shellData(u);
  return (
    <div className="shell">
      <Sidebar data={s} />
      <main className="main">
        {['admin', 'content', 'faculty', 'support'].includes(u.role) && (
          <Link href="/admin" className="staff-bar">
            <span><b>Staff access</b> · You’re signed in as {({ admin: 'Super admin', content: 'Content team', faculty: 'Faculty', support: 'Support' } as Record<string, string>)[u.role]}</span>
            <span className="staff-bar__go">Open admin panel →</span>
          </Link>
        )}
        <div className="page">{children}</div>
      </main>
      <Guru firstName={(u.name ?? 'there').split(' ')[0]} quota={s.guru} />
    </div>
  );
}
