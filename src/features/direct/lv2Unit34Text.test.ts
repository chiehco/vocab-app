import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit34.json';
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
const unit=findUnit(34,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["pizza", "delicious", "balloon", "press", "pressure", "stress", "post", "postcard", "stamp", "address", "pain", "painful", "ending", "final", "beginner", "war", "battle", "conflict", "danger", "fear", "hole", "prefer", "disease", "stomachache", "cancer", "flu", "fever", "patient", "ill", "medical", "cure", "recover", "examine", "examination", "quiz", "cheat", "barber", "haircut", "eve", "midnight", "ahead"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:16},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>300+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:309,printedUnit:'Unit 35',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===34)).toMatchObject({count:88,usageCount:70,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(158);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["yummy", "punctuality", "stressful", "postal", "postman", "mailman", "addresses", "sender", "addressee", "inaugural", "painkiller", "painstaking", "unpainful", "painless", "pre-war", "postwar", "extinction", "fearsome", "fearless", "illness", "dengue", "recuperate", "quizzes", "barbershop", "midday", "be all ears"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 26 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(26);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(26);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 62 mapped identities in a complete 158-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(158);expect(ids).toHaveLength(62);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(62);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',34,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U34',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U34',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U34 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U34 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="yummy")).toMatchObject({printedLabel:"似",sourcePage:300});
 expect(vocabulary.find(i=>i.displayWord==="punctuality")).toMatchObject({printedLabel:"*",sourcePage:301});
 expect(vocabulary.find(i=>i.displayWord==="mailman")).toMatchObject({printedLabel:"=",sourcePage:301});
 expect(vocabulary.find(i=>i.displayWord==="addresses")).toMatchObject({printedLabel:"複",sourcePage:302});
 expect(vocabulary.find(i=>i.displayWord==="receiver")).toMatchObject({printedLabel:"延伸",sourcePage:303});
 expect(vocabulary.find(i=>i.displayWord==="addressee")).toMatchObject({printedLabel:"延伸",sourcePage:303});
 expect(vocabulary.find(i=>i.displayWord==="unpainful")).toMatchObject({printedLabel:"反",sourcePage:303});
 expect(vocabulary.find(i=>i.displayWord==="fearless")).toMatchObject({printedLabel:"衍",sourcePage:304});
 expect(vocabulary.find(i=>i.displayWord==="quizzes")).toMatchObject({printedLabel:"複",sourcePage:307});
 expect(vocabulary.find(i=>i.displayWord==="midday")).toMatchObject({printedLabel:"比",sourcePage:308});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a pizza")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a piece of pizza")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the press + 單數動詞（美） = the press + 單／複數動詞（英）")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="hold / give a press conference = hold / give a news conference")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="pressure sb into + V-ing = pressure sb to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have / get / catch a cold")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="recover from... = get over... = recuperate from...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="on New Year's Eve")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="on Christmas Eve")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The CEO\u2019s decision is final."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The book is for beginners, not for advanced readers."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===300&&i.label==="a pizza")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===300&&i.label==="a piece of pizza")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===304&&i.label==="war 指全面的「戰爭」，而 battle 指在戰爭中一場一場的「戰役」。")).toMatchObject({printedLabel:"比"});
 expect(source.usage.find(i=>i.sourcePage===305&&i.label==="have / get / catch a cold")).toMatchObject({printedLabel:"延伸"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===34)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
