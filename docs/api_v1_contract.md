# UberHelperMVP v1 API contract (minimal)

This is the MVP backend API contract used by the Android Client + Worker apps.

## Auth (OTP stub in v1)
- `POST /auth/otp/request` (phone, role) -> returns `requestId`
- `POST /auth/otp/verify` (requestId, otp) -> returns `userToken`

## Worker availability
- `POST /workers/availability` (workerToken, isAvailable, categories, lat, lon) -> 200
- `GET /workers/nearby?lat=&lon=&limit=` -> returns nearby available workerIds (for debugging in v1)

## Job lifecycle
- `POST /jobs` (clientToken, category, durationHours, jobAmountCashCents, pickupLat, pickupLon, pickupAddress, requestedTime) -> `jobId`
- `GET /jobs/:jobId` -> job + current status + worker info (after accept)
- `POST /jobs/:jobId/offer` (backend internal) -> creates job_offers
- `POST /jobs/:jobId/status` (clientToken or workerToken, newStatus, optionalMeta) -> append job_events and update job status

## Offers
- `POST /job_offers/:offerId/decision` (workerToken, accept|reject) -> updates job_offers decision

## Fee after completion
- When a job transitions to `Completed`, backend creates a `fees` row:
  - `fee_amount_cents = job_amount_cash_cents * 0.10`
- `POST /fees/:feeId/upi-request` (backend internal or admin) -> returns UPI payment link/deeplink

## Admin (minimal)
- `GET /admin/jobs/:jobId/events`
- `POST /admin/jobs/:jobId/cancel` reason

