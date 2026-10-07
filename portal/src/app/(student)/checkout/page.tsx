import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/server/auth';
import { quote } from '@/lib/server/payments';
import { CheckoutForm } from './checkout-form';

export const metadata = { title: 'Checkout' };

/** /checkout?plan=cat-ts&test=cat-m-2 (linked from the website and locked tests). */
export default async function Checkout({ searchParams }: { searchParams: Promise<{ plan?: string; test?: string; coupon?: string }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  const u = await requireUser('/checkout' + (qs ? '?' + qs : ''));
  const q = sp.plan ? await quote(sp.plan, null, u.id) : null;
  if (!q) redirect('/plans');
  return (
    <>
      <Link href="/plans" className="back">← Plans</Link>
      <h1 className="h1">Checkout</h1>
      <CheckoutForm plan={{ slug: q.course.slug, name: q.course.name, price: q.course.price_paise }} test={sp.test ?? ''} initialCoupon={sp.coupon ?? ''} />
    </>
  );
}
