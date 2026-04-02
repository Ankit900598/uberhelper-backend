import { GridOptions, GridCell, cellToKey, latLonToCell, neighborsInRing } from "./grid";
import { haversineMeters } from "./haversine";

export interface WorkerLocation {
  workerId: string;
  lat: number;
  lon: number;
  lastSeenAt: string; // ISO string; for filtering later
}

export interface WorkerIndex {
  // For MVP: Map cellKey -> workers in that cell
  cells: Map<string, WorkerLocation[]>;
  grid: GridOptions;
}

export function buildWorkerIndex(
  availableWorkers: WorkerLocation[],
  grid: GridOptions
): WorkerIndex {
  const cells = new Map<string, WorkerLocation[]>();
  for (const w of availableWorkers) {
    const cell: GridCell = latLonToCell(w.lat, w.lon, grid);
    const key = cellToKey(cell);
    const arr = cells.get(key) ?? [];
    arr.push(w);
    cells.set(key, arr);
  }
  return { cells, grid };
}

export function getWorkersInNeighborRings(
  index: WorkerIndex,
  clientLat: number,
  clientLon: number,
  maxRing: number
): { workers: WorkerLocation[]; ringsScanned: number } {
  const clientCell = latLonToCell(clientLat, clientLon, index.grid);
  const seen = new Set<string>();
  const out: WorkerLocation[] = [];

  for (let r = 0; r <= maxRing; r++) {
    const ringCells = neighborsInRing(clientCell, r);
    for (const c of ringCells) {
      const key = cellToKey(c);
      const arr = index.cells.get(key);
      if (!arr) continue;
      for (const w of arr) {
        if (seen.has(w.workerId)) continue;
        seen.add(w.workerId);
        out.push(w);
      }
    }
    // early stop not applied here; caller decides
  }

  return { workers: out, ringsScanned: maxRing + 1 };
}

export function sortWorkersByDistance(
  workers: WorkerLocation[],
  clientLat: number,
  clientLon: number
): WorkerLocation[] {
  return workers
    .slice()
    .sort((a, b) => {
      const da = haversineMeters(clientLat, clientLon, a.lat, a.lon);
      const db = haversineMeters(clientLat, clientLon, b.lat, b.lon);
      return da - db;
    });
}

