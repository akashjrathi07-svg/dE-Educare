'use server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { canSeeClass } from '@/lib/server/live';

export async function toggleReminder(classId: string) {
  const u = await currentUser();
  if (!u || !(await canSeeClass(u.id, u.exam_group, classId))) return;
  const del = await sql`delete from reminders where user_id = ${u.id} and class_id = ${classId} returning 1`;
  if (!del.length) await sql`insert into reminders (user_id, class_id) values (${u.id}, ${classId}) on conflict do nothing`;
  revalidatePath('/live');
}

export async function toggleHand(classId: string) {
  const u = await currentUser();
  if (!u || !(await canSeeClass(u.id, u.exam_group, classId))) return false;
  const del = await sql`delete from live_hands where user_id = ${u.id} and class_id = ${classId} returning 1`;
  if (!del.length) await sql`insert into live_hands (class_id, user_id) values (${classId}, ${u.id}) on conflict do nothing`;
  return !del.length;
}

/** Saves the class to the library once its recording is published. */
export async function saveRecording(classId: string) {
  const u = await currentUser();
  if (!u) return 'Please sign in again.';
  const c = await canSeeClass(u.id, u.exam_group, classId);
  if (!c) return 'Class not found.';
  let [item] = await sql`select id from library_items where class_id = ${classId}`;
  if (!item && c.recording_url) {
    [item] = await sql`insert into library_items (kind, title, meta, url, exam_group, class_id) values ('video', ${c.title}, ${(c.faculty_name ?? 'DE Educare') + ' · recording'}, ${c.recording_url}, ${c.exam_group}, ${classId}) returning id`;
  }
  if (!item) {
    await sql`insert into reminders (user_id, class_id) values (${u.id}, ${classId}) on conflict do nothing`;
    return 'The recording will appear in your library after the class.';
  }
  await sql`insert into saved_items (user_id, item_id) values (${u.id}, ${item.id}) on conflict do nothing`;
  revalidatePath('/library');
  return 'Saved to your library.';
}
