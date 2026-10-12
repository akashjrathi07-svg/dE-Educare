import { sql } from '@/lib/server/db';

/** Question images (graphs, figures). Public and cached for a year: an image never changes once uploaded. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });
  const [m] = await sql`select mime, bytes from media where id = ${id}`;
  if (!m) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(m.bytes as Buffer), {
    headers: { 'content-type': m.mime, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' },
  });
}
