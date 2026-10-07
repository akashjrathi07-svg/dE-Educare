import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { ensureDailyTest } from '@/lib/server/attempts';

const ALIAS: Record<string, string> = { cat: 'CAT', cet: 'MBA-CET', 'mba-cet': 'MBA-CET', omet: 'SNAP', snap: 'SNAP', nmat: 'NMAT', xat: 'XAT', cmat: 'CMAT' };

/** /daily/cat → today's free daily test. Linked from the website and the dashboard. */
export default async function Daily({ params }: { params: Promise<{ exam: string }> }) {
  const { exam } = await params;
  await requireUser(`/daily/${exam}`);
  const code = ALIAS[exam.toLowerCase()] ?? exam.toUpperCase();
  const id = await ensureDailyTest(code);
  if (!id) return <div className="empty">The daily test for this exam isn’t available yet. <Link href="/daily/cat">Take today’s CAT test</Link></div>;
  const [t] = await sql`select slug from tests where id = ${id}`;
  redirect(`/test/${t.slug}`);
}
