import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit29.json';
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
const unit=findUnit(29,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["surface", "decision", "contain", "recent", "organization", "industry", "direct", "direction", "director", "complete", "realize", "reality", "base", "basis", "basic", "basics", "source", "origin", "peace", "peaceful", "single", "double", "natural", "clever", "mask", "likely", "actual", "true", "truth", "false", "lack", "empty", "lift", "fashion", "style", "detail", "equal", "manage", "manager", "management", "prize"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:25},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>253+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:262,printedUnit:'Unit 30',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===29)).toMatchObject({count:93,usageCount:49,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(142);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["industries", "indirect", "incomplete", "realities", "bases", "divorced", "separated", "naturalist", "unnatural", "man-made", "tear-gas", "unlikely", "detailed", "unequal"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 14 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(14);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(14);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 79 mapped identities in a complete 142-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(142);expect(ids).toHaveLength(79);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(79);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',29,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U29',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U29',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U29 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U29 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="industries")).toMatchObject({printedLabel:"複",sourcePage:253});
 expect(vocabulary.find(i=>i.displayWord==="bases")).toMatchObject({printedLabel:"複",sourcePage:255});
 expect(vocabulary.find(i=>i.displayWord==="married")).toMatchObject({printedLabel:"延伸",sourcePage:257});
 expect(vocabulary.find(i=>i.displayWord==="divorced")).toMatchObject({printedLabel:"延伸",sourcePage:257});
 expect(vocabulary.find(i=>i.displayWord==="separated")).toMatchObject({printedLabel:"延伸",sourcePage:257});
 expect(vocabulary.find(i=>i.displayWord==="man-made")).toMatchObject({printedLabel:"反",sourcePage:257});
 expect(vocabulary.find(i=>i.displayWord==="tear-gas")).toMatchObject({printedLabel:"*",sourcePage:258});
 expect(vocabulary.find(i=>i.displayWord==="gulf")).toMatchObject({printedLabel:"*",sourcePage:259});
 expect(vocabulary.find(i=>i.displayWord==="equation")).toMatchObject({printedLabel:"衍",sourcePage:261});
 expect(vocabulary.find(i=>i.displayWord==="price")).toMatchObject({printedLabel:"似",sourcePage:261});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a non-profit organization")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make a decision = make up one's mind")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="It is natural (for sb) to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="(That's) a likely story!")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="wear a (face) mask")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="empty, emptied, emptied")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="fashion A out of B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The love of money is the source of all evil."))).toBe(false);
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===29)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});
