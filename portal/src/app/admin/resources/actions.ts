'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

export type ResourceInput = {
  id: string | null; kind: 'pdf' | 'video'; title: string; examCode: string; description: string; meta: string;
  url: string; pages: number | null; isPublic: boolean; status: 'live' | 'draft'; examGroup: string;
};

const MAX_PART = 3 * 1024 * 1024 + 1024;
const MAX_PARTS = 10; // 30 MB

/** Creates or updates a library item. PDFs are uploaded afterwards with uploadPart. */
export async function saveResource(r: ResourceInput): Promise<{ ok: boolean; message: string; id?: string }> {
  await staffOrThrow('resources');
  const title = r.title.trim().slice(0, 120);
  if (!title) return { ok: false, message: 'Title is required' };
  const url = r.url.trim();
  if (r.kind === 'video' && url && !/^https:\/\//.test(url)) return { ok: false, message: 'The video link must start with https://' };
  const vals = {
    kind: r.kind, title, exam_code: r.examCode || null, description: r.description.trim().slice(0, 300) || null, meta: r.meta.trim().slice(0, 80) || null,
    url: r.kind === 'video' ? url || null : null, pages: r.pages && r.pages > 0 ? Math.round(r.pages) : null,
    public: r.isPublic, status: r.status, exam_group: ['mba', 'upsc', 'bank', 'ug'].includes(r.examGroup) ? r.examGroup : 'mba',
  };
  let id = r.id;
  if (id) {
    await sql`update library_items set ${sql(vals)} where id = ${id}`;
  } else {
    [{ id }] = await sql`insert into library_items ${sql(vals)} returning id`;
  }
  revalidatePath('/admin/resources');
  revalidatePath('/library');
  return { ok: true, message: r.id ? 'Saved' : 'Created', id: id! };
}

/** Stores one part of a PDF (parts are numbered from 0; part 0 replaces the old file). */
export async function uploadPart(fd: FormData): Promise<{ ok: boolean; message: string }> {
  await staffOrThrow('resources');
  const id = String(fd.get('id'));
  const n = Number(fd.get('n'));
  const blob = fd.get('part');
  if (!/^[0-9a-f-]{36}$/.test(id) || !Number.isInteger(n) || n < 0 || n >= MAX_PARTS || !(blob instanceof Blob)) return { ok: false, message: 'Bad upload' };
  if (blob.size > MAX_PART) return { ok: false, message: 'Part too large' };
  const bytes = Buffer.from(await blob.arrayBuffer());
  if (n === 0 && bytes.subarray(0, 5).toString() !== '%PDF-') return { ok: false, message: 'That file is not a PDF' };
  await sql.begin(async tx => {
    if (n === 0) await tx`delete from library_file_parts where item_id = ${id}`;
    await tx`insert into library_file_parts (item_id, part, bytes) values (${id}, ${n}, ${bytes}) on conflict (item_id, part) do update set bytes = excluded.bytes`;
  });
  return { ok: true, message: 'Uploaded' };
}

export async function finishUpload(id: string, sizeBytes: number) {
  await staffOrThrow('resources');
  await sql`update library_items set size_mb = ${Math.round((sizeBytes / 1048576) * 10) / 10} where id = ${id}`;
  revalidatePath('/admin/resources');
  revalidatePath('/library');
  return { ok: true, message: 'PDF uploaded · students can read it in Library → Notes' };
}

export async function deleteResource(id: string) {
  await staffOrThrow('resources');
  await sql`delete from library_items where id = ${id}`;
  revalidatePath('/admin/resources');
  revalidatePath('/library');
  return { ok: true, message: 'Deleted' };
}
