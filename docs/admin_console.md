# Admin console (v1) - MVP

## Worker approval
Workers must be approved before receiving jobs.

- Field: `worker_profiles.is_approved` (boolean)

Intended endpoints:
- `POST /admin/workers/:workerId/approve`

## Job timelines / audit
Admin can view all status changes:
- `GET /admin/jobs/:jobId/events`

## Disputes / cancellations
Admin can mark a job as cancelled and store a reason code:
- `POST /admin/jobs/:jobId/cancel` with body `{ "reason": "no_show|fraud|..." }`

Store:
- `job_events` row with `status='Cancelled'` and `meta={ reason }`

## UI
Lightweight UI is provided in:
- `backend/admin-ui/index.html`

It calls the intended endpoints via `fetch`.

