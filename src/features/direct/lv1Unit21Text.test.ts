import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV1Unit21.json';
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
const unit=findUnit(21,'LV1')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["today", "yesterday", "tomorrow", "tonight", "wonderful", "speak", "probably", "each", "both", "hobby", "habit", "expensive", "cheap", "million", "island", "language", "tennis", "week", "weekend", "topic", "understand", "bedroom", "kitchen", "bathroom", "toilet", "yard", "polite", "pink", "lemon", "large", "giant", "grass", "enjoy", "enjoyment", "country", "national", "bored", "boring", "science"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,39).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:24},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:9},(_,i)=>180+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(8);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:188,printedUnit:'Unit 22',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===21)).toMatchObject({count:93,usageCount:45,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(138);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(39).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["extinction", "a migrant worker", "probability", "hobbies", "inexpensive", "cheaply", "topical", "understandable", "kitchenware", "yd", "yd.", "politely", "politeness", "impolite", "countries"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 15 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(15);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(15);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 77 mapped identities in a complete 138-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(138);expect(ids).toHaveLength(77);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(77);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV1',21,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,39).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U21',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U21',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U21 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U21 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="extinction"&&i.sourcePage===180&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:180});
 expect(vocabulary.find(i=>i.displayWord==="a migrant worker"&&i.sourcePage===181&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:181});
 expect(vocabulary.find(i=>i.displayWord==="hobbies"&&i.sourcePage===182&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:182});
 expect(vocabulary.find(i=>i.displayWord==="inexpensive"&&i.sourcePage===182&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:182});
 expect(vocabulary.find(i=>i.displayWord==="trillion"&&i.sourcePage===183&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:183});
 expect(vocabulary.find(i=>i.displayWord==="yd."&&i.sourcePage===184&&!!i.printedLabel)).toMatchObject({printedLabel:"縮寫",sourcePage:184});
 expect(vocabulary.find(i=>i.displayWord==="courtyard"&&i.sourcePage===185&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:185});
 expect(vocabulary.find(i=>i.displayWord==="enormous"&&i.sourcePage===186&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:186});
 expect(vocabulary.find(i=>i.displayWord==="countries"&&i.sourcePage===186&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:186});
 expect(vocabulary.find(i=>i.displayWord==="nation"&&i.sourcePage===186&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:186});
 expect(vocabulary.find(i=>i.displayWord==="boredom"&&i.sourcePage===187&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:187});
 expect(vocabulary.find(i=>i.displayWord==="interesting"&&i.sourcePage===187&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:187});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="like there is no tomorrow")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="speak up (for...)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="each and every")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="both A and B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="break a habit (of + V-ing)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be one in a million")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a tennis player / court / racket")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="everything but the kitchen sink")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="go to the bathroom = use the bathroom")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be at large")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the country = the countryside")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the national anthem")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Never put off until tomorrow what you can do today."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("If you can't stand the heat, get out of the kitchen."))).toBe(false);
});
it('registers the printed LV1 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===21)).toMatchObject({volume:'LV1',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});
