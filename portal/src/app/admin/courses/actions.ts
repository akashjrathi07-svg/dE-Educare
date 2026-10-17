'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { slugify } from '@/lib/slug';

export type CourseInput = {
  id: string | null; name: string; examId: string | null; price: number; mrp: number; validity: string; includes: string[];
  guru: string; channels: string[]; status: string; description: string; features: string[]; badge: string;
  category: string;
  /** Tests this plan unlocks (10 mocks, a test series…). */
  testIds: string[];
  /** Optional Tests-screen folder that should list all of this course's tests. */
  nodeId?: string;
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
  const category = c.category === 'coaching' ? 'coaching' : 'test_series';
  const testIds = Array.isArray(c.testIds) ? c.testIds.filter(x => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 500) : [];
  await sql.begin(async tx => {
    let id = c.id;
    if (id) {
      await tx`update courses set name = ${name}, exam_id = ${c.examId}, price_paise = ${price}, mrp_paise = ${mrp}, validity = ${c.validity}, includes = ${includes},
        guru_quota = ${c.guru}, channels = ${channels}, status = ${c.status}, description = ${c.description.trim() || null}, features = ${features}, badge = ${c.badge.trim() || null},
        category = ${category}
        where id = ${id}`;
    } else {
      let slug = slugify(name), n = 1;
      while ((await tx`select 1 from courses where slug = ${slug}`).length) slug = slugify(name) + '-' + ++n;
      const [row] = await tx`insert into courses (slug, name, exam_id, price_paise, mrp_paise, validity, includes, guru_quota, channels, status, description, features, badge, category, sort)
        values (${slug}, ${name}, ${c.examId}, ${price}, ${mrp}, ${c.validity}, ${includes}, ${c.guru}, ${channels}, ${c.status}, ${c.description.trim() || null}, ${features}, ${c.badge.trim() || null}, ${category},
                (select coalesce(max(sort), 0) + 1 from courses)) returning id`;
      id = row.id;
    }
    // The plan unlocks exactly the ticked tests.
    await tx`delete from course_tests where course_id = ${id} and not (test_id = any(${testIds}::uuid[]))`;
    for (const t of testIds) await tx`insert into course_tests (course_id, test_id) values (${id}, ${t}) on conflict do nothing`;
    if (c.nodeId) await tx`update catalog_nodes set course_id = ${id}, test_types = null where id = ${c.nodeId}`;
  });
  revalidatePath('/admin/tests');
  revalidatePath('/tests');
  revalidatePath('/admin/courses');
  revalidatePath('/plans');
  return { ok: true, message: 'Course saved · changes go live on web and app' + (c.status === 'draft' ? ' once it is Live' : '') };
}
