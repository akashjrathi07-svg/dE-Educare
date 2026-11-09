'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

/** Marks a lead as contacted (or back to new), with an optional note. */
export async function setContacted(id: string, contacted: boolean, note: string) {
  const u = await staffOrThrow('leads');
  await sql`update leads set contacted = ${contacted}, contacted_at = ${contacted ? sql`now()` : null}, contacted_by = ${contacted ? u.id : null},
    note = ${note.trim().slice(0, 500) || null} where id = ${id}`;
  revalidatePath('/admin/leads');
  return { ok: true, message: contacted ? 'Marked as contacted' : 'Moved back to new' };
}
