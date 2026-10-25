import 'server-only';
import crypto from 'node:crypto';

/**
 * Login codes on WhatsApp through Meta's WhatsApp Cloud API, using an approved "Authentication" template
 * with a Copy code button. Settings (Vercel environment variables):
 * - WHATSAPP_TOKEN: a permanent System User access token with whatsapp_business_messaging
 * - WHATSAPP_PHONE_NUMBER_ID: the business number's Phone number ID (not the number itself)
 * - WHATSAPP_TEMPLATE: the template name (default "login_code"); WHATSAPP_TEMPLATE_LANG (default "en")
 * - WHATSAPP_APP_SECRET and WHATSAPP_VERIFY_TOKEN: for the delivery-status webhook (/api/whatsapp/webhook)
 * WhatsApp is used only when the token and phone number ID are both set; otherwise codes go by SMS.
 */
const API = () => `${process.env.WHATSAPP_API_URL || 'https://graph.facebook.com'}/${process.env.WHATSAPP_API_VERSION || 'v23.0'}`;

export function whatsappReady() {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Sends the code. "ok" means Meta accepted it; a later "failed" status arrives on the webhook. */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const res = await fetch(`${API()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone.replace('+', ''),
      type: 'template',
      template: {
        name: process.env.WHATSAPP_TEMPLATE || 'login_code',
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          // The Copy code button carries the same code.
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  const body = res ? ((await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { code?: number; message?: string } }) : {};
  const id = body.messages?.[0]?.id;
  if (!res?.ok || !id) {
    const error = `${res?.status ?? 'no response'} ${body.error?.code ?? ''} ${body.error?.message ?? ''}`.trim().slice(0, 300);
    console.error('WhatsApp did not send the OTP:', error);
    return { ok: false, error };
  }
  return { ok: true, id };
}

/** Checks Meta's X-Hub-Signature-256 header on webhook calls. */
export function validWebhookSignature(raw: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const want = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex'));
  const got = Buffer.from(header);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}
