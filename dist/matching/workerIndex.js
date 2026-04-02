import { cellToKey, latLonToCell, neighborsInRing } from "./grid";
import { haversineMeters } from "./haversine";
export function buildWorkerIndex(availableWorkers, grid) {
    const cells = new Map();
    for (const w of availableWorkers) {
        const cell = latLonToCell(w.lat, w.lon, grid);
        const key = cellToKey(cell);
        const arr = cells.get(key) ?? [];
        arr.push(w);
        cells.set(key, arr);
    }
    return { cells, grid };
}
export function getWorkersInNeighborRings(index, clientLat, clientLon, maxRing) {
    const clientCell = latLonToCell(clientLat, clientLon, index.grid);
    const seen = new Set();
    const out = [];
    for (let r = 0; r <= maxRing; r++) {
        const ringCells = neighborsInRing(clientCell, r);
        for (const c of ringCells) {
            const key = cellToKey(c);
            const arr = index.cells.get(key);
            if (!arr)
                continue;
            for (const w of arr) {
                if (seen.has(w.workerId))
                    continue;
                seen.add(w.workerId);
                out.push(w);
            }
        }
        // early stop not applied here; caller decides
    }
    return { workers: out, ringsScanned: maxRing + 1 };
}
export function sortWorkersByDistance(workers, clientLat, clientLon) {
    return workers
        .slice()
        .sort((a, b) => {
        const da = haversineMeters(clientLat, clientLon, a.lat, a.lon);
        const db = haversineMeters(clientLat, clientLon, b.lat, b.lon);
        return da - db;
    });
}
