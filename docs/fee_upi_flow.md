# Fee + UPI flow (v1)

## Inputs (after job completion)
- `job_id`
- `job_amount_cash_cents`
- platform fee percent (v1 = `10.00`)
- platform UPI payee ID (`platformUpiPa`, e.g. your@upi)

## Steps
1. When job status becomes `Completed`, create a `fees` row (status `Requested`).
2. Compute fee amount:
   - `fee_amount_cents = round(job_amount_cash_cents * 10 / 100)`
3. Store `fees.worker_upi_transaction_ref` when you generate the request.
4. Generate UPI deeplink for the worker to pay you:
   - `upi://pay?pa=platformUpiPa&pn=UberHelper&am=<fee_rupees>&cu=INR&tn=Fee&tr=<txRef>&mode=02`
5. Worker opens the link and completes payment in their UPI app.

## MVP note on cash payments
- Client cash is paid to worker outside the app.
- Fee is collected separately after completion via worker paying the platform (UPI link).

## What you’ll need in the app (worker onboarding)
- Worker must share `worker_upi_id` (UPI ID).
- Worker taps “Pay fee” after the job is marked Completed.

