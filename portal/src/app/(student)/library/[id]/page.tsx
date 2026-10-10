import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { PdfReader } from './pdf-reader';

export const metadata = { title: 'Notes', robots: { index: false } };

export default async function Read({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const u = await requireUser(`/library/${id}`);
  const [[item], [{ parts }]] = await Promise.all([
    sql`select id, title, description, exam_code, status from library_items where id = ${id} and kind = 'pdf'`,
    sql`select count(*)::int as parts from library_file_parts where item_id = ${id}`,
  ]);
  if (!item || (item.status !== 'live' && u.role === 'student') || !parts) notFound();
  const mark = `${u.de_id} · ${u.phone.replace(/^(\+91)?(\d{2})\d{6}(\d{2})$/, '$2••••••$3')}`;
  return (
    <>
      <div className="head">
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <Link href="/library?tab=notes" className="back">← Library</Link>
          <h1 className="h1">{item.title}</h1>
          {item.description && <span className="muted" style={{ fontSize: 14 }}>{item.description}</span>}
        </div>
      </div>
      <PdfReader id={id} parts={parts} mark={mark} />
      <div className="note">View-only notes for your DE Educare account. Please don’t share screenshots; every page carries your DE ID.</div>
    </>
  );
}
