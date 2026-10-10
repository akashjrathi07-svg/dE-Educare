import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { Head } from '../ui';
import { ResourcesClient } from './resources-client';

export default async function Resources({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireStaff('resources');
  const kind = (await searchParams).kind === 'video' ? 'video' : 'pdf';
  const [rows, exams, freeTests] = await Promise.all([
    sql`select l.*, (select count(*)::int from library_file_parts p where p.item_id = l.id) as parts,
          (select count(*)::int from saved_items s where s.item_id = l.id) as saves
        from library_items l where l.kind = ${kind} order by l.sort, l.created_at desc`,
    sql`select code, name from exams order by sort`,
    sql`select e.code, count(*)::int as n from tests t join exams e on e.id = t.exam_id where t.is_free and t.status = 'live' and t.type <> 'daily' group by e.code`,
  ]);
  return (
    <>
      <Head title="Free resources" sub="Notes, formula sheets and recordings. PDFs open view-only in the portal; ticked ones are listed on deeducare.com." />
      <nav className="seg" aria-label="Type">
        <Link href="/admin/resources" aria-current={kind === 'pdf'}>Notes & PDFs</Link>
        <Link href="/admin/resources?kind=video" aria-current={kind === 'video'}>Recorded classes</Link>
      </nav>
      <div className="card pad stack" style={{ '--gap': '6px' } as React.CSSProperties}>
        <b style={{ fontSize: 14 }}>Free tests on the website</b>
        <span className="note">
          The website’s Free resources page lists every live test marked <b>Free</b> in <Link href="/admin/tests">Tests</Link> (daily tests are linked separately).
          Right now: {freeTests.length ? freeTests.map(f => `${f.code} ${f.n}`).join(' · ') : 'none yet, so the website shows its default list'}.
        </span>
      </div>
      <ResourcesClient
        kind={kind}
        exams={exams.map(e => ({ code: e.code, name: e.name }))}
        rows={rows.map(r => ({
          id: r.id, kind: r.kind, title: r.title, examCode: r.exam_code ?? '', description: r.description ?? '', meta: r.meta ?? '', url: r.url ?? '',
          pages: r.pages, isPublic: r.public, status: r.status, examGroup: r.exam_group, parts: r.parts, sizeMb: r.size_mb ? Number(r.size_mb) : null, saves: r.saves,
        }))}
      />
    </>
  );
}
