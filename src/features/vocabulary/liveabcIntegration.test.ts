import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import photoAcceptance from '../../../scripts/fixtures/liveabc-photo-acceptance.json';
import { curriculumUnits, unitItems, templateGroup, validGroup, practiceQuestions } from '../direct/model';
import { getOrCreateTemplateGroup, saveGroup } from '../direct/store';
import { textbookUnits, unitKey, textbookPath, resolveTextbookScope, findUnitByKey } from './textbookCatalog';
import { isUnitPublished } from './unitReleasePolicy';
import { practiceIds } from './model';
import { progressDb } from '../../db/progressDb';
import { contentDb } from '../../db/contentDb';
import { rememberStudy, getStudyResume, resolveStudyBookmark } from '../modes/studyResume';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';
import { saveWordList, readWordList } from '../modes/wordLists';
import type { WordRecord } from '../../db/types';
import pack from '../../../public/data/v1/sa-pack.json';

const live = curriculumUnits.filter(u => u.publisher === 'liveabc');
const rows = live.flatMap(u => u.items);
beforeEach(async () => { await progressDb.delete(); await progressDb.open(); await contentDb.delete(); await contentDb.open(); });
afterEach(async () => { await progressDb.delete(); await contentDb.delete(); });

it('preserves all 135 Ivy keys, names, ordering, IDs and public datasets from the base commit', () => {
  const ivy = textbookUnits.filter(u => u.publisher === 'ivy');
  expect(ivy).toHaveLength(135);
  expect(new Set(ivy.map(unitKey)).size).toBe(135);
  for (const u of ivy) expect(unitKey(u)).toBe(`7000.ivy.${u.level}.${u.unit}`);
  for (const file of readdirSync('public/data/v1')) {
    if (!file.endsWith('.json')) continue;
    expect(JSON.parse(readFileSync(`public/data/v1/${file}`, 'utf8'))).toEqual(JSON.parse(execFileSync('git', ['show', `HEAD:public/data/v1/${file}`], { encoding:'utf8', maxBuffer:64*1024*1024 })));
  }
  const old = execFileSync('git', ['show','HEAD:src/features/direct/model.ts'], {encoding:'utf8'});
  for (const u of curriculumUnits.filter(u => !u.publisher)) {
    expect(old).toContain(`level: '${u.level}', unit: ${u.unit}, name:`);
    expect(templateGroup(u.unit, u.level).templateId).toBe(u.templateId);
  }
});

it('includes exactly seven photo units, 106 stable items, 98 existing mappings and eight notes', () => {
  expect(live.map(u => u.unit)).toEqual([1,2,3,4,5,6,7]);
  expect(live.map(u => u.items.length)).toEqual([14,13,18,13,15,20,13]);
  expect(rows).toHaveLength(106);
  expect(new Set(rows.map(i=>i.learningItemId)).size).toBe(106);
  expect(rows.filter(i=>i.officialWordId)).toHaveLength(98);
  expect(rows.filter(i=>!i.officialWordId).map(i=>i.displayWord)).toEqual(['carry out','frozen','die out','previously','rapidly','rather than','cheerfully','good-natured']);
  for (const u of live) {
    // Hashes pin the reviewed projection without requiring private photos/drafts in CI.
    const checked = photoAcceptance.units.find(row=>row.unit===u.unit)!;
    expect(u.templateId).toBe(checked.templateId);
    expect(createHash('sha256').update(JSON.stringify(u.items)).digest('hex')).toBe(checked.itemProjectionSha256);
    expect(u.bookId).toBe('liveabc-core-expanded');
    for (const item of u.items) {
      if (item.officialWordId) expect(pack.words.some(w=>w.wordId===item.officialWordId)).toBe(true);
    }
  }
});

it('keeps text-only readings separate from approved dictionary senses, questions and artwork', () => {
  expect(live.every(u=>u.deliveryMode==='text_only' && !u.questions.length && !u.relatedNotes.length)).toBe(true);
  expect(practiceIds(rows)).toEqual([]);
  expect(practiceQuestions.some(q=>q.learningItemId?.includes('LIVEABC'))).toBe(false);
  const serialized=JSON.stringify(live);
  for (const privateField of ['photoEvidence','sourceManifest','originalExample','illustration','pdfPage','candidateOnly','C:\\']) expect(serialized).not.toContain(privateField);
  for (const i of rows) { expect(i.officialSenseId).toBeNull(); expect(i).toMatchObject({review:'source_checked_text_only',practiceMode:'read_only'}); }
});

it('keeps odd adjective meanings separate from the approved odds identity', () => {
  const odd=rows.find(i=>i.displayWord==='odd')!, odds=rows.find(i=>i.displayWord==='odds')!;
  expect(odd).toMatchObject({officialWordId:'W002584',sensePos:'adj.'});
  expect(odd.targetMeaningZh).not.toContain('可能性');
  expect(odds).toMatchObject({learningItemId:'LI-LIVEABC_BASICU02-S001',officialWordId:'W004587',sensePos:'n.',targetMeaningZh:'可能性'});
});

