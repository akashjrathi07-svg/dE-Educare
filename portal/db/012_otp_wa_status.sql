-- Latest WhatsApp delivery report for a login code (sent, delivered, read or failed), from the webhook.
alter table otp_requests add column if not exists wa_status text;
