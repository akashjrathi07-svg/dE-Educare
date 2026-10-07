import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { CoursesClient } from './courses-client';

export default async function Courses() {
  await requireStaff('courses');
  const [courses, exams] = await Promise.all([
    sql`select c.*, e.code as exam, (select count(distinct user_id)::int from entitlements en where en.course_id = c.id and (en.ends_at is null or en.ends_at > now())) as students
        from courses c left join exams e on e.id = c.exam_id order by c.sort, c.created_at`,
    sql`select id, code, name from exams order by sort`,
  ]);
  return (
    <CoursesClient
      exams={exams.map(e => ({ id: e.id, name: e.name }))}
      courses={courses.map(c => ({
        id: c.id, slug: c.slug, name: c.name, examId: c.exam_id, exam: c.exam ?? 'All', price: c.price_paise / 100, mrp: c.mrp_paise / 100, validity: c.validity,
        includes: c.includes, guru: c.guru_quota, channels: c.channels, status: c.status, students: c.students, description: c.description ?? '', features: c.features, badge: c.badge ?? '',
      }))}
    />
  );
}
