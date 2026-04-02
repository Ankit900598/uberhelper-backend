// Grid cell bucketing for spatial indexing (MVP-friendly).
// We use a fixed cell size in degrees based on ~111111 meters per degree latitude.

export interface GridOptions {
  // Typical MVP value: 300..600 meters
  cellSizeMeters: number;
}

export interface GridCell {
  x: number;
  y: number;
}

export function cellSizeDeg(cellSizeMeters: number): number {
  return cellSizeMeters / 111111; // approx meters per degree
}

export function latLonToCell(lat: number, lon: number, opts: GridOptions): GridCell {
  const s = cellSizeDeg(opts.cellSizeMeters);
  return {
    x: Math.floor(lon / s),
    y: Math.floor(lat / s),
  };
}

export function cellToKey(cell: GridCell): string {
  return `${cell.x}:${cell.y}`;
}

export function neighborsInRing(cell: GridCell, ring: number): GridCell[] {
  // ring=0 => only itself
  if (ring === 0) return [cell];

  const out: GridCell[] = [];
  const minX = cell.x - ring;
  const maxX = cell.x + ring;
  const minY = cell.y - ring;
  const maxY = cell.y + ring;

  // Top and bottom edges
  for (let x = minX; x <= maxX; x++) {
    out.push({ x, y: minY });
    out.push({ x, y: maxY });
  }
  // Left and right edges (excluding corners already added)
  for (let y = minY + 1; y <= maxY - 1; y++) {
    out.push({ x: minX, y });
    out.push({ x: maxX, y });
  }

  return out;
}

