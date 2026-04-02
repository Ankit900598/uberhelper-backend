// Grid cell bucketing for spatial indexing (MVP-friendly).
// We use a fixed cell size in degrees based on ~111111 meters per degree latitude.
export function cellSizeDeg(cellSizeMeters) {
    return cellSizeMeters / 111111; // approx meters per degree
}
export function latLonToCell(lat, lon, opts) {
    const s = cellSizeDeg(opts.cellSizeMeters);
    return {
        x: Math.floor(lon / s),
        y: Math.floor(lat / s),
    };
}
export function cellToKey(cell) {
    return `${cell.x}:${cell.y}`;
}
export function neighborsInRing(cell, ring) {
    // ring=0 => only itself
    if (ring === 0)
        return [cell];
    const out = [];
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
