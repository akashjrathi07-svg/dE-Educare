import 'server-only';

/**
 * Sends the login code. SMS_PROVIDER:
 * - "msg91": real SMS through MSG91's OTP API (needs a DLT-approved template in India).
 * - "console": prints the code to the server log and shows it on the login screen. Refused in production.
 */
export async function sendOtpSms(phone: string, code: string): Promise<{ ok: boolean; devCode?: string }> {
  const provider = process.env.SMS_PROVIDER || 'console';
  if (provider === 'msg91') {
    const res = await fetch('https://control.msg91.com/api/v5/otp?' + new URLSearchParams({
      template_id: process.env.MSG91_TEMPLATE_ID || '',
      mobile: phone.replace('+', ''),
      otp: code,
    }), { method: 'POST', headers: { authkey: process.env.MSG91_AUTH_KEY || '', 'content-type': 'application/json' } });
    return { ok: res.ok };
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_CONSOLE_OTP !== '1') {
    console.error('SMS_PROVIDER is "console" in production. Set SMS_PROVIDER=msg91.');
    return { ok: false };
  }
  console.log(`[otp] ${phone}: ${code}`);
  return { ok: true, devCode: code };
}
