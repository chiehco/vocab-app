import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit31.json';
import pack from '../../../public/data/v1/sa-pack.json';
import {allQuestions,findUnit,templateGroup,validGroup} from './model';
import {groupWordIds,resolveGroupWords} from './groupScope';
import {getOrCreateTemplateGroup,saveGroup} from './store';
import {textbookUnits} from '../vocabulary/textbookCatalog';
import {practiceIds} from '../vocabulary/model';
import {contentDb} from '../../db/contentDb';
import {progressDb} from '../../db/progressDb';
import {ensureContentAvailable,refreshInstalledContent} from '../../db/seed';
import {siegeUnitWords} from '../siege/model';
import {gradeFlashcard} from '../../checkin/recordActivity';
const unit=findUnit(31,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["triangle", "shut", "wallet", "addition", "express", "expression", "phrase", "loss", "gain", "couple", "partner", "wedding", "marriage", "marry", "match", "meaning", "means", "form", "former", "latter", "distant", "distance", "gather", "respect", "trade", "commercial", "businessman", "difficulty", "enemy", "sample", "toast", "cereal", "cream", "pudding", "whole", "weigh", "weight", "degree", "trick", "wound", "confident"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:23},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>271+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:281,printedUnit:'Unit 32',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===31)).toMatchObject({count:95,usageCount:68,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(163);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["triangular", "handbag", "subtraction", "multiplication", "expresses", "lost", "newlywed", "matches", "matchless", "matchmaker", "meaningless", "businessmen", "businesswoman", "businesswomen", "enemies", "heavyweight", "lightweight"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 17 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(17);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(17);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 78 mapped identities in a complete 163-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(163);expect(ids).toHaveLength(78);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(78);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',31,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U31',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U31',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U31 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U31 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="purse")).toMatchObject({printedLabel:"延伸",sourcePage:271});
 expect(vocabulary.find(i=>i.displayWord==="handbag")).toMatchObject({printedLabel:"=",sourcePage:271});
 expect(vocabulary.find(i=>i.displayWord==="subtraction")).toMatchObject({printedLabel:"延伸",sourcePage:271});
 expect(vocabulary.find(i=>i.displayWord==="expresses")).toMatchObject({printedLabel:"複",sourcePage:271});
 expect(vocabulary.find(i=>i.displayWord==="newlywed")).toMatchObject({printedLabel:"延伸",sourcePage:273});
 expect(vocabulary.find(i=>i.displayWord==="meaningless")).toMatchObject({printedLabel:"衍",sourcePage:274});
 expect(vocabulary.find(i=>i.displayWord==="resume")).toMatchObject({printedLabel:"*",sourcePage:275});
 expect(vocabulary.find(i=>i.displayWord==="businesswoman")).toMatchObject({printedLabel:"反",sourcePage:277});
 expect(vocabulary.find(i=>i.displayWord==="businesswomen")).toMatchObject({printedLabel:"複",sourcePage:277});
 expect(vocabulary.find(i=>i.displayWord==="confidential")).toMatchObject({printedLabel:"衍",sourcePage:280});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="shut（三態同形）")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="means（單複數同形）")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="in addition to + N/V-ing = besides + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="marry sb = get married to sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="by no means = not... by any means")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="random sampling")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a PhD degree")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="0 degrees（非 0 degree）")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="rub salt into the wound")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("No pain, no gain."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("You can't teach an old dog new tricks."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Time heals all wounds."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===277&&i.label==="random sampling")).toMatchObject({printedLabel:"延伸"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===31)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
