'use server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

export async function setExamGroup(group: string) {
  const u = await currentUser();
  if (!u || !['mba', 'upsc', 'bank', 'ug'].includes(group)) return;
  await sql`update users set exam_group = ${group} where id = ${u.id}`;
  revalidatePath('/', 'layout');
}

export async function toggleTheme() {
  const u = await currentUser();
  if (!u) return;
  await sql`update users set theme = ${u.theme === 'dark' ? 'light' : 'dark'} where id = ${u.id}`;
  revalidatePath('/', 'layout');
}
