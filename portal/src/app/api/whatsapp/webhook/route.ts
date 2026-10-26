import { smsFallbackForWhatsApp } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { validWebhookSignature } from '@/lib/server/whatsapp';

/**
 * Meta WhatsApp webhook (WhatsApp → Configuration → Webhook, field "messages").
 * GET: Meta's one-time verification. POST: delivery reports; a failed login code is re-sent by SMS.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === token) {
    return new Response(q.get('hub.challenge') ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

type Status = { id: string; status: string; errors?: { code?: number; title?: string; error_data?: { details?: string } }[] };
type Payload = { entry?: { changes?: { value?: { statuses?: Status[] } }[] }[] };

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get('x-hub-signature-256'))) return new Response('Bad signature', { status: 401 });
  let body: Payload = {};
  try { body = JSON.parse(raw); } catch { return new Response('ok'); }
  const statuses = (body.entry ?? []).flatMap(e => e.changes ?? []).flatMap(c => c.value?.statuses ?? []);
  // Keep the latest delivery report on the login code, with Meta's reason when it failed.
  for (const s of statuses) {
    const e = s.errors?.[0];
    const reason = e ? `${e.code ?? ''} ${e.title ?? ''}${e.error_data?.details ? ' · ' + e.error_data.details : ''}`.trim().slice(0, 300) : null;
    await sql`update otp_requests set wa_status = ${s.status}, wa_error = coalesce(${reason}, wa_error) where wa_message_id = ${s.id}`.catch(() => null);
  }
  const failed = statuses.filter(s => s.status === 'failed');
  for (const s of failed) {
    const sent = await smsFallbackForWhatsApp(s.id).catch(() => false);
    console.warn('WhatsApp OTP failed:', s.errors?.[0]?.code, s.errors?.[0]?.title ?? '', sent ? '· sent by SMS instead' : '');
  }
  // Meta retries anything that is not a 200, so always answer 200 once the signature is good.
  return new Response('ok');
}
