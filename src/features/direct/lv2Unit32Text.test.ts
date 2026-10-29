import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit32.json';
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
const unit=findUnit(32,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["discuss", "discussion", "hardly", "seldom", "waiter", "customer", "bill", "none", "neither", "musical", "musician", "fix", "design", "affair", "wealth", "riches", "succeed", "success", "poet", "poem", "poetry", "project", "scare", "scared", "receive", "return", "schedule", "shine", "conclude", "concern", "restroom", "soap", "wash", "continue", "cause", "factor", "excuse", "pardon", "flag", "candle", "lantern"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:24},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>281+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:290,printedUnit:'Unit 33',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===32)).toMatchObject({count:88,usageCount:53,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(141);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["rarely", "fixes", "fixed", "designate", "rags", "succeeding", "successes", "projector", "scarecrow", "receptionist", "concerned", "dishwasher", "a washing machine", "arrogance", "onlooker", "a candle-lit dinner", "jack-o'-lantern"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
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
it('fresh starter resolves all 70 mapped identities in a complete 141-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(141);expect(ids).toHaveLength(70);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(70);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',32,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U32',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U32',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U32 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U32 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="waitress")).toMatchObject({printedLabel:"反",sourcePage:281});
 expect(vocabulary.find(i=>i.displayWord==="coin")).toMatchObject({printedLabel:"延伸",sourcePage:281});
 expect(vocabulary.find(i=>i.displayWord==="opera")).toMatchObject({printedLabel:"延伸",sourcePage:282});
 expect(vocabulary.find(i=>i.displayWord==="designate")).toMatchObject({printedLabel:"似",sourcePage:283});
 expect(vocabulary.find(i=>i.displayWord==="rags")).toMatchObject({printedLabel:"*",sourcePage:284});
 expect(vocabulary.find(i=>i.displayWord==="successes")).toMatchObject({printedLabel:"複",sourcePage:284});
 expect(vocabulary.find(i=>i.displayWord==="scarecrow")).toMatchObject({printedLabel:"延伸",sourcePage:285});
 expect(vocabulary.find(i=>i.displayWord==="a washing machine")).toMatchObject({printedLabel:"延伸",sourcePage:287});
 expect(vocabulary.find(i=>i.displayWord==="a candle-lit dinner")).toMatchObject({printedLabel:"延伸",sourcePage:289});
 expect(vocabulary.find(i=>i.displayWord==="jack-o'-lantern")).toMatchObject({printedLabel:"延伸",sourcePage:289});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="none the + 比較級")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="none 單獨當主詞時，動詞常用單數。")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="neither 單獨當主詞時，動詞常用單數。")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="shine（照耀）：shine, shone, shone")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="shine（擦亮）：shine, shined, shined")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="conclude A with B = end A with B = wind up A with B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a bar of soap = a cake of soap")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="Lantern Festival")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("None is able to complete this task."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The sun shone brightly in the sky yesterday."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===282&&i.label==="none 單獨當主詞時，動詞常用單數。")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===282&&i.label==="neither 單獨當主詞時，動詞常用單數。")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===32)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});
