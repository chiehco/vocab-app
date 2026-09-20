import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import type { WordRecord } from '../../db/types';
import bootstrap from '../../../public/data/v1/sa-pack.json';
import images from '../vocabulary/lv1ReviewedImages.json';
import { addLV1ReviewedGroups, lv1ReviewedGroups } from './lv1ReviewedGroups';
import { exportProgress } from '../../backup/backup';
import { saveGroup } from './store';
import { validGroup } from './model';
import { resolveGroupWords } from './groupScope';

beforeEach(async () => {
  await progressDb.delete(); await progressDb.open();
  await contentDb.delete(); await contentDb.open();
  await contentDb.words.bulkPut(bootstrap.words as WordRecord[]);
});
afterEach(async () => { await progressDb.delete(); await contentDb.delete(); });

it('covers all 15 approved units without inventing supplemental IDs', async () => {
  expect(lv1ReviewedGroups).toHaveLength(15);
  expect(lv1ReviewedGroups.reduce((n,g)=>n+g.pairCount,0)).toBe(434);
  expect(lv1ReviewedGroups.reduce((n,g)=>n+g.supplements.length,0)).toBe(22);
  const result = await addLV1ReviewedGroups();
  expect(result.added).toBe(15);
  for (const template of lv1ReviewedGroups) {
    const group = result.groups.find(g=>g.templateId===template.templateId)!;
    expect(validGroup(group)).toBe(true);
    expect(group.itemIds).toEqual([]);
    expect(group.wordIds).toEqual([...new Set(images.filter(i=>i.unit===template.unit).flatMap(i=>i.officialWordId?[i.officialWordId]:[]))]);
    expect(resolveGroupWords(group,bootstrap.words as WordRecord[])).toHaveLength(group.wordIds!.length);
  }
  expect(result.groups[1].wordIds).toHaveLength(37); // movie/film shares one official card.
});

it('is idempotent across concurrent additions and never overwrites personal edits or progress', async () => {
  await saveGroup({id:'personal',name:'LV1 Unit 01（已核准）',itemIds:[],wordIds:['W000114'],templateId:null,templateRevision:null,updatedAt:1});
  const before = await exportProgress();
  await Promise.all([addLV1ReviewedGroups(),addLV1ReviewedGroups()]);
  expect(await progressDb.customGroups.count()).toBe(16);
  expect(await progressDb.customGroups.get('personal')).toEqual(before.data.customGroups?.find(g=>g.id==='personal'));
  const {groups} = await addLV1ReviewedGroups([1]);
  await saveGroup({...groups[0],name:'我改的名字',wordIds:[]});
  const edited=await progressDb.customGroups.get(groups[0].id);
  expect((await addLV1ReviewedGroups([1])).added).toBe(0);
  expect(await progressDb.customGroups.get(groups[0].id)).toEqual(edited);
  const after=await exportProgress();
  for (const key of Object.keys(before.data) as (keyof typeof before.data)[]) {
    if(key!=='customGroups')expect(after.data[key]).toEqual(before.data[key]);
  }
});

it('rejects unavailable content and invalid selections without partial groups', async () => {
  await contentDb.words.clear();
  await expect(addLV1ReviewedGroups()).rejects.toThrow('尚未載入');
  expect(await progressDb.customGroups.count()).toBe(0);
  await expect(addLV1ReviewedGroups([16])).rejects.toThrow('無效');
});
