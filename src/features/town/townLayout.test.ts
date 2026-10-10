import { describe, expect, it } from 'vitest';
import { getTownLayout, TOWN_PLOT_SIZE, type TownArea } from './townLayout';

const overlaps = (a: TownArea, b: TownArea) => a.left < b.left + b.width && a.left + a.width > b.left
  && a.top < b.top + b.height && a.top + a.height > b.top;

describe('town square layout', () => {
  it.each([38, 46, 48, 96])('places all %i houses around an open square without blocking streets', count => {
    const layout = getTownLayout(count);
    expect(layout.positions).toHaveLength(count);
    expect(new Set(layout.positions.map(p => `${p.left}:${p.top}`)).size).toBe(count);
    expect(new Set(layout.positions.map(p => p.side))).toEqual(new Set(['north', 'south', 'west', 'east']));
    const houses = layout.positions.map(p => ({ ...p, width: TOWN_PLOT_SIZE, height: TOWN_PLOT_SIZE }));
    for (const house of houses) {
      expect(house.left).toBeGreaterThanOrEqual(0);
      expect(house.top).toBeGreaterThanOrEqual(0);
      expect(house.left + house.width).toBeLessThanOrEqual(layout.width);
      expect(house.top + house.height).toBeLessThanOrEqual(layout.height);
      expect(overlaps(house, layout.square)).toBe(false);
      expect(layout.entrances.some(street => overlaps(house, street))).toBe(false);
    }
    for (let i = 0; i < houses.length; i++) for (let j = i + 1; j < houses.length; j++) {
      expect(overlaps(houses[i], houses[j])).toBe(false);
    }
    expect(layout.plaza.width).toBeGreaterThan(400);
    expect(layout.plaza.height).toBeGreaterThan(400);
    expect(layout.entrances).toHaveLength(4);
    expect(getTownLayout(count)).toEqual(layout);
  });

  it('keeps small and empty units valid without creating extra houses', () => {
    for (const count of [0, 1, 3, -1, NaN]) {
      const layout = getTownLayout(count);
      expect(layout.positions).toHaveLength(Number.isFinite(count) ? Math.max(0, count) : 0);
    }
  });
});
