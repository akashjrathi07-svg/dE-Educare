import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { canSeeClass, embedUrl } from '@/lib/server/live';
import { Room } from './room';

export const metadata = { title: 'Class' };

export default async function ClassRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser(`/live/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await canSeeClass(u.id, u.exam_group, id);
  if (!c) notFound();
  const [hand] = await sql`select 1 from live_hands where class_id = ${id} and user_id = ${u.id}`;
  const src = c.ended ? c.recording_url : c.stream_url;
  const start = new Date(c.starts_at);
  const status = c.on_air ? `started ${Math.max(1, Math.round((Date.now() - start.getTime()) / 60000))} min ago` : c.ended ? 'class ended' : 'starts ' + start.toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  return (
    <>
      <Link href="/live" className="back">← All classes</Link>
      <Room
        id={id} title={c.title} by={`${c.faculty_name ?? 'DE Educare'}${c.topic ? ' · ' + c.topic : ''} · ${status}`}
        onAir={c.on_air} ended={c.ended} embed={embedUrl(src)} link={src} handUp={!!hand}
      />
    </>
  );
}
