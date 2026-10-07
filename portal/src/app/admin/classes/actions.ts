'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { istTimestamp } from '@/lib/server/admin';

const httpUrl = (s: string) => { try { return ['https:', 'http:'].includes(new URL(s).protocol); } catch { return false; } };

export async function scheduleClass(c: { title: string; batchId: string; facultyId: string; topic: string; date: string; time: string; duration: number; link: string; record: boolean; group: string }) {
  await staffOrThrow('classes');
  const title = c.title.trim().slice(0, 120);
  if (!title) return { ok: false, message: 'Class title is required' };
  if (!/^\d{4}-\d\d-\d\d$/.test(c.date) || !/^\d\d:\d\d$/.test(c.time)) return { ok: false, message: 'Pick a date and start time' };
  if (c.link && !httpUrl(c.link)) return { ok: false, message: 'Stream link must start with https://' };
  const duration = Math.min(300, Math.max(15, Math.round(c.duration) || 60));
  const [b] = c.batchId ? await sql`select b.id, b.name, coalesce(e.exam_group, 'mba') as grp from batches b left join exams e on e.id = b.exam_id where b.id = ${c.batchId}` : [];
  const [f] = c.facultyId ? await sql`select id, name from users where id = ${c.facultyId} and role in ('faculty', 'admin')` : [];
  const group = b?.grp ?? (['mba', 'upsc', 'bank', 'ug'].includes(c.group) ? c.group : 'mba');
  await sql`insert into live_classes (title, batch_id, exam_group, faculty_id, faculty_name, topic, starts_at, duration_min, stream_url, record)
    values (${title}, ${b?.id ?? null}, ${group}, ${f?.id ?? null}, ${f?.name ?? null}, ${c.topic.trim() || null}, ${istTimestamp(c.date, c.time)}, ${duration}, ${c.link.trim() || null}, ${c.record})`;
  revalidatePath('/admin/classes');
  revalidatePath('/live');
  return { ok: true, message: `Class scheduled · ${b ? b.name : 'all ' + group.toUpperCase() + ' students'} can see it under Live classes` };
}

/** Sets the stream link or the recording. A recording is also added to the Library. */
export async function updateClass(id: string, patch: { link?: string; recording?: string; cancel?: boolean }) {
  await staffOrThrow('classes');
  const [c] = await sql`select * from live_classes where id = ${id}`;
  if (!c) return { ok: false, message: 'Class not found' };
  if (patch.cancel) {
    await sql`update live_classes set cancelled = true where id = ${id}`;
  } else if (patch.link !== undefined) {
    if (patch.link && !httpUrl(patch.link)) return { ok: false, message: 'Stream link must start with https://' };
    await sql`update live_classes set stream_url = ${patch.link || null} where id = ${id}`;
  } else if (patch.recording !== undefined) {
    if (patch.recording && !httpUrl(patch.recording)) return { ok: false, message: 'Recording link must start with https://' };
    await sql.begin(async tx => {
      await tx`update live_classes set recording_url = ${patch.recording || null} where id = ${id}`;
      await tx`delete from library_items where class_id = ${id} and kind = 'video'`;
      if (patch.recording && c.record) {
        await tx`insert into library_items (kind, title, meta, url, exam_group, class_id)
          values ('video', ${c.title}, ${[c.faculty_name, c.duration_min + ' min recording'].filter(Boolean).join(' · ')}, ${patch.recording}, ${c.exam_group}, ${id})`;
      }
    });
  }
  revalidatePath('/admin/classes');
  revalidatePath('/live');
  revalidatePath('/library');
  return { ok: true, message: patch.cancel ? 'Class cancelled' : patch.recording !== undefined ? (patch.recording ? 'Recording saved' + (c.record ? ' · added to Library' : '') : 'Recording removed') : 'Stream link saved' };
}
