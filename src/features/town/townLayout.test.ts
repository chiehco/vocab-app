import { describe, expect, it } from 'vitest';
import { fitTownLayout, getTownLayout, TOWN_PLOT_SIZE, type TownArea } from './townLayout';

const overlaps = (a: TownArea, b: TownArea) => a.left < b.left + b.width && a.left + a.width > b.left
  && a.top < b.top + b.height && a.top + a.height > b.top;

describe('town square layout', () => {
  it.each([38, 46, 48, 96].flatMap(count => [5, 7, 9, 11, 19].map(columns => [count, columns])))('places %i houses in %i columns without blocking the plaza or streets', (count, columns) => {
    const layout = getTownLayout(count, columns);
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
    expect(layout.plaza.width).toBe(300);
    expect(layout.plaza.height).toBe(300);
    expect(layout.plaza.left + layout.plaza.width / 2).toBe(layout.width / 2);
    expect(layout.plaza.top + layout.plaza.height / 2).toBe(layout.height / 2);
    expect(layout.entrances).toHaveLength(4);
    expect(getTownLayout(count, columns)).toEqual(layout);
  });

  it.each([38, 96])('fits all %i houses to portrait and landscape viewports', count => {
    const choices = new Set<number>();
    for (const [width, height] of [[351, 550], [296, 306], [351, 500], [788, 200]]) {
      const fit = fitTownLayout(count, width, height), layout = getTownLayout(count, fit.columns);
      choices.add(fit.columns);
      expect(layout.width * fit.scale).toBeLessThanOrEqual(width + .01);
      expect(layout.height * fit.scale).toBeLessThanOrEqual(height + .01);
    }
    expect(choices.size).toBeGreaterThan(1);
  });

  it('keeps small and empty units valid without creating extra houses', () => {
    for (const count of [0, 1, 3, -1, NaN]) {
      const layout = getTownLayout(count);
      expect(layout.positions).toHaveLength(Number.isFinite(count) ? Math.max(0, count) : 0);
    }
  });

  it('normalizes invalid or even column counts to a centered odd grid', () => {
    for (const columns of [0, 4, 6, -1, NaN]) {
      const layout = getTownLayout(3, columns);
      expect(layout.positions).toHaveLength(3);
      expect(layout.plaza.left + 150).toBe(layout.width / 2);
    }
  });
});
