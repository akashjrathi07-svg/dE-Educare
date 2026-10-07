'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

const FLAGS = ['secTimer', 'lock', 'chooseOrder', 'calc', 'tita', 'review', 'lang', 'omr', 'split'] as const;
const NAV = ['Within the current section', 'Free across sections', 'Free across main sections', 'Free'];
const PALETTE = ['5 states', '4 states', 'OMR bubbles'];

export type IfaceInput = {
  exam: string; rules: Record<(typeof FLAGS)[number], boolean> & { nav: string; palette: string }; marking: string; note: string; totalMinutes: number | null;
  sections: { code: string; questions: number; minutes: number | null }[];
};

export async function saveInterface(i: IfaceInput) {
  await staffOrThrow('iface');
  const [e] = await sql`select e.id, e.name, it.marking from exams e left join interface_templates it on it.exam_id = e.id where e.code = ${i.exam}`;
  if (!e) return { ok: false, message: 'Exam not found' };
  if (!NAV.includes(i.rules.nav) || !PALETTE.includes(i.rules.palette)) return { ok: false, message: 'Pick navigation and palette' };
  const marking = i.marking.trim().slice(0, 80);
  if (!/\+[\d.]+/.test(marking)) return { ok: false, message: 'Marking should start like “+3 / −1”. New questions take their default marks from it.' };
  if (i.rules.secTimer && i.sections.some(s => !(s.minutes && s.minutes > 0))) return { ok: false, message: 'Sectional timers need minutes for every section' };
  const rules = { ...Object.fromEntries(FLAGS.map(f => [f, !!i.rules[f]])), nav: i.rules.nav, palette: i.rules.palette };
  // Keep machine-read parts of marking (e.g. XAT skip penalty).
  const mk = { ...((e.marking ?? {}) as Record<string, unknown>), label: marking };
  await sql.begin(async tx => {
    await tx`insert into interface_templates (exam_id, rules, marking, total_minutes, note) values (${e.id}, ${tx.json(rules)}, ${tx.json(mk as never)}, ${i.totalMinutes || null}, ${i.note.trim() || null})
      on conflict (exam_id) do update set rules = excluded.rules, marking = excluded.marking, total_minutes = excluded.total_minutes, note = excluded.note, updated_at = now()`;
    for (const s of i.sections) {
      await tx`update sections set questions = ${Math.max(0, Math.round(s.questions)) || null}, minutes = ${s.minutes && s.minutes > 0 ? Math.round(s.minutes) : null}
        where exam_id = ${e.id} and code = ${s.code}`;
    }
  });
  revalidatePath('/admin/interfaces');
  return { ok: true, message: `${e.name} template saved · applies to all ${e.name} tests` };
}
