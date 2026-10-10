import { sql } from '@/lib/server/db';
import { corsHeaders } from '@/lib/server/cors';

/** Free notes and PDFs listed on deeducare.com. Each opens in the portal's view-only reader after sign-in. */
export async function GET(req: Request) {
  const base = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
  const rows = await sql`
    select id, title, exam_code, description, pages, kind from library_items
    where public and status = 'live' and kind = 'pdf' and exists (select 1 from library_file_parts p where p.item_id = library_items.id)
    order by sort, created_at desc limit 60`;
  const resources = rows.map(r => ({ id: r.id, title: r.title, exam: r.exam_code ?? '', desc: r.description ?? '', pages: r.pages, kind: 'PDF', url: `${base}/library/${r.id}` }));
  return Response.json({ resources }, { headers: { ...corsHeaders(req), 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
