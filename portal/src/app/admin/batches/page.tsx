import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { facultyList } from '@/lib/server/admin';
import { BatchesClient } from './batches-client';

export default async function Batches() {
  await requireStaff('batches');
  const [batches, exams, courses, faculty] = await Promise.all([
    sql`select b.*, e.name as exam, c.name as course, f.name as faculty, (select count(*)::int from batch_members m where m.batch_id = b.id) as members
        from batches b left join exams e on e.id = b.exam_id left join courses c on c.id = b.course_id left join users f on f.id = b.faculty_id
        order by b.start_date desc nulls last, b.created_at desc`,
    sql`select id, name from exams order by sort`,
    sql`select id, name from courses order by sort`,
    facultyList(),
  ]);
  return (
    <BatchesClient
      exams={exams.map(e => ({ id: e.id, name: e.name }))} courses={courses.map(c => ({ id: c.id, name: c.name }))} faculty={faculty}
      batches={batches.map(b => ({
        id: b.id, name: b.name, examId: b.exam_id, courseId: b.course_id, facultyId: b.faculty_id, days: b.days, time: b.start_time ? String(b.start_time).slice(0, 5) : '',
        start: b.start_date ? new Date(b.start_date).toISOString().slice(0, 10) : '', capacity: b.capacity, exam: b.exam ?? '—', course: b.course ?? 'No course', faculty: b.faculty ?? 'No faculty', members: b.members,
      }))}
    />
  );
}
