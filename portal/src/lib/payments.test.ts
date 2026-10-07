import { describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';

vi.mock('server-only', () => ({}));
vi.mock('./server/db', () => ({ sql: {} }));

describe('razorpay signatures', async () => {
  process.env.RAZORPAY_KEY_SECRET = 'key_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'hook_secret';
  const { checkoutSignatureValid, webhookSignatureValid } = await import('./server/payments');

  it('accepts a correct checkout signature and rejects a tampered one', () => {
    const sig = crypto.createHmac('sha256', 'key_secret').update('order_1|pay_1').digest('hex');
    expect(checkoutSignatureValid('order_1', 'pay_1', sig)).toBe(true);
    expect(checkoutSignatureValid('order_1', 'pay_2', sig)).toBe(false);
    expect(checkoutSignatureValid('order_1', 'pay_1', 'short')).toBe(false);
  });

  it('verifies webhook bodies with the webhook secret', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const sig = crypto.createHmac('sha256', 'hook_secret').update(body).digest('hex');
    expect(webhookSignatureValid(body, sig)).toBe(true);
    expect(webhookSignatureValid(body + ' ', sig)).toBe(false);
  });
});
