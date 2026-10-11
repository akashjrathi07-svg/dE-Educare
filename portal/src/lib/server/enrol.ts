import 'server-only';
import crypto from 'node:crypto';
import type { TransactionSql } from 'postgres';
import { sql } from './db';
import { createUser, normalisePhone } from './auth';

export const PAY_METHODS = { cash: 'Cash', upi: 'UPI', bank: 'Bank transfer', cheque: 'Cheque', card: 'Card (POS)', emi: 'EMI', free: 'Free / scholarship' } as const;
export type PayMethod = keyof typeof PAY_METHODS;

export type EnrolInput = {
  phone: string; name: string; courseId: string;
  /** '' = put them in the course's open batch automatically, 'none' = no batch, otherwise a batch id. */
  batchId: string;
  pay: PayMethod; amount: number; reference: string; note: string;
};

/**
 * Puts a student in a course's batch when the course has batches: the newest batch with free seats.
 * Used after online purchases and for enrolments with batch "automatic". Returns the batch name or null.
 */
export async function autoBatch(tx: TransactionSql, userId: string, courseId: string): Promise<string | null> {
  const [already] = await tx`select b.name from batch_members m join batches b on b.id = m.batch_id where m.user_id = ${userId} and b.course_id = ${courseId} limit 1`;
  if (already) return already.name;
  const [b] = await tx`
    select b.id, b.name from batches b
    where b.course_id = ${courseId} and (select count(*) from batch_members m where m.batch_id = b.id) < b.capacity
    order by b.start_date desc nulls last, b.created_at desc limit 1`;
  if (!b) return null;
  await tx`insert into batch_members (batch_id, user_id) values (${b.id}, ${userId}) on conflict do nothing`;
  return b.name;
}

/** Validity end for a course, as in online purchases. */
function endsAt(tx: TransactionSql, c: { validity: string; exam_date: Date | null }) {
  return c.validity === '6m' ? tx`now() + interval '6 months'` : c.validity === '12m' || !c.exam_date ? tx`now() + interval '12 months'` : tx`${c.exam_date}::date + interval '1 day'`;
}

/**
 * Enrols a student who joined offline (or paid outside the website): creates the DE Educare ID if the
 * mobile number is new, unlocks the course on web and app, records the payment with an invoice number,
 * and adds the student to a batch. The student signs in with the same mobile number.
 */
export async function enrolStudent(input: EnrolInput, staffId: string): Promise<{ ok: boolean; message: string; userId?: string }> {
  const phone = normalisePhone(input.phone ?? '');
  if (!phone) return { ok: false, message: `${input.phone || 'Mobile number'}: enter a valid 10-digit mobile number` };
  if (!(input.pay in PAY_METHODS)) return { ok: false, message: 'Pick how they paid' };
  const amount = input.pay === 'free' ? 0 : Math.round(Number(input.amount) * 100);
  if (input.pay !== 'free' && !(amount > 0 && amount <= 100_000_000)) return { ok: false, message: 'Enter the amount paid in rupees' };
  const [course] = await sql`select c.id, c.name, c.validity, e.exam_date, e.code as exam, e.exam_group from courses c left join exams e on e.id = c.exam_id where c.id = ${input.courseId}`;
  if (!course) return { ok: false, message: 'Pick a course' };

  const [user] = await createUser(phone);
  const name = (input.name ?? '').trim().slice(0, 80);
  const done: string[] = [];
  await sql.begin(async tx => {
    if (name) await tx`update users set name = coalesce(nullif(name, ''), ${name}) where id = ${user.id}`;
    if (course.exam) await tx`update users set target_exam = coalesce(target_exam, ${course.exam}), exam_group = case when target_exam is null then ${course.exam_group} else exam_group end where id = ${user.id}`;

    const [has] = await tx`select 1 from entitlements where user_id = ${user.id} and course_id = ${course.id} and (ends_at is null or ends_at > now())`;
    if (has) done.push(`already had ${course.name}`);
    else if (input.pay === 'free') {
      await tx`insert into entitlements (user_id, course_id, ends_at, source) values (${user.id}, ${course.id}, ${endsAt(tx, course as never)}, 'grant')`;
      done.push(`${course.name} unlocked (free)`);
    } else {
      // Recorded like an online order so invoices and revenue include it.
      const [{ n }] = await tx`select nextval('invoice_seq')::int as n`;
      const invoice = 'DE-' + new Date().getFullYear() + '-' + String(n).padStart(6, '0');
      const [o] = await tx`
        insert into orders (user_id, course_id, amount_paise, gateway, gateway_order_id, status, invoice_no, paid_at)
        values (${user.id}, ${course.id}, ${amount}, 'offline', ${'OFFLINE-' + crypto.randomUUID()}, 'paid', ${invoice}, now()) returning id`;
      await tx`insert into payments (order_id, gateway_payment_id, method, amount_paise, raw)
        values (${o.id}, ${'OFFLINE-' + crypto.randomUUID()}, ${input.pay}, ${amount},
                ${tx.json({ reference: (input.reference ?? '').slice(0, 120), note: (input.note ?? '').slice(0, 500), by: staffId } as never)})`;
      await tx`insert into entitlements (user_id, course_id, ends_at, source, order_id) values (${user.id}, ${course.id}, ${endsAt(tx, course as never)}, 'purchase', ${o.id})`;
      done.push(`${course.name} unlocked · invoice ${invoice}`);
    }

    if (input.batchId === '') {
      const b = await autoBatch(tx, user.id, course.id);
      if (b) done.push('batch ' + b);
    } else if (input.batchId !== 'none') {
      const [b] = await tx`select id, name from batches where id = ${input.batchId}`;
      if (b) {
        await tx`delete from batch_members where user_id = ${user.id}`;
        await tx`insert into batch_members (batch_id, user_id) values (${b.id}, ${user.id})`;
        done.push('batch ' + b.name);
      }
    }
  });
  const who = name || user.name || phone.replace(/^\+91/, '');
  return { ok: true, message: `${who}: ${done.join(' · ')}`, userId: user.id };
}
