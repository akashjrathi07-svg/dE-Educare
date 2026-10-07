import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { Head } from '../ui';
import { IfaceEditor } from './iface-client';

export default async function Interfaces({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  await requireStaff('iface');
  const sp = await searchParams;
  const exams = await sql`select e.id, e.code, e.name, it.rules, it.marking, it.total_minutes, it.note from exams e left join interface_templates it on it.exam_id = e.id order by e.sort`;
  const e = exams.find(x => x.code === sp.exam) ?? exams[0];
  const sections = await sql`select code, name, questions, minutes from sections where exam_id = ${e.id} order by sort`;
  const r = (e.rules ?? {}) as Record<string, unknown>;
  return (
    <>
      <Head title="Exam interfaces" sub="Each exam’s on-screen behaviour. Every test uses its exam’s template." />
      <div className="chips">
        {exams.map(x => <Link key={x.code} href={`/admin/interfaces?exam=${encodeURIComponent(x.code)}`} className="chip" aria-pressed={x.code === e.code}>{x.name}</Link>)}
      </div>
      <IfaceEditor key={e.code}
        exam={{ code: e.code, name: e.name }}
        initial={{
          exam: e.code, marking: e.marking?.label ?? '', note: e.note ?? '', totalMinutes: e.total_minutes,
          rules: { secTimer: !!r.secTimer, lock: !!r.lock, chooseOrder: !!r.chooseOrder, calc: !!r.calc, tita: !!r.tita, review: r.review !== false, lang: !!r.lang, omr: !!r.omr, split: !!r.split, nav: String(r.nav ?? 'Free across sections'), palette: String(r.palette ?? '5 states') },
          sections: sections.map(s => ({ code: s.code, questions: s.questions ?? 0, minutes: s.minutes })),
        }}
        sectionNames={sections.map(s => s.name)}
      />
    </>
  );
}
