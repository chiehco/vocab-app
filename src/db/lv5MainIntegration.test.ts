import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import baseline from '../../scripts/fixtures/lv5-main-integration-baseline.json';
import pack from '../../public/data/v1/sa-pack.json';
import { contentDb } from './contentDb';
import { ensureContentAvailable } from './seed';
import { curriculumUnits, findUnit, templateGroup, validGroup } from '../features/direct/model';
import { textbookUnits } from '../features/vocabulary/textbookCatalog';
import { unitReleaseHold } from '../features/vocabulary/unitReleasePolicy';

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(contentDb.tables.map(table => table.clear()));
});

it('adds only the eighteen accepted LV5 units while keeping main LV4 and its saved hidden U2 identities', () => {
  expect(textbookUnits.filter(u => u.level === 'LV4').map(u => u.unit))
    .toEqual([1, ...Array.from({ length: 22 }, (_, i) => i + 3)]);
  expect(curriculumUnits.filter(u => u.level === 'LV4')).toHaveLength(24);
  expect(textbookUnits.filter(u => u.level === 'LV5').map(u => u.unit)).toEqual(baseline.lv5Units);
  expect(curriculumUnits.filter(u => u.level === 'LV5').map(u => u.unit)).toEqual(baseline.lv5Units);
  expect(findUnit(2, 'LV4')!.items.map(i => i.learningItemId)).toEqual(baseline.mainU2ItemIds);
  expect(validGroup({ ...templateGroup(2, 'LV4'), itemIds: [...baseline.mainU2ItemIds].reverse() })).toBe(true);
  expect(unitReleaseHold('LV4', 2)?.status).toBe('source_page_pending');
  for (const [dataset, count] of Object.entries(baseline.packCounts)) {
    expect(pack[dataset as keyof typeof baseline.packCounts]).toHaveLength(count);
  }
});

it('fresh bootstrap resolves every pre-integration main word and all accepted LV5 mappings from one starter request', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (!url.endsWith('/sa-pack.json')) throw Error('Unexpected full-data fallback: ' + url);
    return new Response(JSON.stringify(pack));
  }));
  await ensureContentAvailable();
  const installed = new Set((await contentDb.words.toArray()).map(w => w.wordId));
  expect(installed.size).toBe(3824);
  expect(baseline.mainWordIds).toHaveLength(3094);
  expect(baseline.mainWordIds.every(id => installed.has(id))).toBe(true);
  const mapped = curriculumUnits.filter(u => u.level === 'LV4' || u.level === 'LV5')
    .flatMap(u => u.items.filter(i => i.kind === 'vocabulary' && i.officialWordId).map(i => i.officialWordId!));
  expect(mapped.every(id => installed.has(id))).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
}, 15000);
