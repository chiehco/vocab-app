export const TOWN_PLOT_SIZE = 104;
const GAP_X = 116;
const GAP_Y = 112;
const MARGIN = 20;
type Side = 'north' | 'south' | 'west' | 'east';
export interface TownPosition { left: number; top: number; side: Side }
export interface TownArea { left: number; top: number; width: number; height: number }

/** Appearance only: stable word order, a clear central square and four street entrances. */
export function getTownLayout(count: number) {
  const size = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  let cells = 9;
  while (8 * cells - 24 < size) cells += 2;
  const middle = Math.floor(cells / 2);
  const slots: Record<Side, TownPosition[]> = { north: [], south: [], west: [], east: [] };
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const side: Side | undefined = row < 2 ? 'north' : row >= cells - 2 ? 'south'
        : col < 2 ? 'west' : col >= cells - 2 ? 'east' : undefined;
      if (!side || ((side === 'north' || side === 'south') ? col === middle : row === middle)) continue;
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
  const width = MARGIN * 2 + cells * GAP_X;
  const height = MARGIN * 2 + cells * GAP_Y;
  const square: TownArea = { left: MARGIN + 2 * GAP_X, top: MARGIN + 2 * GAP_Y,
    width: (cells - 4) * GAP_X, height: (cells - 4) * GAP_Y };
  const plaza: TownArea = { left: square.left + 35, top: square.top + 35,
    width: square.width - 70, height: square.height - 70 };
  const entrances: TownArea[] = [
    { left: MARGIN + middle * GAP_X + 35, top: 0, width: 34, height: square.top },
    { left: MARGIN + middle * GAP_X + 35, top: square.top + square.height, width: 34, height: height - square.top - square.height },
    { left: 0, top: MARGIN + middle * GAP_Y + 35, width: square.left, height: 34 },
    { left: square.left + square.width, top: MARGIN + middle * GAP_Y + 35, width: width - square.left - square.width, height: 34 },
  ];
  return { positions, width, height, square, plaza, entrances };
}
