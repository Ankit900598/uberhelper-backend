import { getWorkersInNeighborRings, sortWorkersByDistance } from "./workerIndex";
/**
 * MVP nearest matching:
 * - Search ring-by-ring (increasing distance).
 * - Collect all workers encountered up to maxRing.
 * - Sort by real distance and take closest offerToClosestN.
 *
 * Note: In a real system, you would send offers progressively per ring
 * with timeouts; this returns the nearest set to offer in one shot.
 */
export function findClosestWorkersForClient(index, clientLat, clientLon, opts) {
    const { workers, ringsScanned } = getWorkersInNeighborRings(index, clientLat, clientLon, opts.maxRing);
    const sorted = sortWorkersByDistance(workers, clientLat, clientLon);
    return {
        selected: sorted.slice(0, opts.offerToClosestN),
        scannedRings: ringsScanned,
    };
}
