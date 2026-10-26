import { sql } from '@/lib/server/db';

/**
 * Health check, pinged every few minutes by .github/workflows/keep-warm.yml so the portal and its database
 * connection stay warm and students don't wait for a cold start.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const t = Date.now();
  const ok = await sql`select 1`.then(() => true).catch(() => false);
  return Response.json({ ok, db_ms: Date.now() - t }, { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } });
}
