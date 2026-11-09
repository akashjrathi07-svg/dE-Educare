import { sql } from '@/lib/server/db';
import { corsHeaders } from '@/lib/server/cors';

/** Tests marked Free and live in Admin → Tests, for the website's free tests; `daily` lists the exams with a daily test. */
export async function GET(req: Request) {
  const [rows, daily] = await Promise.all([sql`
    select t.slug, t.name, t.type, t.duration_min, e.code as exam,
      (select count(*)::int from test_questions q where q.test_id = t.id) as questions
    from tests t join exams e on e.id = t.exam_id
    where t.is_free and t.status = 'live' and t.type <> 'daily' and (t.live_from is null or t.live_from <= now())
    order by e.sort, case t.type when 'full_mock' then 0 when 'pyq' then 1 when 'sectional' then 2 else 3 end, t.sort, t.created_at
    limit 200`,
    // Exams that can make a daily test (live, with live questions).
    sql`select e.code from exams e where e.status = 'live' and exists (select 1 from questions q where q.exam_id = e.id and q.status = 'live') order by e.sort`]);
  const tests = rows.map(r => ({ slug: r.slug, name: r.name, type: r.type, exam: r.exam, minutes: r.duration_min, questions: r.questions }));
  return Response.json({ tests, daily: daily.map(d => d.code) }, { headers: { ...corsHeaders(req), 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
