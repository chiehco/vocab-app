import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import baseline from '../../scripts/fixtures/lv6-main-integration-baseline.json';
import pack from '../../public/data/v1/sa-pack.json';
import { contentDb } from './contentDb';
import { ensureContentAvailable } from './seed';
import { curriculumUnits, findUnit } from '../features/direct/model';
import { textbookUnits } from '../features/vocabulary/textbookCatalog';
import { unitReleaseHold } from '../features/vocabulary/unitReleasePolicy';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(row).sort().map(key => [key, stable(row[key])]));
  }
  return value;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(contentDb.tables.map(table => table.clear()));
});

it('keeps every complete published starter payload and registers only the 24 accepted LV6 units', () => {
  for (const dataset of baseline.datasets) {
    const rows = pack[dataset.name as keyof typeof pack] as unknown as Record<string, unknown>[];
    const oldIds = new Set(dataset.ids);
    const retained = rows.filter(row => oldIds.has(String(row[dataset.key])));
    expect(retained.map(row => row[dataset.key])).toEqual(dataset.ids);
    expect(createHash('sha256').update(JSON.stringify(stable(retained))).digest('hex')).toBe(dataset.payloadSha256);
  }
  const catalogKeys = new Set(textbookUnits.map(unit => `${unit.level}:${unit.unit}`));
  expect(baseline.mainPublicUnitKeys.every(key => catalogKeys.has(key))).toBe(true);
  expect(textbookUnits).toHaveLength(baseline.mainPublicUnitKeys.length + baseline.lv6Units.length);
  expect(textbookUnits.filter(unit => unit.level === 'LV6').map(unit => unit.unit)).toEqual(baseline.lv6Units);
  expect(curriculumUnits.filter(unit => unit.level === 'LV6')).toHaveLength(24);
  expect(findUnit(21, 'LV6')).toBeUndefined();
  expect(unitReleaseHold('LV6', 21)?.message).toContain('p199 完整來源待補');
  expect(textbookUnits.filter(unit => unit.level === 'LV4')).toHaveLength(23);
  expect(textbookUnits.filter(unit => unit.level === 'LV5')).toHaveLength(18);
  expect(unitReleaseHold('LV4', 2)?.message).toContain('p22 完整來源待補');
});

it('bootstraps all former main identities and every accepted LV6 mapping from the starter alone', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (!url.endsWith('/sa-pack.json')) throw Error('Unexpected full-data fallback: ' + url);
    return new Response(JSON.stringify(pack));
  }));
  await ensureContentAvailable();
  const installed = new Set((await contentDb.words.toArray()).map(word => word.wordId));
  expect(installed.size).toBe(pack.words.length);
  expect(baseline.mainWordIds).toHaveLength(5052);
  expect(baseline.mainWordIds.every(id => installed.has(id))).toBe(true);
  const mapped = curriculumUnits.filter(unit => unit.level === 'LV6').flatMap(unit =>
    unit.items.flatMap(item => item.kind === 'vocabulary' && item.officialWordId ? [item.officialWordId] : []));
  expect(mapped.every(id => installed.has(id))).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
}, 30000);
