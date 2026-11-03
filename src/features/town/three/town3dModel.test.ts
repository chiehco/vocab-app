import { expect, it } from 'vitest';
import { residentPose, town3DPositions } from './town3dModel';

it('places all 38 LV1 plots on four sides, preserving an empty centre and shoreline', () => {
  const positions = town3DPositions(38);
  expect(positions).toHaveLength(38);
  expect(new Set(positions.map(p => `${p.x},${p.z}`)).size).toBe(38);
  expect(positions.every(p => Math.max(Math.abs(p.x), Math.abs(p.z)) >= 15)).toBe(true);
  expect(positions.every(p => Math.hypot(p.x / 1.13, p.z) < 23)).toBe(true);
  for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) {
    expect(Math.hypot(positions[i].x - positions[j].x, positions[i].z - positions[j].z)).toBeGreaterThan(2.6);
  }
  expect(town3DPositions(0)).toEqual([]);
  expect(() => town3DPositions(-1)).toThrow();
});

it('residents follow a continuous closed road and stop at each corner', () => {
  for (let i = 0; i < 3; i++) {
    let last = residentPose(0, i);
    for (let t = .05; t <= 88; t += .05) {
      const p = residentPose(t, i);
      expect(Math.max(Math.abs(p.x), Math.abs(p.z))).toBe(10);
      expect(Math.hypot(p.x - last.x, p.z - last.z)).toBeLessThan(.12);
      last = p;
    }
    expect(residentPose(44, i).x).toBeCloseTo(residentPose(0, i).x, 10);
    expect(residentPose(44, i).z).toBeCloseTo(residentPose(0, i).z, 10);
  }
  expect(residentPose(9.5, 0).walking).toBe(false);
  expect(residentPose(9.5, 0)).toEqual(residentPose(10.5, 0));
});
