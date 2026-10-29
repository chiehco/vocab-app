import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit33.json';
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
const unit=findUnit(33,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["shock", "nail", "strike", "crow", "dove", "eagle", "rooster", "goose", "energy", "compare", "depend", "independent", "independence", "shoot", "shot", "childhood", "youth", "teens", "adult", "elder", "region", "claim", "forward", "forward(s)", "backward", "backward(s)", "toward(s)", "duty", "wonder", "self", "selfish", "condition", "instead", "perfect", "ideal", "sense", "sensitive", "author", "human", "individual", "hall"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:22},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>290+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:300,printedUnit:'Unit 34',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===33)).toMatchObject({count:93,usageCount:66,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(159);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["forward(s)", "backward(s)", "toward(s)", "geese", "dependence", "dependable", "shotgun", "teen", "grown-up", "duties", "dutiful", "flawless", "faultless", "imperfect", "idealism", "idealistic", "idealist", "sensory", "insensitive", "humane", "individualism", "individuality"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 19 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(22);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(19);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 69 mapped identities in a complete 159-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(159);expect(ids).toHaveLength(69);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(69);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',33,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U33',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U33',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U33 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U33 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="hawk")).toMatchObject({printedLabel:"反",sourcePage:291});
 expect(vocabulary.find(i=>i.displayWord==="geese")).toMatchObject({printedLabel:"複",sourcePage:291});
 expect(vocabulary.find(i=>i.displayWord==="comparative")).toMatchObject({printedLabel:"衍",sourcePage:292});
 expect(vocabulary.find(i=>i.displayWord==="naughty")).toMatchObject({printedLabel:"*",sourcePage:293});
 expect(vocabulary.find(i=>i.displayWord==="teenager")).toMatchObject({printedLabel:"=",sourcePage:294});
 expect(vocabulary.find(i=>i.displayWord==="teenage")).toMatchObject({printedLabel:"=",sourcePage:294});
 expect(vocabulary.find(i=>i.displayWord==="duties")).toMatchObject({printedLabel:"複",sourcePage:295});
 expect(vocabulary.find(i=>i.displayWord==="insensitive")).toMatchObject({printedLabel:"反",sourcePage:298});
 expect(vocabulary.find(i=>i.displayWord==="divine")).toMatchObject({printedLabel:"*",sourcePage:298});
 expect(vocabulary.find(i=>i.displayWord==="hallway")).toMatchObject({printedLabel:"衍",sourcePage:299});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="strike, struck, struck / stricken")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="crow's feet")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="depend on... = rely on...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have a shot at + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="forward a letter / an email to sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the perfect (tense)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a city hall")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="City Hall")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("To err is human, to forgive divine."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===291&&i.label==="cock 在俚語中是表「男性生殖器」，故較常用 rooster 表「公雞」。")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===293&&i.label==="youth 為「（統稱）年輕人」之意時，其後可接「單數動詞」或「複數動詞」。")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===33)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
