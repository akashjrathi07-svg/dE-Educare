'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export async function saveBatch(b: { id: string | null; name: string; examId: string | null; courseId: string | null; facultyId: string | null; days: string[]; time: string; start: string; capacity: number }) {
  await staffOrThrow('batches');
  const name = b.name.trim().slice(0, 80);
  if (!name) return { ok: false, message: 'Batch name is required' };
  if (!(b.capacity >= 1)) return { ok: false, message: 'Capacity must be at least 1' };
  const days = DAYS.filter(d => b.days.includes(d));
  const time = /^\d\d:\d\d$/.test(b.time) ? b.time : null, start = /^\d{4}-\d\d-\d\d$/.test(b.start) ? b.start : null;
  if (b.id) {
    await sql`update batches set name = ${name}, exam_id = ${b.examId}, course_id = ${b.courseId}, faculty_id = ${b.facultyId}, days = ${days}, start_time = ${time}, start_date = ${start}, capacity = ${Math.round(b.capacity)} where id = ${b.id}`;
  } else {
    await sql`insert into batches (name, exam_id, course_id, faculty_id, days, start_time, start_date, capacity) values (${name}, ${b.examId}, ${b.courseId}, ${b.facultyId}, ${days}, ${time}, ${start}, ${Math.round(b.capacity)})`;
  }
  revalidatePath('/admin/batches');
  return { ok: true, message: b.id ? 'Batch updated' : 'Batch created · add students from Students' };
}
