'use server';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/server/auth';
import { startAttempt } from '@/lib/server/attempts';
import { useCreditOn } from '@/lib/server/access';

export async function startTest(form: FormData) {
  const u = await currentUser();
  if (!u) redirect('/login');
  const testId = String(form.get('testId'));
  const slug = String(form.get('slug'));
  const order = String(form.get('order') ?? '').split(',').filter(Boolean).map(Number);
  const r = await startAttempt(u.id, testId, order.length ? order : undefined);
  if (!r.ok) redirect(`/test/${slug}?err=${r.error}`);
  redirect(`/exam/${r.attemptId}`);
}

export async function spendCredit(form: FormData) {
  const u = await currentUser();
  if (!u) redirect('/login');
  const ok = await useCreditOn(u.id, String(form.get('testId')));
  redirect(`/test/${String(form.get('slug'))}${ok ? '' : '?err=credit'}`);
}
