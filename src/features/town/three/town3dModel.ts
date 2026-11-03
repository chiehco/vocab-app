import type { HouseStage } from '../houseGrowth';

export interface Town3DPlot { id: string; word: string; built: boolean; stage?: HouseStage }
export interface PlotPosition { x: number; z: number; rotation: number }
/** Four residential sides leave the centre free for the player's existing plaza. */
export function town3DPositions(count: number): PlotPosition[] {
  if (!Number.isInteger(count) || count < 0 || count > 100) throw new Error('Invalid plot count');
  const result: PlotPosition[] = [];
  for (let side = 0; side < 4; side++) {
    const n = Math.floor(count / 4) + (side < count % 4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const along = (i - (n - 1) / 2) * Math.min(3, 27 / Math.max(1, n - 1));
      result.push(side === 0 ? { x: along, z: -15, rotation: 0 }
        : side === 1 ? { x: 16, z: along, rotation: -Math.PI / 2 }
        : side === 2 ? { x: -along, z: 15, rotation: Math.PI }
        : { x: -16, z: -along, rotation: Math.PI / 2 });
    }
  }
  return result;
}

/** A closed road loop, wholly outside the plaza and inside the residential plots. */
export function residentPose(seconds: number, index: number) {
  const cycle = (Math.max(0, seconds) + index * 3.2) % 44;
  const section = Math.floor(cycle / 11);
  const progress = Math.min(1, (cycle % 11) / 9);
  const start = [[-10, -10], [10, -10], [10, 10], [-10, 10]][section];
  const end = [[10, -10], [10, 10], [-10, 10], [-10, -10]][section];
  return { x: start[0] + (end[0] - start[0]) * progress, z: start[1] + (end[1] - start[1]) * progress,
    rotation: Math.atan2(end[0] - start[0], end[1] - start[1]), walking: progress < 1 };
}
