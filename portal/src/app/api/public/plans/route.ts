import { sql } from '@/lib/server/db';
import { corsHeaders } from '@/lib/server/cors';

/** Live plan prices for the website, so a price changed in Admin → Courses shows on deeducare.com too. */
export async function GET(req: Request) {
  const rows = await sql`select slug, name, price_paise, mrp_paise, validity, status from courses order by sort`;
  const plans = rows.map(r => ({ id: r.slug, name: r.name, live: r.status === 'live', amount: r.price_paise / 100, mrp: r.mrp_paise / 100, validity: r.validity }));
  return Response.json({ plans }, { headers: { ...corsHeaders(req), 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
