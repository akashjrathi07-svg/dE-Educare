import { sql } from '@/lib/server/db';
import { corsHeaders } from '@/lib/server/cors';

/** Approved student reviews for deeducare.com. Photos are separate URLs so this stays small. */
export async function GET(req: Request) {
  const base = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
  const rows = await sql`
    select id, kind, rating, body, display_name, exam_label, photo is not null as has_photo, reviewed_at
    from reviews where status = 'approved' and consent
    order by (photo is not null) desc, rating desc, reviewed_at desc limit 60`;
  const reviews = rows.map(r => ({
    id: r.id, kind: r.kind, rating: r.rating, text: r.body, name: r.display_name, exam: r.exam_label ?? '',
    photo: r.has_photo ? `${base}/api/public/reviews/${r.id}/photo` : null,
  }));
  return Response.json({ reviews }, { headers: { ...corsHeaders(req), 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
