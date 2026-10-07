'use server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

export async function toggleSaved(itemId: string) {
  const u = await currentUser();
  if (!u) return false;
  const del = await sql`delete from saved_items where user_id = ${u.id} and item_id = ${itemId} returning 1`;
  if (!del.length) await sql`insert into saved_items (user_id, item_id) select ${u.id}, id from library_items where id = ${itemId} on conflict do nothing`;
  revalidatePath('/library');
  return !del.length;
}
