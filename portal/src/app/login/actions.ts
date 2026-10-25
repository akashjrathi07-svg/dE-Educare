'use server';
import { redirect } from 'next/navigation';
import { requestOtp, verifyOtp, signOut } from '@/lib/server/auth';

export type LoginState = { step: 'phone' | 'otp'; phone?: string; error?: string; devCode?: string; next?: string; channel?: 'whatsapp' | 'sms'; sentAt?: number };

const safeNext = (n?: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/');

export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const next = safeNext(String(form.get('next') ?? ''));
  const intent = String(form.get('intent') ?? '');
  if (intent === 'change') return { step: 'phone', phone: prev.phone, next };
  if (intent === 'send' || intent === 'sms' || prev.step === 'phone') {
    const phone = String(form.get('phone') ?? prev.phone ?? '');
    const r = await requestOtp(phone, intent === 'sms' ? 'sms' : 'whatsapp');
    if (!r.ok) return { ...prev, step: prev.step, phone, error: r.error, next };
    return { step: 'otp', phone: r.phone, devCode: r.devCode, next, channel: r.channel, sentAt: Date.now() };
  }
  const r = await verifyOtp(prev.phone ?? '', String(form.get('otp') ?? '').replace(/\D/g, ''));
  if (!r.ok) return { ...prev, error: r.error };
  redirect(r.user.onboarded ? next : '/onboarding?next=' + encodeURIComponent(next));
}

export async function logoutAction() {
  await signOut();
  redirect('/login');
}
