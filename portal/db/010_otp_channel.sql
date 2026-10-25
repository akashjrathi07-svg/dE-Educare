-- How each login code was sent (whatsapp, sms, or sms_fallback after WhatsApp could not deliver),
-- and the WhatsApp message id so a "failed" delivery report can trigger the SMS fallback.
alter table otp_requests add column if not exists channel text not null default 'sms';
alter table otp_requests add column if not exists wa_message_id text;
create index if not exists otp_requests_wa_idx on otp_requests (wa_message_id) where wa_message_id is not null;
