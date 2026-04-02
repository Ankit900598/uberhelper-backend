-- MVP: store worker UPI ID for fee collection

alter table worker_profiles
add column if not exists worker_upi_id text;

