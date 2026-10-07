'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { examRefs } from '@/lib/server/admin';
import { upsertQuestion } from '@/lib/server/questions';
import { COLUMNS, parseCsv, validateRows } from '@/lib/question-import';

const MAX_ROWS = 2000;

/** Saves the Add/Edit form. The form uses the CSV column names so both paths share one validator. */
export async function saveQuestion(fields: Partial<Record<(typeof COLUMNS)[number], string>>, status: 'live' | 'draft') {
  await staffOrThrow('bank');
  const exams = await examRefs();
  const { ready, errors } = validateRows([[...COLUMNS], COLUMNS.map(c => fields[c] ?? '')], exams);
  if (!ready.length) return { ok: false, message: errors[0]?.message.replace(/^./, c => c.toUpperCase()) ?? 'Check the form' };
  const r = await sql.begin(tx => upsertQuestion(tx, ready[0], exams, status === 'draft' ? 'draft' : 'live'));
  revalidatePath('/admin/bank');
  return { ok: true, message: r.id + (r.created ? ' added to the bank' : ' updated'), id: r.id };
}

/** Step 1 of bulk import: checks every row and reports problems. Nothing is saved. */
export async function checkImport(csv: string) {
  await staffOrThrow('bank');
  const table = parseCsv(csv);
  if (table.length - 1 > MAX_ROWS) return { total: table.length - 1, ready: 0, errors: [{ row: 1, message: `Up to ${MAX_ROWS} questions per file. Split the file and import in parts.` }], updates: 0 };
  const { ready, errors, total } = validateRows(table, await examRefs());
  const ids = ready.map(q => q.externalId).filter(Boolean) as string[];
  const [{ n }] = ids.length ? await sql`select count(*)::int as n from questions where external_id = any(${ids})` : [{ n: 0 }];
  return { total, ready: ready.length, errors: errors.slice(0, 50), moreErrors: Math.max(0, errors.length - 50), updates: n as number };
}

/** Step 2: saves every valid row in one transaction. Rows with errors are skipped. */
export async function runImport(csv: string) {
  await staffOrThrow('bank');
  const exams = await examRefs();
  const table = parseCsv(csv);
  if (table.length - 1 > MAX_ROWS) return { ok: false, message: 'File is too large' };
  const { ready, errors } = validateRows(table, exams);
  if (!ready.length) return { ok: false, message: 'No valid rows to import' };
  let created = 0, updated = 0;
  await sql.begin(async tx => {
    for (const q of ready) (await upsertQuestion(tx, q, exams)).created ? created++ : updated++;
  });
  revalidatePath('/admin/bank');
  const skipped = errors.length ? ` · ${new Set(errors.map(e => e.row)).size} rows skipped` : '';
  return { ok: true, message: `${created} questions imported${updated ? ` · ${updated} updated` : ''}${skipped}` };
}

export async function resolveReports(questionId: string, status: 'fixed' | 'dismissed') {
  await staffOrThrow('bank');
  await sql`update question_reports set status = ${status} where question_id = ${questionId} and status = 'open'`;
  revalidatePath('/admin/bank');
  revalidatePath('/admin');
  return { ok: true, message: status === 'fixed' ? 'Marked as fixed' : 'Reports dismissed' };
}
