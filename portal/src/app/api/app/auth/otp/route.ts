import { requestOtp } from '@/lib/server/auth';

/**
 * Mobile app sign-in, step 1: POST { phone, channel? } → a 6-digit code on WhatsApp (or SMS if WhatsApp is not
 * set up or fails). Send channel "sms" for "Get the code by SMS". Same rules as the web login.
 */
export async function POST(req: Request) {
  const { phone, channel } = await req.json().catch(() => ({}));
  const r = await requestOtp(String(phone ?? ''), channel === 'sms' ? 'sms' : 'whatsapp');
  return r.ok ? Response.json({ ok: true, phone: r.phone, channel: r.channel }) : Response.json({ ok: false, error: r.error }, { status: 400 });
}
