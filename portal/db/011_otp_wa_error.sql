-- Meta's reason when a WhatsApp login code could not be sent (code + message, no personal data), for diagnosis.
alter table otp_requests add column if not exists wa_error text;