it('resolves bare deep links and namespaces without changing legacy defaults or permitting U8+', () => {
  expect(resolveTextbookScope({volume:'LIVEABC_BASIC'})).toEqual({track:'7000',publisher:'liveabc',volume:'LIVEABC_BASIC'});
  expect(resolveTextbookScope({volume:'LV3'})).toEqual({track:'7000',publisher:'ivy',volume:'LV3'});
  expect(resolveTextbookScope({})?.publisher).toBe('ivy');
  for (const u of live) {
    expect(findUnitByKey(`7000.liveabc.LIVEABC_BASIC.${u.unit}`)?.bookId).toBe(u.bookId);
    expect(textbookPath(u.level,u.unit)).toBe(`/textbook/LIVEABC_BASIC/${u.unit}`);
    expect(isUnitPublished(u.level,u.unit)).toBe(true);
  }
  for (const level of ['LIVEABC_BASIC','LIVEABC_ADVANCED','unknown']) for (const n of [0,8,9,18,NaN]) {
    expect(isUnitPublished(level,n)).toBe(false); expect(unitItems(n,level)).toEqual([]);
    expect(()=>templateGroup(n,level)).toThrow();
  }
});

it('creates groups idempotently across books and preserves edits and pre-existing progress', async () => {
  const ivy=await getOrCreateTemplateGroup(1,'LV3');
  const ivyBefore=await progressDb.customGroups.get(ivy.group.id);
  await progressDb.settings.put({key:'legacy-preserved',value:{balance:17,unit:'7000.ivy.LV3.1'}});
  const settings=await progressDb.settings.toArray();
  const first=await getOrCreateTemplateGroup(1,'LIVEABC_BASIC');
  const edited={...first.group,name:'我的 LiveABC',itemIds:first.group.itemIds.slice(1)};
  await saveGroup(edited);
  const repeated=await Promise.all([getOrCreateTemplateGroup(1,'LIVEABC_BASIC'),getOrCreateTemplateGroup(1,'LIVEABC_BASIC')]);
  expect(repeated.every(r=>!r.added && r.group.id===first.group.id && r.group.name===edited.name)).toBe(true);
  expect(validGroup(edited)).toBe(true);
  expect(await progressDb.customGroups.count()).toBe(2);
  expect(await progressDb.customGroups.get(ivy.group.id)).toEqual(ivyBefore);
  expect(await progressDb.settings.toArray()).toEqual(settings);
  expect(await progressDb.cardStates.count()).toBe(0); expect(await progressDb.rewardWallet.count()).toBe(0);
});

it('restores the exact LiveABC supplemental card after backup and offline reopen', async () => {
  const u=live[1], i=u.items.find(i=>i.displayWord==='odds')!;
  const location={href:`/vocabulary?level=LIVEABC_BASIC&unit=2&kind=vocabulary&item=${i.learningItemId}`,title:u.name,position:13,total:13};
  await rememberStudy(location);
  const saved=await getStudyResume(); expect(saved).toMatchObject(location);
  const backup=await exportProgress(); expect(validateBackup(backup)).toBeNull();
  await progressDb.settings.clear(); await importProgress(backup);
  progressDb.close(); await progressDb.open(); expect(await getStudyResume()).toEqual(saved);
  expect(await resolveStudyBookmark({...saved,href:location.href.replace('unit=2','unit=8')})).toBeUndefined();
  expect(await progressDb.cardStates.count()).toBe(0); expect(await progressDb.customGroups.count()).toBe(0);
});

it('normal word practice excludes the eight notes and returns to the same book', async () => {
  await contentDb.words.bulkPut(pack.words as unknown as WordRecord[]);
  const u=textbookUnits.find(u=>u.publisher==='liveabc'&&u.unit===2)!;
  const words=await contentDb.words.bulkGet(u.wordIds);
  const list=await saveWordList(words.filter(w=>!!w),u.name,textbookPath(u.level,u.unit));
  expect((await readWordList(list.id))?.returnTo).toBe('/textbook/LIVEABC_BASIC/2');
  expect(list.wordIds).toHaveLength(12); expect(list.wordIds).not.toContain('W000146');
  const backup=await exportProgress(); expect(validateBackup(backup)).toBeNull();
  await progressDb.settings.clear(); await importProgress(backup);
  expect(await readWordList(list.id)).toEqual(list);
  for (const target of ['/textbook/LIVEABC_BASIC/8','/textbook/LIVEABC_BASIC/01','/textbook/LIVEABC_ADVANCED/1','https://example.com']) {
    await expect(saveWordList(words.filter(w=>!!w),u.name,target)).rejects.toThrow();
    await progressDb.settings.put({key:'word-list:invalid',value:{...list,id:'invalid',returnTo:target}});
    expect(await readWordList('invalid')).toBeUndefined();
  }
  expect(await progressDb.reviewLogs.count()).toBe(0); expect(await progressDb.rewardLedger.count()).toBe(0);
});
