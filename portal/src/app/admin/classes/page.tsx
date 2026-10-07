import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { classStatus, facultyList, istDay, istTime } from '@/lib/server/admin';
import { ClassesClient } from './classes-client';

export default async function Classes({ searchParams }: { searchParams: Promise<{ new?: string; batch?: string }> }) {
  await requireStaff('classes');
  const sp = await searchParams;
  const [classes, batches, faculty] = await Promise.all([
    sql`select c.*, b.name as batch from live_classes c left join batches b on b.id = c.batch_id
        where c.starts_at > now() - interval '60 days' order by c.starts_at desc limit 200`,
    sql`select b.id, b.name, b.faculty_id from batches b order by b.name`,
    facultyList(),
  ]);
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return (
    <ClassesClient
      startOpen={!!sp.new} startBatch={sp.batch ?? ''} tomorrow={tomorrow} faculty={faculty}
      batches={batches.map(b => ({ id: b.id, name: b.name, facultyId: b.faculty_id }))}
      rows={classes.map(c => ({
        id: c.id, title: c.title, batch: c.batch ?? `Open · all ${String(c.exam_group).toUpperCase()}`, faculty: c.faculty_name ?? '—',
        when: `${istDay(c.starts_at)} · ${istTime(c.starts_at)}`, duration: c.duration_min, status: classStatus(c as never), link: c.stream_url ?? '', recording: c.recording_url ?? '', record: c.record,
      }))}
    />
  );
}
