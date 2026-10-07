'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { slugify } from '@/lib/slug';

export type CourseInput = {
  id: string | null; name: string; examId: string | null; price: number; mrp: number; validity: string; includes: string[];
  guru: string; channels: string[]; status: string; description: string; features: string[]; badge: string;
};

const INCLUDES = ['Full mocks', 'Sectionals', 'Topic tests', 'Previous papers', 'Daily tests', 'Live classes', 'Recordings', 'Study material'];

export async function saveCourse(c: CourseInput) {
  await staffOrThrow('courses');
  const name = c.name.trim().slice(0, 80);
  if (!name) return { ok: false, message: 'Course name is required' };
  if (!(c.price >= 0) || !(c.mrp >= 0)) return { ok: false, message: 'Price and MRP must be numbers' };
  if (c.mrp && c.mrp < c.price) return { ok: false, message: 'MRP should be at least the price' };
  if (!['till_exam', '6m', '12m'].includes(c.validity) || !['10/day', '50/day', 'unlimited'].includes(c.guru) || !['live', 'draft'].includes(c.status)) return { ok: false, message: 'Pick validity, Guru quota and status' };
  const includes = c.includes.filter(x => INCLUDES.includes(x));
  const channels = c.channels.filter(x => ['web', 'app'].includes(x));
  if (!channels.length) return { ok: false, message: 'Sell on web, app or both' };
  const features = c.features.map(f => f.trim()).filter(Boolean).slice(0, 12);
  const price = Math.round(c.price * 100), mrp = Math.round((c.mrp || c.price) * 100);
  if (c.id) {
    await sql`update courses set name = ${name}, exam_id = ${c.examId}, price_paise = ${price}, mrp_paise = ${mrp}, validity = ${c.validity}, includes = ${includes},
      guru_quota = ${c.guru}, channels = ${channels}, status = ${c.status}, description = ${c.description.trim() || null}, features = ${features}, badge = ${c.badge.trim() || null}
      where id = ${c.id}`;
  } else {
    let slug = slugify(name), n = 1;
    while ((await sql`select 1 from courses where slug = ${slug}`).length) slug = slugify(name) + '-' + ++n;
    await sql`insert into courses (slug, name, exam_id, price_paise, mrp_paise, validity, includes, guru_quota, channels, status, description, features, badge, sort)
      values (${slug}, ${name}, ${c.examId}, ${price}, ${mrp}, ${c.validity}, ${includes}, ${c.guru}, ${channels}, ${c.status}, ${c.description.trim() || null}, ${features}, ${c.badge.trim() || null},
              (select coalesce(max(sort), 0) + 1 from courses))`;
  }
  revalidatePath('/admin/courses');
  revalidatePath('/plans');
  return { ok: true, message: 'Course saved · changes go live on web and app' + (c.status === 'draft' ? ' once it is Live' : '') };
}
