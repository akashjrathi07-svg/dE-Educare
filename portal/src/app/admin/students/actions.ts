'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import crypto from 'node:crypto';
import { sql } from '@/lib/server/db';
import { grantBonus } from '@/lib/server/coins';
import { enrolStudent, type EnrolInput } from '@/lib/server/enrol';

export type StudentUpdate = { userId: string; exam: string; grant: string; batchId: string; credits: number; role: string };

/**
 * Support and admins can grant plans and Guru credits; faculty can only move students between batches.
 * grant: '' = no change, 'none' = end granted plans (purchases stay), otherwise a course id.
 */
export async function updateStudent(s: StudentUpdate) {
  const me = await staffOrThrow('students');
  const canGrant = me.role === 'admin' || me.role === 'support';
  const done: string[] = [];
  await sql.begin(async tx => {
    const [u] = await tx`select id, target_exam, role from users where id = ${s.userId} for update`;
    if (!u) throw new Error('Student not found');
    if (s.exam && s.exam !== u.target_exam) {
      const [e] = await tx`select code, exam_group from exams where code = ${s.exam}`;
      if (e) { await tx`update users set target_exam = ${e.code}, exam_group = ${e.exam_group} where id = ${u.id}`; done.push('exam changed'); }
    }
    if (canGrant && s.grant === 'none') {
      const r = await tx`update entitlements set ends_at = now() where user_id = ${u.id} and source = 'grant' and (ends_at is null or ends_at > now())`;
      if (r.count) done.push('granted plans removed');
    } else if (canGrant && s.grant) {
      const [c] = await tx`select c.id, c.name, c.validity, e.exam_date from courses c left join exams e on e.id = c.exam_id where c.id = ${s.grant}`;
      const [has] = c ? await tx`select 1 from entitlements where user_id = ${u.id} and course_id = ${c.id} and (ends_at is null or ends_at > now())` : [];
      if (has) done.push('already has ' + c!.name);
      else if (c) {
        const ends = c.validity === '6m' ? tx`now() + interval '6 months'` : c.validity === '12m' || !c.exam_date ? tx`now() + interval '12 months'` : tx`${c.exam_date}::date + interval '1 day'`;
        await tx`insert into entitlements (user_id, course_id, ends_at, source) values (${u.id}, ${c.id}, ${ends}, 'grant')`;
        done.push(c.name + ' granted');
      }
    }
    if (s.batchId !== '') {
      const [cur] = await tx`select batch_id from batch_members where user_id = ${u.id} limit 1`;
      if ((cur?.batch_id ?? 'none') !== s.batchId) {
        await tx`delete from batch_members where user_id = ${u.id}`;
        if (s.batchId !== 'none') await tx`insert into batch_members (batch_id, user_id) values (${s.batchId}, ${u.id})`;
        done.push('batch updated');
      }
    }
    const credits = Math.round(s.credits);
    if (canGrant && credits > 0 && credits <= 1000) {
      await grantBonus(u.id, credits, 'grant', 'grant-' + crypto.randomUUID(), tx);
      done.push(`${credits} bonus Guru coins added`);
    }
    if (me.role === 'admin' && s.role && s.role !== u.role && ['student', 'faculty', 'content', 'support', 'admin'].includes(s.role)) {
      if (u.id === me.id) throw new Error('You cannot change your own role');
      await tx`update users set role = ${s.role} where id = ${u.id}`;
      done.push('role set to ' + s.role);
    }
  }).catch(e => { done.length = 0; done.push('!' + (e as Error).message); });
  if (done[0]?.startsWith('!')) return { ok: false, message: done[0].slice(1) };
  revalidatePath('/admin/students');
  return { ok: true, message: done.length ? 'Student updated · ' + done.join(' · ') : 'Nothing to change' };
}

/** Enrol one student (offline payment, or a plan paid outside the website). Admin and support only. */
export async function enrol(input: EnrolInput) {
  const me = await staffOrThrow('students');
  if (me.role !== 'admin' && me.role !== 'support') return { ok: false, message: 'Only admin and support can enrol students' };
  const r = await enrolStudent(input, me.id);
  revalidatePath('/admin/students');
  return r;
}

/**
 * Enrols a whole list at once (one student per line: "mobile, name" or "mobile, name, amount").
 * Every line gets the same course, batch and payment method.
 */
export async function enrolMany(lines: string, common: Omit<EnrolInput, 'phone' | 'name'>) {
  const me = await staffOrThrow('students');
  if (me.role !== 'admin' && me.role !== 'support') return { ok: false, message: 'Only admin and support can enrol students' };
  const rows = String(lines ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 300);
  if (!rows.length) return { ok: false, message: 'Add at least one student: mobile, name' };
  let ok = 0;
  const failed: string[] = [];
  for (const line of rows) {
    const [phone, name = '', amount] = line.split(/\t|,/).map(x => x.trim());
    const r = await enrolStudent({ ...common, phone, name, amount: amount && Number.isFinite(Number(amount)) ? Number(amount) : common.amount }, me.id);
    if (r.ok) ok++; else failed.push(r.message);
  }
  revalidatePath('/admin/students');
  return { ok: ok > 0, message: `${ok} of ${rows.length} enrolled` + (failed.length ? ` · not done: ${failed.slice(0, 3).join('; ')}${failed.length > 3 ? ` (+${failed.length - 3} more)` : ''}` : '') };
}
