import { verifyOtp } from '@/lib/server/auth';

/**
 * Mobile app sign-in, step 2: POST { phone, code } → { token, user }.
 * The app sends `Authorization: Bearer <token>` on every request; all portal APIs
 * (Guru, tests, results, coins) then work exactly as on the web, on the same account.
 */
export async function POST(req: Request) {
  const { phone, code } = await req.json().catch(() => ({}));
  const r = await verifyOtp(String(phone ?? ''), String(code ?? ''), { app: true });
  if (!r.ok) return Response.json({ ok: false, error: r.error }, { status: 400 });
  const u = r.user;
  return Response.json({ ok: true, token: r.token, isNew: r.isNew, user: { id: u.id, deId: u.de_id, name: u.name, phone: u.phone, onboarded: u.onboarded, exam: u.target_exam } }, { headers: { 'Cache-Control': 'no-store' } });
}
