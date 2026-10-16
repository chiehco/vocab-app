import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source from '../../../scripts/sources/LV3Unit11.json';
import pack from '../../../public/data/v1/sa-pack.json';
import { allQuestions, findUnit, templateGroup, validGroup } from './model';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { getOrCreateTemplateGroup, saveGroup } from './store';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds } from '../vocabulary/model';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { ensureContentAvailable, refreshInstalledContent } from '../../db/seed';
import { siegeUnitWords } from '../siege/model';
import { gradeFlashcard } from '../../checkin/recordActivity';

const unit = findUnit(11, 'LV3')!;
const vocabulary = unit.items.filter(i => i.kind === 'vocabulary');
beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(t => t.clear()));
});
afterEach(() => vi.unstubAllGlobals());

it('retains all original independent boxes and numbered 1–34 in printed order', () => {
  const expected = ['forever','temporary','temporarily','maid','resist','guidance','accurate','sake',
    'toss','reserve','harbor','dock','trail','faint','trace','steady','steadily','stable','injury',
    'dealer','trader','admire','heel','satisfactory','satisfactorily','splash','impress','melt',
    'desirable','desire','badly','colony','efficient','inefficient','stale','ambassador',
    'alphabet','crab','global','foggy','dumb','pump','subtract','minus','multiply'];
  expect(source.headwordOrder).toEqual(expected);
  expect(vocabulary.slice(0, 45).map(i => i.displayWord)).toEqual(expected);
  expect(source.headwords.filter(h => h.printedNumber).map(h => h.printedNumber))
    .toEqual(Array.from({length:34}, (_, i) => i + 1));
  expect(source.photos.map(p => p.sourcePage)).toEqual(Array.from({length:13},(_,i)=>107+i));
  expect(source.photos.at(-1)).toMatchObject({sourcePage:119,printedUnit:'Unit 12',pageType:'boundary'});
  expect(source.photos.filter(p => p.pageType === 'content')).toHaveLength(12);
  expect(textbookUnits.find(u => u.level === 'LV3' && u.unit === 11))
    .toMatchObject({count:137,usageCount:75,partial:false});
  expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(212);
});

it('preserves every printed supplement and usage marker with its source page', () => {
  expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel]))
    .toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
  expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage]))
    .toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
  expect(vocabulary.find(i=>i.displayWord==='injury')).toMatchObject({
    sourcePage:112,chapterMeaningsZh:'（身體）傷害（可數）；（名譽）損壞（不可數）'});
  expect(vocabulary.find(i=>i.displayWord==='satisfactorily')).toMatchObject({
    sourcePage:113,sourceRole:'unnumbered_headword',officialWordId:null,chapterMeaningsZh:'令人滿意地'});
});

it('uses existing dictionary identities and leaves unmapped supplements pending', () => {
  for (const [index,row] of [...source.headwords,...source.related].entries()) {
    const item=vocabulary[index];
    expect(item.officialWordId).toBe(row.officialWordId);
    if (!row.officialWordId) continue;
    const word=pack.words.find(w=>w.wordId===row.officialWordId)!;
    expect(word.word).toBe(row.officialWord);
    expect(word.word===row.word || word.wordVariants.includes(row.word)).toBe(true);
  }
  expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(24);
  expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(20);
  expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')
    .every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});

it('adopts no pictures, examples, senses or textbook questions', () => {
  expect(unit.deliveryMode).toBe('text_only');
  expect(unit.questions).toEqual([]);
  expect(unit.items.every(i=>!i.illustration && !i.originalExample && !i.officialSenseId && i.practiceMode==='read_only')).toBe(true);
  expect(practiceIds(unit.items)).toEqual([]);
  expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});

it('fresh lightweight installation resolves all 112 unique mapped identities', async () => {
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));
  await ensureContentAvailable();
  const group=templateGroup(unit.templateId);
  const ids=groupWordIds(group);
  expect(validGroup(group)).toBe(true);
  expect(group.itemIds).toHaveLength(212);
  expect(ids).toHaveLength(112);
  expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
  expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(112);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});

it('siege excludes pending clues while retaining checked unmapped independent heads', () => {
  const words=siegeUnitWords('LV3',11,[]);
  expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
  for (const word of ['temporarily','steadily','satisfactorily','inefficient']) {
    const item=vocabulary.find(i=>i.displayWord===word)!;
    expect(item.officialWordId).toBeNull();
    expect(words).toContainEqual([word.toUpperCase(),item.chapterMeaningsZh]);
  }
});

it('content refresh retains all progress tables, personal group name and order', async () => {
  const ids=groupWordIds(templateGroup(unit.templateId));
  const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
  let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U11',counts:{...pack.meta.counts,words:oldWords.length}}};
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));
  await ensureContentAvailable();
  await gradeFlashcard(oldWords[0].word,2,'before-U11',true);
  const {group}=await getOrCreateTemplateGroup(unit.templateId);
  await saveGroup({...group,name:'U11 personal order',itemIds:[...group.itemIds].reverse()});
  await progressDb.settings.put({key:'fontScale',value:1.15});
  const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));
  incoming=pack;
  await refreshInstalledContent();
  expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
  expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
  const saved=await getOrCreateTemplateGroup(unit.templateId);
  expect(saved.added).toBe(false);
  expect(saved.group.name).toBe('U11 personal order');
  expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});
