import 'server-only';
import crypto from 'node:crypto';

/**
 * Plain-text email through Amazon SES (v2 API, signed with AWS Signature V4; no SDK needed).
 * Needs SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY in Vercel; SES_REGION defaults to ap-south-1 and
 * EMAIL_FROM to "DE Educare <noreply@deeducare.com>" (the domain must be verified in SES).
 */
export function emailReady() {
  return !!(process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_ACCESS_KEY);
}

const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac('sha256', key).update(data).digest();
const sha256 = (data: string) => crypto.createHash('sha256').update(data).digest('hex');

export async function sendEmail(to: string, subject: string, text: string, replyTo?: string): Promise<boolean> {
  if (!emailReady()) return false;
  const region = process.env.SES_REGION || 'ap-south-1';
  const host = `email.${region}.amazonaws.com`;
  const path = '/v2/email/outbound-emails';
  const body = JSON.stringify({
    FromEmailAddress: process.env.EMAIL_FROM || 'DE Educare <noreply@deeducare.com>',
    Destination: { ToAddresses: [to] },
    ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
    Content: { Simple: { Subject: { Data: subject.slice(0, 200), Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' } } } },
  });
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${region}/ses/aws4_request`;
  const signed = 'content-type;host;x-amz-date';
  const canonical = ['POST', path, '', `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`, signed, sha256(body)].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const kSigning = hmac(hmac(hmac(hmac('AWS4' + process.env.SES_SECRET_ACCESS_KEY, day), region), 'ses'), 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(toSign).digest('hex');
  try {
    const res = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json', 'x-amz-date': amzDate,
        authorization: `AWS4-HMAC-SHA256 Credential=${process.env.SES_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
      },
      body, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error('SES did not send the email:', res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error('SES request failed:', e);
    return false;
  }
}
