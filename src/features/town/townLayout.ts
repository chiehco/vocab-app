export const TOWN_PLOT_SIZE = 104;
const GAP_X = 110;
const GAP_Y = 110;
const MARGIN = 12;
type Side = 'north' | 'south' | 'west' | 'east';
export interface TownPosition { left: number; top: number; side: Side }
export interface TownArea { left: number; top: number; width: number; height: number }

/** Appearance only: stable word order, a clear central square and four street entrances. */
export function getTownLayout(count: number, requestedColumns = 7) {
  const size = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const columns = Number.isFinite(requestedColumns) ? Math.max(5, Math.floor(requestedColumns) | 1) : 7;
  const rows = Math.max(5, Math.ceil((size + 9) / columns) | 1);
  const plazaRow = (rows - 3) / 2;
  const plazaColumn = (columns - 3) / 2;
  const slots: Record<Side, TownPosition[]> = { north: [], south: [], west: [], east: [] };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const side: Side | undefined = row < plazaRow ? 'north' : row >= plazaRow + 3 ? 'south'
        : col < plazaColumn ? 'west' : col >= plazaColumn + 3 ? 'east' : undefined;
      if (!side) continue;
      slots[side].push({ left: MARGIN + col * GAP_X, top: MARGIN + row * GAP_Y, side });
    }
  }
  const sides = Object.keys(slots) as Side[];
  const capacity = sides.reduce((sum, side) => sum + slots[side].length, 0);
  const quotas = sides.map(side => Math.floor(size * slots[side].length / capacity));
  let remaining = size - quotas.reduce((sum, quota) => sum + quota, 0);
  for (let i = 0; remaining > 0; i = (i + 1) % sides.length) {
    if (quotas[i] < slots[sides[i]].length) { quotas[i]++; remaining--; }
  }
  const positions = sides.flatMap((side, i) => Array.from({ length: quotas[i] }, (_, index) =>
    slots[side][quotas[i] === 1 ? Math.floor(slots[side].length / 2)
      : Math.round(index * (slots[side].length - 1) / (quotas[i] - 1))]));
  const width = MARGIN * 2 + (columns - 1) * GAP_X + TOWN_PLOT_SIZE;
  const height = MARGIN * 2 + (rows - 1) * GAP_Y + TOWN_PLOT_SIZE;
  const square: TownArea = { left: MARGIN + plazaColumn * GAP_X, top: MARGIN + plazaRow * GAP_Y,
    width: 2 * GAP_X + TOWN_PLOT_SIZE, height: 2 * GAP_Y + TOWN_PLOT_SIZE };
  const plaza: TownArea = { left: square.left + 12, top: square.top + 12,
    width: square.width - 24, height: square.height - 24 };
  const entrances: TownArea[] = [
    { left: square.left + TOWN_PLOT_SIZE, top: 0, width: GAP_X-TOWN_PLOT_SIZE, height: square.top },
    { left: square.left + TOWN_PLOT_SIZE, top: square.top + square.height, width: GAP_X-TOWN_PLOT_SIZE, height: height - square.top - square.height },
    { left: 0, top: square.top + TOWN_PLOT_SIZE, width: square.left, height: GAP_Y-TOWN_PLOT_SIZE },
    { left: square.left + square.width, top: square.top + TOWN_PLOT_SIZE, width: width - square.left - square.width, height: GAP_Y-TOWN_PLOT_SIZE },
  ];
  return { positions, width, height, square, plaza, entrances };
}

/** Fit the whole town to the available map viewport, with a centered 3×3 plaza. */
export function fitTownLayout(count: number, width: number, height: number) {
  let columns = 5, scale = 0;
  for (let candidateColumns = 5; candidateColumns <= 19; candidateColumns += 2) {
    const candidate = getTownLayout(count, candidateColumns);
    const candidateScale = Math.min(1, width / candidate.width, height / candidate.height);
    if (candidateScale > scale) { columns = candidateColumns; scale = candidateScale; }
  }
  return { columns, scale: Math.max(0.01, scale) };
}
