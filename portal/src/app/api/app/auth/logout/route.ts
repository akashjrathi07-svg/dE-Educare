import crypto from 'node:crypto';
import { sql } from '@/lib/server/db';

/** Mobile app sign-out: deletes the session behind the Bearer token. */
export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/)?.[1];
  if (token) await sql`delete from sessions where token_hash = ${crypto.createHash('sha256').update(token).digest('hex')}`;
  return Response.json({ ok: true });
}
