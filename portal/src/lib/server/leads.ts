import 'server-only';
import { z } from 'zod';
import { sql } from './db';
import { sendEmail } from './email';

const str = (max: number) => z.string().trim().max(max).optional().transform(v => v || null);
export const LeadInput = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().transform(v => v.replace(/[^\d+]/g, '')).refine(v => v.replace(/\D/g, '').length >= 10 && v.replace(/\D/g, '').length <= 13, 'phone'),
  email: str(120), city: str(60), interest: str(40), interestLabel: str(120), status: str(60), message: str(600),
  form: z.string().trim().max(120).optional().transform(v => v || 'Website form'),
  page: str(400),
  utm_source: str(80), utm_medium: str(80), utm_campaign: str(120),
});
export type LeadInput = z.input<typeof LeadInput>;

/** Where lead emails go (LEAD_EMAIL_TO in Vercel overrides it). */
const LEAD_TO = () => process.env.LEAD_EMAIL_TO || 'contact@deeducare.com';

/** Saves a website lead and emails it. A repeat from the same number within 2 minutes is ignored. */
export async function saveLead(raw: unknown): Promise<{ ok: true; emailed: boolean } | { ok: false; error: string }> {
  const p = LeadInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'Please enter your name and a 10-digit mobile number.' };
  const l = p.data;
  const [dup] = await sql`select id from leads where phone = ${l.phone} and created_at > now() - interval '2 minutes'`;
  if (dup) return { ok: true, emailed: true };
  const utm = Object.fromEntries(Object.entries({ source: l.utm_source, medium: l.utm_medium, campaign: l.utm_campaign }).filter(([, v]) => v));
  await sql`
    insert into leads (name, phone, email, city, interest, interest_label, currently, message, form, page, utm)
    values (${l.name}, ${l.phone}, ${l.email}, ${l.city}, ${l.interest}, ${l.interestLabel}, ${l.status}, ${l.message}, ${l.form}, ${l.page}, ${sql.json(utm)})`;
  const lines = [
    `New enquiry from deeducare.com`, '',
    `Form: ${l.form}`, `Name: ${l.name}`, `Mobile: ${l.phone}`,
    l.email && `Email: ${l.email}`, l.city && `City: ${l.city}`, l.interestLabel && `Interested in: ${l.interestLabel}`,
    l.status && `Currently: ${l.status}`, l.message && `Message: ${l.message}`, l.page && `Page: ${l.page}`,
    Object.keys(utm).length ? `Campaign: ${Object.values(utm).join(' / ')}` : null,
    '', 'All leads: https://portal.deeducare.com/admin/leads',
  ].filter(Boolean).join('\n');
  const emailed = await sendEmail(LEAD_TO(), `Enquiry: ${l.name} · ${l.interestLabel ?? 'Website'} · ${l.form}`, lines, l.email ?? undefined);
  return { ok: true, emailed };
}
