import { saveLead } from '@/lib/server/leads';

/**
 * Website forms are forwarded here by the WordPress theme (server to server). Saved for Admin → Leads and
 * emailed. If LEAD_KEY is set in Vercel, the same key must be set in the website's Customizer.
 */
export async function POST(req: Request) {
  const key = process.env.LEAD_KEY;
  if (key && req.headers.get('x-lead-key') !== key) return Response.json({ ok: false, error: 'Not allowed' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const r = await saveLead(body);
  return Response.json(r, { status: r.ok ? 200 : 400 });
}
