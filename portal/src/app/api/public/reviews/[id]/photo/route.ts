import { canAccess, currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

/** A review photo. Public once the review is approved; staff can see pending ones with ?admin=1. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 });
  const admin = new URL(req.url).searchParams.get('admin') === '1';
  if (admin) {
    const u = await currentUser();
    if (!u || !canAccess(u.role, 'reviews')) return new Response('Not found', { status: 404 });
  }
  const [r] = await sql`select photo, photo_mime, status from reviews where id = ${id} and photo is not null`;
  if (!r || (!admin && r.status !== 'approved')) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(r.photo), {
    headers: { 'Content-Type': r.photo_mime ?? 'image/jpeg', 'Cache-Control': admin ? 'private, no-store' : 'public, max-age=86400, s-maxage=86400' },
  });
}
