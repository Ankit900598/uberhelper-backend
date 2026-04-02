# Pilot in Delhi (v1) - runbook + tuning plan

## Goal
Test whether “nearby in minutes” matching works for 2–4 hour `QuickHelper` jobs in one Delhi locality, with enough repeatability to start scaling.

## Suggested pilot locality (choose 1)
Pick one area where you can recruit 80–200 workers within 1–2 weeks and where shops/hotels are concentrated.

## Pilot groups
- Workers: 100–200 (start with 100, grow as acceptance improves)
- Clients: 20–50 businesses/people (hotels, restaurants, shops)

## Timeline (4–14 days)
- Day 1–2: recruit workers + onboarding + “Available now” practice test
- Day 3–5: test job request flow + accept/reject responsiveness
- Day 6–10: run real bookings with tracking + manual admin overrides
- Day 11–14: tune dispatch parameters based on collected metrics and repeat

## KPIs to track (must)
1. `time_to_first_acceptance_ms` (goal: < 120000ms average)
2. `offer_success_rate` = accepted offers / total offers (target: 0.20–0.30)
3. `no_show_rate` (target: < 5%)
4. Worker retention: repeat jobs per worker

## Algorithm knobs to tune
Stored in `backend/config/pilot_params.json`.

- `grid.cellSizeMeters` (typical 300–600m)
  - If acceptance is slow: decrease cell size (more precise neighborhood).
  - If you dispatch too few workers: increase cell size.
- `grid.maxRingForInitialDispatch`
  - Increase if “no worker accepted” happens too often.
  - Decrease if offers feel too far-away.
- `dispatch.offerTimeoutMs` (default 25s)
  - If users wait too long: reduce.
  - If offers are ignored: increase slightly.
- `dispatch.offerToClosestN`
  - Higher N improves success rate but increases worker spam.

## Dispatch behavior (simple policy for MVP)
For each job request:
1. Try dispatch using initial ring depth.
2. Send offers to `offerToClosestN` nearest workers among workers found.
3. If none accept within `offerTimeoutMs`, run fallback with bigger ring depth (up to a max attempts).

## Operational checklist (solo founder)
- Approve workers quickly (`is_approved=true`)
- Watch for patterns:
  - Workers not updating `Arrived/Started`
  - Clients marking `Completed` too early
  - Frequent cancellations by one side
- Keep a simple spreadsheet of metrics by day.

