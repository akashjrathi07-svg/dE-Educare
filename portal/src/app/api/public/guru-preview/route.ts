import crypto from 'node:crypto';
import { sql } from '@/lib/server/db';
import { corsHeaders } from '@/lib/server/cors';
import { askClaude, GURU_SYSTEM, GURU_FALLBACK } from '@/lib/server/guru';

const FREE = 3;

/**
 * Guru for website visitors who are not signed in: POST { q } → { answer, left, done }.
 * Three questions a day per visitor, then they sign up for 10 free coins a day.
 * Uses the portal's API key, so the website needs no key of its own.
 */
export async function POST(req: Request) {
  const cors = { ...corsHeaders(req), 'Cache-Control': 'no-store' };
  const { q } = await req.json().catch(() => ({}));
  const text = String(q ?? '').trim().slice(0, 300);
  if (!text) return Response.json({ error: 'Ask a question first.' }, { status: 400, headers: cors });
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const visitor = crypto.createHash('sha256').update(ip + ':' + (process.env.SESSION_SECRET ?? 'de')).digest('hex').slice(0, 32);
  const [row] = await sql`
    insert into guru_previews (visitor, day, used) values (${visitor}, (now() at time zone 'Asia/Kolkata')::date, 1)
    on conflict (visitor, day) do update set used = guru_previews.used + 1 returning used`;
  if (row.used > FREE) {
    return Response.json({ answer: 'That’s the end of today’s preview. Create a free DE Educare ID for 10 Guru coins a day, with chat and voice.', left: 0, done: true }, { headers: cors });
  }
  const answer = await askClaude(GURU_SYSTEM + '\nThe person is a visitor on deeducare.com who has not signed up yet.', [{ role: 'user', content: text }], GURU_FALLBACK, { maxTokens: 2000, effort: 'low' });
  return Response.json({ answer, left: FREE - row.used, done: false }, { headers: cors });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
