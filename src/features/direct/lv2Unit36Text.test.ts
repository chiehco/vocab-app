import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit36.json';
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
const unit=findUnit(36,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["leaf", "umbrella", "raincoat", "beer", "wine", "cola", "soda", "hamburger", "sandwich", "fries", "fry", "ketchup", "beauty", "handsome", "ugly", "excite", "excitement", "lend", "debt", "sport", "football", "soccer", "badminton", "wool", "pan", "teapot", "refrigerator", "bark", "listener", "speaker", "speech", "skill", "skilled", "favor", "favorite", "spoon", "purple", "vacation", "backpack", "puppy", "beat"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:19},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>318+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:327,printedUnit:'Unit 37',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===36)).toMatchObject({count:84,usageCount:58,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(142);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["leaves", "parasol", "dance the night away", "Coke", "Coca-Cola", "beauties", "parlor", "sports", "rugby", "racket", "birdie", "shuttlecock", "go bad", "barking", "reader", "avid", "unskilled", "spoonful", "backpacker", "puppies", "heartbeat", "raindrop"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 22 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(22);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(22);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 62 mapped identities in a complete 142-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(142);expect(ids).toHaveLength(62);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(62);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',36,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U36',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U36',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U36 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U36 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="leaves")).toMatchObject({printedLabel:"複",sourcePage:318});
 expect(vocabulary.find(i=>i.displayWord==="Coke")).toMatchObject({printedLabel:"似",sourcePage:319});
 expect(vocabulary.find(i=>i.displayWord==="Coca-Cola")).toMatchObject({printedLabel:"=",sourcePage:319});
 expect(vocabulary.find(i=>i.displayWord==="beauties")).toMatchObject({printedLabel:"複",sourcePage:319});
 expect(vocabulary.find(i=>i.displayWord==="pretty")).toMatchObject({printedLabel:"反",sourcePage:320});
 expect(vocabulary.find(i=>i.displayWord==="sports")).toMatchObject({printedLabel:"衍",sourcePage:321});
 expect(vocabulary.find(i=>i.displayWord==="shuttlecock")).toMatchObject({printedLabel:"=（英）",sourcePage:322});
 expect(vocabulary.find(i=>i.displayWord==="wood")).toMatchObject({printedLabel:"似",sourcePage:322});
 expect(vocabulary.find(i=>i.displayWord==="reader")).toMatchObject({printedLabel:"延伸",sourcePage:323});
 expect(vocabulary.find(i=>i.displayWord==="expertise")).toMatchObject({printedLabel:"似",sourcePage:324});
 expect(vocabulary.find(i=>i.displayWord==="vocation")).toMatchObject({printedLabel:"比",sourcePage:325});
 expect(vocabulary.find(i=>i.displayWord==="puppies")).toMatchObject({printedLabel:"複",sourcePage:325});
 expect(vocabulary.find(i=>i.displayWord==="heartbeat")).toMatchObject({printedLabel:"衍",sourcePage:326});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take a leaf out of sb's book")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="draft beer（美） = draught beer（英）")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="fry, fried, fried")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="lend sth to sb = lend sb sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a fridge magnet")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a part of speech（複數為 parts of speech）")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="favor A over B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be / turn purple in the face = be / turn purple with rage")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="(It) beats me.")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Beauty is only skin deep."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Beauty is in the eye of the beholder."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("To my disappointment, Tim didn\u2019t show up as he had promised."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===318&&i.label==="a rain boot = a rubber boot")).toMatchObject({printedLabel:"延伸"});
 expect(source.usage.find(i=>i.sourcePage===323&&i.label==="a listener")).toMatchObject({printedLabel:"比"});
 expect(source.usage.find(i=>i.sourcePage===323&&i.label==="an audience")).toMatchObject({printedLabel:"比"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===36)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
