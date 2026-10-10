import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

/**
 * One part (up to 3 MB) of a library PDF, for the view-only reader. Signed-in users only,
 * never cached by shared caches, and served inline without a filename.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const u = await currentUser();
  if (!u) return new Response('Sign in to read this', { status: 401 });
  const { id, n } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d{1,3}$/.test(n)) return new Response('Not found', { status: 404 });
  const [p] = await sql`
    select p.bytes from library_file_parts p join library_items l on l.id = p.item_id
    where p.item_id = ${id} and p.part = ${Number(n)} and (l.status = 'live' or ${u.role !== 'student'})`;
  if (!p) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(p.bytes), {
    headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' },
  });
}
