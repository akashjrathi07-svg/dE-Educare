import 'server-only';
import { sql } from './db';
import type { ExamRef } from '../question-import';

/** Exams with sections and topics, for selects, the question form and CSV validation. */
export async function examRefs() {
  const rows = await sql`
    select e.id as exam_id, e.code, e.name, e.exam_group, e.exam_date, s.id as section_id, s.code as sec_code, s.name as sec_name, s.questions, s.minutes,
           coalesce((select array_agg(t.name order by t.sort, t.name) from topics t where t.section_id = s.id), '{}') as topics,
           it.marking, it.rules, it.total_minutes
    from exams e join sections s on s.exam_id = e.id left join interface_templates it on it.exam_id = e.id
    order by e.sort, s.sort`;
  const map = new Map<string, AdminExam>();
  for (const r of rows) {
    let e = map.get(r.code);
    if (!e) {
      const m = String(r.marking?.label ?? '').match(/\+([\d.]+)\s*\/\s*[−-]?([\d.]+)/);
      e = { id: r.exam_id, code: r.code, name: r.name, group: r.exam_group, totalMinutes: r.total_minutes, rules: r.rules ?? {}, marking: r.marking?.label ?? '',
        plus: m ? Number(m[1]) : 1, minus: m ? Number(m[2]) : 0, sections: [] };
      map.set(r.code, e);
    }
    e.sections.push({ id: r.section_id, code: r.sec_code, name: r.sec_name, questions: r.questions, minutes: r.minutes, topics: r.topics });
  }
  return [...map.values()];
}
export type AdminExam = Omit<ExamRef, 'sections'> & {
  id: string; group: string; totalMinutes: number | null; rules: Record<string, unknown>; marking: string; plus: number; minus: number;
  sections: (ExamRef['sections'][number] & { id: string; questions: number | null; minutes: number | null })[];
};

/** People who can teach a class or run a batch. */
export async function facultyList() {
  return (await sql`select id, name from users where role in ('faculty', 'admin') and name is not null order by role = 'admin', name`) as unknown as { id: string; name: string }[];
}

export const VALIDITY: Record<string, string> = { till_exam: 'Till exam date', '6m': '6 months', '12m': '12 months' };
export const GURU: Record<string, string> = { '10/day': '10 a day', '50/day': '50 a day', unlimited: 'Unlimited' };
export const TEST_TYPES: Record<string, string> = { full_mock: 'Full mock', sectional: 'Sectional', topic: 'Topic test', daily: 'Daily free', pyq: 'Previous paper', custom: 'Custom' };

/** Date + time typed in IST → timestamptz string. */
export const istTimestamp = (date: string, time: string) => `${date}T${time || '00:00'}:00+05:30`;

export const istDay = (d: Date | string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
export const istTime = (d: Date | string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

export function classStatus(c: { starts_at: Date; duration_min: number; cancelled: boolean; recording_url: string | null }) {
  const start = new Date(c.starts_at).getTime(), end = start + c.duration_min * 60_000, now = Date.now();
  if (c.cancelled) return 'Cancelled';
  if (now < start) return 'Scheduled';
  if (now < end) return 'Live now';
  return c.recording_url ? 'Recorded' : 'Ended';
}

/** Student row columns for the Students table and CSV export. Use with `from users u`. */
export const studentColumns = () => sql`
  u.id, u.name, u.phone, u.de_id, u.role, u.target_exam, u.guru_credits, u.created_at, u.last_active_at,
  (select string_agg(x.name, ', ' order by x.price_paise desc) from (select distinct c.name, c.price_paise from entitlements e join courses c on c.id = e.course_id where e.user_id = u.id and (e.ends_at is null or e.ends_at > now())) x) as plans,
  (select b.id from batch_members m join batches b on b.id = m.batch_id where m.user_id = u.id limit 1) as batch_id,
  (select b.name from batch_members m join batches b on b.id = m.batch_id where m.user_id = u.id limit 1) as batch,
  (select round(avg(percentile), 1) from attempts a where a.user_id = u.id and a.status = 'submitted') as pct,
  (select count(*)::int from attempts a where a.user_id = u.id and a.status = 'submitted') as attempts`;
