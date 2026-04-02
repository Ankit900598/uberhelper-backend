# Matching engine (v1) - nearest workers

## Inputs
- Client location: `clientLat`, `clientLon`
- Available workers (server-maintained): list of `(workerId, lat, lon, lastSeenAt)`

## Spatial indexing (grid cells)
To make “nearest in minutes” fast for an MVP, we:
- Divide Delhi into fixed grid cells using a constant cell size (meters -> degrees).
- Keep a map: `cellKey -> workers[]`

## Ring expansion
When a client requests:
- Convert client location to its grid cell.
- Scan neighboring cells ring-by-ring: `ring = 0..maxRing`
- Collect workers encountered, de-duplicate by `workerId`.

## Closest-N selection
- Compute real distance using haversine meters.
- Sort all collected workers by distance.
- Select the nearest `N` (default `N=3..10`) to send offers.

## Timeout behavior (server-side)
The dispatch algorithm above returns the closest workers in one shot.
In the real backend, you will:
- Send offers to those `N`.
- Start `T_offer_ms` timer (e.g., 20–30 seconds).
- If none accept, re-run search with bigger `maxRing` / larger cell scan.

## Notes
- This is “Uber-like fast” without complex geo indices.
- For production scaling, replace with geohash indexing or a geo-capable DB.

