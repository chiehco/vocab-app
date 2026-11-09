import {originalUnit13Items} from './lv3Unit13History.testSupport';
import {lv3AfterUnitPublishedText} from './lv3Audit.testSupport';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import currentWords from '../../../public/data/v1/words.json';
import currentSenses from '../../../public/data/v1/senses.json';
import currentExamples from '../../../public/data/v1/examples.json';
import currentRelations from '../../../public/data/v1/relations.json';
import currentMorphemes from '../../../public/data/v1/morphemes.json';
import currentNotes from '../../../public/data/v1/notes.json';
import currentExamPriority from '../../../public/data/v1/exam_priority.json';
import currentHooks from '../../../public/data/v1/hooks.json';
import currentMedia from '../../../public/data/v1/media.json';
import currentMeta from '../../../public/data/v1/meta.json';
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source from '../../../scripts/sources/LV3Unit13.json';
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

const unit=findUnit(13,'LV3')!;
const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());

it('keeps all 45 independent boxes, numbered 1–33 and p131–142 content in book order',()=>{
  const heads=['cast','squeeze','twist','award','medal','drip','journey','client','precious',
    'jet','mystery','mankind','humankind','campus','scream','roar','yell','harm','harmful',
    'budget','flame','wipe','angel','devil','barrel','bucket','pail','clue','hint','eager',
    'spin','romantic','passion','warmth','adventure','adventurous','studio','verse','bride',
    'bore','presence','doughnut','rush','bitter','bookcase'];
  expect(source.headwordOrder).toEqual(heads);
  expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
  expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber))
    .toEqual(Array.from({length:33},(_,i)=>i+1));
  expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:13},(_,i)=>131+i));
  expect(source.photos.at(-1)).toMatchObject({sourcePage:143,printedUnit:'Unit 14',pageType:'boundary'});
  expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(12);
  expect(textbookUnits.find(u=>u.level==='LV3'&&u.unit===13))
    .toMatchObject({count:112,usageCount:73,partial:false});
  expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(185);
});

it('retains every supplement and usage marker, original article and hyphenated spelling',()=>{
  const originalItems=originalUnit13Items(unit.items);
  const vocabulary=originalItems.filter(i=>i.kind==='vocabulary');
  expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel]))
    .toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
  expect(originalItems.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage]))
    .toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
  expect(vocabulary.find(i=>i.displayWord==='studio')).toMatchObject({sourcePage:140,chapterMeaningsZh:'播音室；工作室；攝影棚'});
  expect(vocabulary.find(i=>i.displayWord==='pail')).toMatchObject({sourcePage:137,sourceRole:'unnumbered_headword',officialWordId:null,chapterMeaningsZh:'桶；提桶'});
  expect(vocabulary.find(i=>i.displayWord==='risk-taking')).toMatchObject({sourcePage:140,officialWordId:null});
});

it('reuses existing dictionary identities and leaves 17 unmapped supplements pending',()=>{
  const vocabulary=originalUnit13Items(unit.items).filter(i=>i.kind==='vocabulary');
  for(const [index,row] of [...source.headwords,...source.related].entries()) {
    const item=vocabulary[index];expect(item.officialWordId).toBe(row.officialWordId);
    if(!row.officialWordId)continue;
    const word=pack.words.find(w=>w.wordId===row.officialWordId)!;
    expect(word.word).toBe(row.officialWord);
    expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
  }
  expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(19);
  expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(17);
  expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')
    .every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});

it('adopts no pictures, running examples, senses or textbook questions',()=>{
  expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);
  expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
  expect(practiceIds(unit.items)).toEqual([]);
  expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});

it('fresh lightweight installation resolves all 89 mapped identities with no fallback',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
  const group=templateGroup(unit.templateId);const ids=groupWordIds(group);
  expect(validGroup(group)).toBe(true);expect(group.itemIds).toHaveLength(185);expect(ids).toHaveLength(89);
  expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
  expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(89);
  expect(fetch).toHaveBeenCalledTimes(1);expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});

