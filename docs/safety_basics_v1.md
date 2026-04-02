# Safety basics (v1)

## 1) OTP verification
Even for MVP, verify phone number for both `Client` and `Worker`.

Backend storage:
- Table: `otp_requests`
- Fields:
  - `phone`, `role`, `otp_hash`
  - `created_at`, `expires_at`
  - `attempts_used`, `is_verified`

MVP behavior:
- allow `maxAttempts` (e.g., 5)
- OTP expires quickly (e.g., 5 minutes)

## 2) SOS / emergency contact
Add an SOS button in both apps.

Backend storage:
- Table: `sos_events`
- Log includes:
  - `user_id`, optional `job_id`
  - `lat`, `lon` (if available)
  - `actor_role` and `message`
  - status: `Raised` / `Resolved`

Admin action:
- view SOS events and resolve them after manual follow-up.

## 3) Audit logs
All state changes are stored in:
- `job_events` (append-only)

Every job status change should write a `job_events` row with:
- `status`
- `actor_role` (`client`, `worker`, `admin`, `system`)
- optional `meta` (e.g., dispute reason code)

## 4) Dispute reason codes
Use a controlled set of reason codes (example):
- `no_show`
- `fraud`
- `payment_issue`
- `safety_concern`
- `work_not_as_described`
- `other`

Store the reason in:
- `job_events.meta.reason` when admin cancels or resolves a dispute.

