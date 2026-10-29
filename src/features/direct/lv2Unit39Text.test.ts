import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit39.json';
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
const unit=findUnit(39,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["thirsty", "trust", "neighbor", "wild", "highway", "speed", "fox", "wolf", "giraffe", "zebra", "deer", "goat", "hippopotamus", "panda", "ape", "grape", "strawberry", "papaya", "peach", "pear", "guava", "mango", "watermelon", "dancer", "step", "ink", "policeman", "hunt", "hunter", "bake", "bakery", "bun", "jam", "barbecue", "steak", "pork", "lamb", "forest", "wood", "comb", "hurry"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:16},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>345+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:354,printedUnit:'Unit 40',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===39)).toMatchObject({count:105,usageCount:52,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(157);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["relations", "neighborly", "expressway", "superhighway", "mph", "foxes", "foxy", "wolves", "reindeer", "Santa", "strawberries", "blueberry", "blackberry", "cranberry", "mulberry", "raspberry", "be in season", "peaches", "avocado", "policemen", "policewoman", "policewomen", "hunting", "baker", "bakeries", "bell pepper", "mutton", "woody", "hairpin"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 29 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(29);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(29);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 76 mapped identities in a complete 157-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(157);expect(ids).toHaveLength(76);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(76);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',39,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U39',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U39',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U39 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U39 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="relations")).toMatchObject({printedLabel:"*",sourcePage:345});
 expect(vocabulary.find(i=>i.displayWord==="trustee")).toMatchObject({printedLabel:"衍",sourcePage:345});
 expect(vocabulary.find(i=>i.displayWord==="mph")).toMatchObject({printedLabel:"*",sourcePage:346});
 expect(vocabulary.find(i=>i.displayWord==="superhighway")).toMatchObject({printedLabel:"衍",sourcePage:346});
 expect(vocabulary.find(i=>i.displayWord==="foxes")).toMatchObject({printedLabel:"複",sourcePage:347});
 expect(vocabulary.find(i=>i.displayWord==="cunning")).toMatchObject({printedLabel:"=",sourcePage:347});
 expect(vocabulary.find(i=>i.displayWord==="sheep")).toMatchObject({printedLabel:"比",sourcePage:347});
 expect(vocabulary.find(i=>i.displayWord==="Santa")).toMatchObject({printedLabel:"*",sourcePage:347});
 expect(vocabulary.find(i=>i.displayWord==="monkey")).toMatchObject({printedLabel:"比",sourcePage:348});
 expect(vocabulary.find(i=>i.displayWord==="wine")).toMatchObject({printedLabel:"延伸",sourcePage:348});
 expect(vocabulary.find(i=>i.displayWord==="be in season")).toMatchObject({printedLabel:"*",sourcePage:348});
 expect(vocabulary.find(i=>i.displayWord==="policewoman")).toMatchObject({printedLabel:"反",sourcePage:349});
 expect(vocabulary.find(i=>i.displayWord==="policewomen")).toMatchObject({printedLabel:"複數為",sourcePage:349});
 expect(vocabulary.find(i=>i.displayWord==="bin")).toMatchObject({printedLabel:"似",sourcePage:350});
 expect(vocabulary.find(i=>i.displayWord==="bell pepper")).toMatchObject({printedLabel:"=",sourcePage:351});
 expect(vocabulary.find(i=>i.displayWord==="mutton")).toMatchObject({printedLabel:"比",sourcePage:351});
 expect(vocabulary.find(i=>i.displayWord==="hairpin")).toMatchObject({printedLabel:"延伸",sourcePage:352});
 expect(vocabulary.find(i=>i.displayWord==="hasten")).toMatchObject({printedLabel:"似",sourcePage:353});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be wild about... = be crazy / mad about...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="speed, sped / speeded, sped / speeded")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="deer 複數：deer / deers")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="reindeer 複數為 reindeer 或 reindeers")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="hippopotamus 複數：hippopotamuses / hippos")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="mango 複數：mangos / mangoes")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a bake sale")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be stuck in a traffic jam")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a rain forest = a rainforest")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="in a hurry / rush = in haste")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("It is said that eating papayas can help cure some minor health problems."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Rudolph is Santa\u2019s most famous reindeer."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("I\u2019d like my steak well done / medium / rare."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===346&&i.label==="mph 每小時行駛英里數（為 miles per hour 的縮寫）")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===347&&i.label==="deer 複數：deer / deers")).toMatchObject({printedLabel:"複"});
 expect(source.usage.find(i=>i.sourcePage===347&&i.label==="reindeer 複數為 reindeer 或 reindeers")).toMatchObject({printedLabel:"複數為"});
 expect(source.usage.find(i=>i.sourcePage===347&&i.label==="hippopotamus 複數：hippopotamuses / hippos")).toMatchObject({printedLabel:"複"});
 expect(source.usage.find(i=>i.sourcePage===348&&i.label==="a papaya")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===349&&i.label==="mango 複數：mangos / mangoes")).toMatchObject({printedLabel:"複"});
 expect(source.usage.find(i=>i.sourcePage===349&&i.label==="write... with ink（×） → write... in ink（○）")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===352&&i.label==="lamb 的 b 不發音")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===39)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
