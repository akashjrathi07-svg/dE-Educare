import { requestOtp } from '@/lib/server/auth';

/** Mobile app sign-in, step 1: POST { phone } → SMS with a 6-digit code. Same rules as the web login. */
export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({}));
  const r = await requestOtp(String(phone ?? ''));
  return r.ok ? Response.json({ ok: true, phone: r.phone }) : Response.json({ ok: false, error: r.error }, { status: 400 });
}
