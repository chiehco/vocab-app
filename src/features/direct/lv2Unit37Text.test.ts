import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit37.json';
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
const unit=findUnit(37,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["fee", "luck", "fate", "guard", "protect", "protective", "satisfy", "owner", "shelf", "drawer", "drug", "cash", "coin", "stranger", "brain", "tongue", "climate", "cloudy", "snowy", "windy", "hike", "pleasant", "anger", "fit", "suit", "suitable", "magazine", "whale", "shark", "turtle", "ocean", "swim", "swimsuit", "surf", "seafood", "runner", "jog", "cloth", "clothing", "sweater", "spelling"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:21},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>327+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:336,printedUnit:'Unit 38',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===37)).toMatchObject({count:92,usageCount:64,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(156);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["satisfying", "satisfied", "dissatisfy", "shelves", "brainpower", "climatic", "overcast", "hiker", "hiking", "unpleasant", "unsuitable", "runner-up"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 12 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(12);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(12);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 80 mapped identities in a complete 156-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(156);expect(ids).toHaveLength(80);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(80);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',37,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U37',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U37',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U37 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U37 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="fare")).toMatchObject({printedLabel:"似",sourcePage:327});
 expect(vocabulary.find(i=>i.displayWord==="gangster")).toMatchObject({printedLabel:"*",sourcePage:327});
 expect(vocabulary.find(i=>i.displayWord==="dissatisfy")).toMatchObject({printedLabel:"反",sourcePage:328});
 expect(vocabulary.find(i=>i.displayWord==="shelves")).toMatchObject({printedLabel:"複",sourcePage:328});
 expect(vocabulary.find(i=>i.displayWord==="draw")).toMatchObject({printedLabel:"衍",sourcePage:329});
 expect(vocabulary.find(i=>i.displayWord==="bill")).toMatchObject({printedLabel:"延伸",sourcePage:330});
 expect(vocabulary.find(i=>i.displayWord==="climax")).toMatchObject({printedLabel:"似",sourcePage:331});
 expect(vocabulary.find(i=>i.displayWord==="weather")).toMatchObject({printedLabel:"似",sourcePage:331});
 expect(vocabulary.find(i=>i.displayWord==="unsuitable")).toMatchObject({printedLabel:"反",sourcePage:332});
 expect(vocabulary.find(i=>i.displayWord==="tortoise")).toMatchObject({printedLabel:"似",sourcePage:333});
 expect(vocabulary.find(i=>i.displayWord==="runner-up")).toMatchObject({printedLabel:"衍",sourcePage:334});
 expect(vocabulary.find(i=>i.displayWord==="dress")).toMatchObject({printedLabel:"=",sourcePage:334});
 expect(vocabulary.find(i=>i.displayWord==="sweat")).toMatchObject({printedLabel:"似",sourcePage:335});
 expect(vocabulary.find(i=>i.displayWord==="spell")).toMatchObject({printedLabel:"衍",sourcePage:335});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a monthly membership fee")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="satisfy / meet a requirement")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="clear a / one's shelf")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be two sides of the same coin = be different / opposite sides of the same coin")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="Hello, stranger!")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="rack one's brains = beat one's brains")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="file / bring a suit against sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a drop in the ocean（英） = a drop in the bucket（美）")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="surf the Net / net = surf / browse the internet")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an article / item of clothing = a piece of clothing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a spelling bee")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Don\u2019t talk to strangers."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Hello, stranger! Long time no see!"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Many countries are working together to combat climate change."))).toBe(false);
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===37)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});

it("keeps the checked original book meanings separate from dictionary senses",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV2U37-V092")).toMatchObject({"officialWordId": "W000817", "officialSenseId": null, "sensePos": "vi./vt.", "targetMeaningZh": "拼寫", "chapterMeaningsZh": "拼寫", "meaningSource": "textbook_transcription"});
});
