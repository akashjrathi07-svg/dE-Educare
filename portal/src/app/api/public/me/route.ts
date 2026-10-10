import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { corsHeaders } from '@/lib/server/cors';
import { initials } from '@/lib/server/shell';

/**
 * Lets deeducare.com show "Hi Akash · Dashboard" instead of "Sign in" for a signed-in student.
 * Reads the shared de_session cookie (COOKIE_DOMAIN=.deeducare.com). Returns only a first name and plan.
 */
export async function GET(req: Request) {
  const u = await currentUser().catch(() => null);
  let body: Record<string, unknown> = { signedIn: false };
  if (u?.onboarded) {
    const [plan] = await sql`select c.name from entitlements e join courses c on c.id = e.course_id
      where e.user_id = ${u.id} and (e.ends_at is null or e.ends_at > now()) order by c.price_paise desc limit 1`;
    body = { signedIn: true, firstName: (u.name ?? '').split(' ')[0] || 'there', initials: initials(u.name), plan: plan?.name ?? null };
  }
  return Response.json(body, { headers: { ...corsHeaders(req), 'Cache-Control': 'private, no-store' } });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
