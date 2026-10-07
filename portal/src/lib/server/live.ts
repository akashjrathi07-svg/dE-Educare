import 'server-only';
import { sql } from './db';

/** Classes a student can see: open classes for their exam group, plus their batches' classes. */
export function visibleClasses(userId: string, group: string) {
  return sql`
    select lc.*, b.name as batch_name,
      lc.starts_at <= now() and lc.starts_at + (lc.duration_min || ' minutes')::interval > now() as on_air,
      lc.starts_at + (lc.duration_min || ' minutes')::interval <= now() as ended,
      exists (select 1 from reminders r where r.class_id = lc.id and r.user_id = ${userId}) as reminded
    from live_classes lc left join batches b on b.id = lc.batch_id
    where not lc.cancelled and (
      (lc.batch_id is null and lc.exam_group = ${group})
      or lc.batch_id in (select batch_id from batch_members where user_id = ${userId}))
    order by lc.starts_at`;
}

export async function canSeeClass(userId: string, group: string, classId: string) {
  const rows = await visibleClasses(userId, group);
  return rows.find(r => r.id === classId) ?? null;
}

/** YouTube / Vimeo links become embeddable players; anything else opens in a new tab. */
export function embedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (/youtube\.com$|youtube-nocookie\.com$/.test(u.hostname.replace(/^www\./, ''))) {
      if (u.pathname.startsWith('/embed/')) return url;
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const live = u.pathname.match(/^\/live\/([\w-]+)/);
      if (live) return `https://www.youtube.com/embed/${live[1]}`;
    }
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.endsWith('vimeo.com')) { const id = u.pathname.split('/').filter(Boolean).pop(); return id ? `https://player.vimeo.com/video/${id}` : null; }
  } catch { /* not a URL */ }
  return null;
}