it('siege excludes pending clues while keeping both checked unmapped independent heads',()=>{
  const words=siegeUnitWords('LV3',13,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
  for(const word of ['pail','adventurous']) {
    const item=vocabulary.find(i=>i.displayWord===word)!;expect(item.officialWordId).toBeNull();
    expect(words).toContainEqual([word.toUpperCase(),item.chapterMeaningsZh]);
  }
});

it('content refresh retains all progress tables, group name and reversed original order',async()=>{
  const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
  let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U13',counts:{...pack.meta.counts,words:oldWords.length}}};
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
  await gradeFlashcard(oldWords[0].word,2,'before-U13',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
  await saveGroup({...group,name:'U13 personal order',itemIds:[...group.itemIds].reverse()});
  await progressDb.settings.put({key:'fontScale',value:1.15});
  const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
  expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
  expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
  const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);
  expect(saved.group.name).toBe('U13 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

// Current installed/imported bytes are independently checked, never replaced by history.
const currentPublished: [string, unknown, string][] = [
  ['public/data/v1/words.json',currentWords,'22668b0db30a95c14298c05f54a1e70f1be35771078fae27df5b7e48f045f12f'],
  ['public/data/v1/senses.json',currentSenses,'958cfe0c9a2185d45dfb3f596c9a7483373a5e9d69dce39e416ecf60a0fb7822'],
  ['public/data/v1/examples.json',currentExamples,'717d379c8d06087af82a597e1b448302ab5afe92efbcb2581cf8684e3c77441c'],
  ['public/data/v1/relations.json',currentRelations,'b2562fe33f212b32d426daa948d77789df6b27c941a000d32c7863f0b9c92828'],
  ['public/data/v1/morphemes.json',currentMorphemes,'e60331dfd54d3aa90c253eae86cebb8057af0786e125207db9c695b842e90433'],
  ['public/data/v1/notes.json',currentNotes,'00b457233c2aa7485fd58449bf83ad4f06230cf2734736f8a640967775f2cb8a'],
  ['public/data/v1/exam_priority.json',currentExamPriority,'afeddc9f393f59665fd8a72a11e71c771c139c66214a6962cb442e75709f54f5'],
  ['public/data/v1/hooks.json',currentHooks,'37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570'],
  ['public/data/v1/media.json',currentMedia,'ee130840a1a7467271243b550dfa89ed4f266f9518b4c270aa33cfd1de8112a5'],
  ['public/data/v1/meta.json',currentMeta,'629734c39216aaf9f254409547e9a25cb9647fb4880d81d32b3f1233487ca23a'],
  ['public/data/v1/sa-pack.json',pack,'acb11472e9d9a9c238402b91dbddc4df1a3fbe4128071b2a00cd645ad8eb5114'],
];
it.each(currentPublished)('authenticates entire current %s and its original publication', (path, imported, beforeHash)=>{
 const text=readFileSync(new URL('../../../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
 expect(imported).toEqual(JSON.parse(text));
 const original=lv3AfterUnitPublishedText('LV3-U12',path,text);
 expect(createHash('sha256').update(original).digest('hex')).toBe(beforeHash);
});
it('keeps the complete installed U13 current and rejects mutated or incomplete callers',()=>{
 const current=JSON.parse(readFileSync(new URL('./curriculumLV3Unit13.json',import.meta.url),'utf8'));
 expect(unit.items).toEqual(current.learningItems);
 expect(unit.items).toHaveLength(185);
 expect(unit.items.filter(i=>i.kind==='vocabulary')).toHaveLength(112);
 expect(unit.items.filter(i=>i.kind==='grammar')).toHaveLength(73);
 const changed=structuredClone(unit.items);changed[0].targetMeaningZh='unrecorded';
 expect(()=>originalUnit13Items(changed)).toThrow(/Installed U13 items differ/);
 expect(()=>originalUnit13Items(unit.items.slice(1))).toThrow(/Installed U13 items differ/);
 expect(()=>originalUnit13Items([...unit.items].reverse())).toThrow(/Installed U13 items differ/);
});
it('rejects unknown current U13 publication bytes and content before historical projection',()=>{
 const path='src/features/direct/curriculumLV3Unit13.json';
 const text=readFileSync(new URL('./curriculumLV3Unit13.json',import.meta.url),'utf8');
 expect(()=>lv3AfterUnitPublishedText('LV3-U12',path,text+' ')).toThrow();
 expect(()=>lv3AfterUnitPublishedText('LV3-U12',path,JSON.stringify({...JSON.parse(text),unrecorded:true})+'\n')).toThrow();
});
