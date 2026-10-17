import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { CoursesClient } from './courses-client';

export default async function Courses() {
  await requireStaff('courses');
  const [courses, exams, tests, nodes] = await Promise.all([
    sql`select c.*, e.code as exam, (select count(distinct user_id)::int from entitlements en where en.course_id = c.id and (en.ends_at is null or en.ends_at > now())) as students,
          coalesce((select array_agg(ct.test_id) from course_tests ct where ct.course_id = c.id), '{}') as test_ids,
          coalesce((select array_agg(n.name order by n.sort) from catalog_nodes n where n.course_id = c.id), '{}') as folders
        from courses c left join exams e on e.id = c.exam_id order by c.sort, c.created_at`,
    sql`select id, code, name from exams order by sort`,
    sql`select t.id, t.name, t.slug, t.type, t.status, t.is_free, t.exam_id, (select count(*)::int from test_questions q where q.test_id = t.id) as q
        from tests t where t.owner_id is null and t.status <> 'archived' order by t.exam_id, t.type, t.name`,
    sql`with recursive tree as (
          select id, parent_id, name, exam_id, name::text as path from catalog_nodes where parent_id is null
          union all select n.id, n.parent_id, n.name, n.exam_id, tree.path || ' › ' || n.name from catalog_nodes n join tree on n.parent_id = tree.id)
        select id, path, exam_id from tree where exam_id is not null order by path`,
  ]);
  return (
    <CoursesClient
      exams={exams.map(e => ({ id: e.id, name: e.name }))}
      courses={courses.map(c => ({
        id: c.id, slug: c.slug, name: c.name, examId: c.exam_id, exam: c.exam ?? 'All', price: c.price_paise / 100, mrp: c.mrp_paise / 100, validity: c.validity,
        includes: c.includes, guru: c.guru_quota, channels: c.channels, status: c.status, students: c.students, description: c.description ?? '', features: c.features, badge: c.badge ?? '',
        category: c.category ?? 'test_series', testIds: c.test_ids ?? [], folders: c.folders ?? [], nodeId: '',
      }))}
      nodes={nodes.map(n => ({ id: n.id, path: n.path, examId: n.exam_id }))}
      tests={tests.map(t => ({ id: t.id, name: t.name, slug: t.slug, type: t.type, examId: t.exam_id, q: t.q, draft: t.status !== 'live', free: t.is_free }))}
    />
  );
}
