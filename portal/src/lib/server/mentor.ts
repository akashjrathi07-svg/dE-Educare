import 'server-only';
import { sql } from './db';
import type { User } from './auth';

/** Batches a staff member can follow: all of them for admins, only their own for mentors. */
export async function followedBatches(u: User) {
  return sql`
    select b.id, b.name, f.name as mentor, e.name as exam,
      (select count(*)::int from batch_members m where m.batch_id = b.id) as members
    from batches b left join users f on f.id = b.faculty_id left join exams e on e.id = b.exam_id
    where ${u.role === 'admin' ? sql`true` : sql`b.faculty_id = ${u.id}`}
    order by b.created_at desc`;
}

/** Whether a mentor may see this attempt: its student is in one of the mentor's batches. */
export async function mentorCanSeeAttempt(mentorId: string, attemptId: string) {
  const [r] = await sql`
    select 1 from attempts a join batch_members m on m.user_id = a.user_id join batches b on b.id = m.batch_id
    where a.id = ${attemptId} and b.faculty_id = ${mentorId} limit 1`;
  return !!r;
}
