import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit38.json';
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
const unit=findUnit(38,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["flight", "aircraft", "search", "seek", "chase", "emotion", "playground", "swing", "slide", "seesaw", "sweep", "mop", "score", "tear", "painting", "drawing", "crayon", "novel", "motorcycle", "scooter", "engine", "tire", "noodle", "treasure", "diamond", "necklace", "earring", "powerful", "prove", "generous", "calm", "earthquake", "calendar", "weekday", "daily", "diary", "journal", "glue", "paste", "stick", "alone"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:20},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>336+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:345,printedUnit:'Unit 39',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===38)).toMatchObject({count:86,usageCount:63,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(149);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["feelings", "mudslide", "sweeper", "watercolor", "a drawing board", "pastel", "novelty", "unusual", "locomotive", "gem", "ruby", "pendant", "powerless", "calmness", "dailies", "diaries", "toothpaste", "toffee", "solely"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 19 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(19);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(19);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 67 mapped identities in a complete 149-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(149);expect(ids).toHaveLength(67);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(67);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',38,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U38',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U38',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U38 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U38 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="airline")).toMatchObject({printedLabel:"似",sourcePage:336});
 expect(vocabulary.find(i=>i.displayWord==="feelings")).toMatchObject({printedLabel:"似",sourcePage:337});
 expect(vocabulary.find(i=>i.displayWord==="corruption")).toMatchObject({printedLabel:"*",sourcePage:337});
 expect(vocabulary.find(i=>i.displayWord==="mudslide")).toMatchObject({printedLabel:"衍",sourcePage:338});
 expect(vocabulary.find(i=>i.displayWord==="a drawing board")).toMatchObject({printedLabel:"*",sourcePage:339});
 expect(vocabulary.find(i=>i.displayWord==="pastel")).toMatchObject({printedLabel:"延伸",sourcePage:339});
 expect(vocabulary.find(i=>i.displayWord==="unusual")).toMatchObject({printedLabel:"似",sourcePage:340});
 expect(vocabulary.find(i=>i.displayWord==="locomotive")).toMatchObject({printedLabel:"似",sourcePage:340});
 expect(vocabulary.find(i=>i.displayWord==="spaghetti")).toMatchObject({printedLabel:"延伸",sourcePage:340});
 expect(vocabulary.find(i=>i.displayWord==="pendant")).toMatchObject({printedLabel:"延伸",sourcePage:341});
 expect(vocabulary.find(i=>i.displayWord==="powerless")).toMatchObject({printedLabel:"反",sourcePage:341});
 expect(vocabulary.find(i=>i.displayWord==="stingy")).toMatchObject({printedLabel:"反",sourcePage:341});
 expect(vocabulary.find(i=>i.displayWord==="dailies")).toMatchObject({printedLabel:"複",sourcePage:342});
 expect(vocabulary.find(i=>i.displayWord==="diaries")).toMatchObject({printedLabel:"複",sourcePage:342});
 expect(vocabulary.find(i=>i.displayWord==="sticky")).toMatchObject({printedLabel:"衍",sourcePage:343});
 expect(vocabulary.find(i=>i.displayWord==="along")).toMatchObject({printedLabel:"似",sourcePage:344});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an aircraft = an airplane")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="two aircraft = two airplanes")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="get into the swing of things / it")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="give + 地方 + a quick sweep")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="tear, tore, torn")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="go back to the drawing board")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a treasure chest")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="It is generous of sb to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="on a daily basis = every day")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="stick, stuck, stuck")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="let alone...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The flight is scheduled to leave at 1:30 p.m."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("I started keeping a diary at age 15."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The service fee alone is 30 dollars."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===336&&i.label==="an aircraft = an airplane")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===336&&i.label==="two aircraft = two airplanes")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===338&&i.label==="score 的意思為「20 個（左右）」時，其單複數同形。")).toMatchObject({printedLabel:"複"});
 expect(source.usage.find(i=>i.sourcePage===341&&i.label==="do damage to...")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===343&&i.label==="write a diary（×） → keep a diary（○）")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===343&&i.label==="write a journal（×） → keep a journal（○）")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===38)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
