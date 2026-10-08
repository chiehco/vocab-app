import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { exportProgress } from '../../backup/backup';
import { curriculumUnits, templateGroup } from './model';
import { getOrCreateTemplateGroup, saveGroup, startGroupSession } from './store';

beforeEach(async () => { await progressDb.delete(); await progressDb.open(); });
afterEach(async () => { await progressDb.delete(); });

it.each(curriculumUnits)('$level Unit $unit reuses its template without overwriting edits or learning records', async unit => {
  const first = await getOrCreateTemplateGroup(unit.unit, unit.level);
  expect(first.added).toBe(true);
  expect(first.group.templateId).toBe(unit.templateId);
  await startGroupSession(first.group.id);
  await saveGroup({ ...first.group, name: '我改的單元', itemIds: first.group.itemIds.slice(1).reverse(), wordIds: ['W000002'] });
  const before = await exportProgress();
  const reopened = await getOrCreateTemplateGroup(unit.unit, unit.level);
  expect(reopened.added).toBe(false);
  expect(reopened.group).toEqual(before.data.customGroups![0]);
  expect((await exportProgress()).data).toEqual(before.data);
  expect(await progressDb.customGroups.count()).toBe(1);
});

it('serializes simultaneous requests and distinguishes templates from same-name personal groups', async () => {
  const personal = { ...templateGroup(17, 'LV4'), templateId: null, templateRevision: null };
  await saveGroup(personal);
  const results = await Promise.all(Array.from({ length: 4 }, () => getOrCreateTemplateGroup(17, 'LV4')));
  expect(results.filter(result => result.added)).toHaveLength(1);
  expect(new Set(results.map(result => result.group.id)).size).toBe(1);
  expect(results[0].group.id).not.toBe(personal.id);
  const other = await getOrCreateTemplateGroup(1, 'LV3');
  expect(other.added).toBe(true);
  expect(other.group.id).not.toBe(results[0].group.id);
  expect(await progressDb.customGroups.count()).toBe(3);
});
