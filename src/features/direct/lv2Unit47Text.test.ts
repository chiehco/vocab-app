import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit47.json';
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
const unit=findUnit(47,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["survive", "survival", "contract", "edition", "identity", "grand", "gardener", "soil", "system", "thus", "employ", "employment", "employee", "employer", "electric", "electrical", "tale", "till", "edge", "lone", "typical", "somewhat", "proper", "pop", "complex", "rub", "rubber", "salesperson", "feature", "huge", "tiny", "obvious", "possibility", "blame", "throughout", "respond", "attempt", "operate", "operator", "poison"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,40).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:31},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>418+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:427,printedUnit:'Unit 48',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===47)).toMatchObject({count:98,usageCount:41,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(139);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(40).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["malaria", "bankruptcy", "slightly", "complexes", "complicated", "pandemic", "hit the road", "poisoning", "food poisoning", "sewer"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 10 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(10);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(10);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 86 mapped identities in a complete 139-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(139);expect(ids).toHaveLength(86);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(86);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',47,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,40).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U47',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U47',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U47 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U47 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="survivor"&&i.sourcePage===418&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:418});
 expect(vocabulary.find(i=>i.displayWord==="wildlife"&&i.sourcePage===418&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:418});
 expect(vocabulary.find(i=>i.displayWord==="malaria"&&i.sourcePage===418&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:418});
 expect(vocabulary.find(i=>i.displayWord==="earth"&&i.sourcePage===419&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:419});
 expect(vocabulary.find(i=>i.displayWord==="unemployment"&&i.sourcePage===419&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:419});
 expect(vocabulary.find(i=>i.displayWord==="controversial"&&i.sourcePage===420&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:420});
 expect(vocabulary.find(i=>i.displayWord==="phenomenon"&&i.sourcePage===420&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:420});
 expect(vocabulary.find(i=>i.displayWord==="type"&&i.sourcePage===421&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:421});
 expect(vocabulary.find(i=>i.displayWord==="complexes"&&i.sourcePage===422&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:422});
 expect(vocabulary.find(i=>i.displayWord==="simple"&&i.sourcePage===422&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:422});
 expect(vocabulary.find(i=>i.displayWord==="saleswoman"&&i.sourcePage===423&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:423});
 expect(vocabulary.find(i=>i.displayWord==="little"&&i.sourcePage===423&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:423});
 expect(vocabulary.find(i=>i.displayWord==="during"&&i.sourcePage===424&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:424});
 expect(vocabulary.find(i=>i.displayWord==="respondent"&&i.sourcePage===425&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:425});
 expect(vocabulary.find(i=>i.displayWord==="hit the road"&&i.sourcePage===425)).toMatchObject({printedLabel:"",sourcePage:425});
 expect(vocabulary.find(i=>i.displayWord==="operational"&&i.sourcePage===425&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:425});
 expect(vocabulary.find(i=>i.displayWord==="food poisoning"&&i.sourcePage===426&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:426});
 expect(vocabulary.find(i=>i.displayWord==="sewer"&&i.sourcePage===426&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:426});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="survive sb by + 歲數")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a chance of survival")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a paperback / hardback edition")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an identity card = an ID card")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an educational / education system")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="get an electric shock")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an electric appliance = an electrical appliance")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a tall tale")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="not + V... till / until...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be on edge = be nervous")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="It is typical of sb to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="pop, popped, popped")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an apartment complex")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="rub one's eyes")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a rubber band = an elastic band")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="blame A for B = blame B on A")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="respond with sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make an attempt to V = attempt to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="operate on... = perform an operation on...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The employment of children under 18 is forbidden in this country."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Lone women are advised not to walk down that dark lane at night."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("In the movie, the servant tried to kill herself by swallowing poison."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===420&&i.label==="till 與 until 用法相同，但 till 較常用於口語中。")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===425&&i.label==="night and day = day and night")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===47)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});

it('preserves literal empty continuation markers and original stars',()=>{
 expect(source.related.find(r=>r.word==="hit the road"&&r.sourcePage===425)).toMatchObject({printedLabel:""});
 expect(vocabulary.find(r=>r.displayWord==="hit the road"&&r.sourcePage===425)).toMatchObject({printedLabel:""});
 expect(source.related.find(r=>r.word==="warn"&&r.sourcePage===425)).toMatchObject({printedLabel:"*"});
 expect(source.related.find(r=>r.word==="beat"&&r.sourcePage===425)).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(r=>r.label==="warn sb of sth"&&r.sourcePage===425)).toMatchObject({printedLabel:""});
 expect(unit.items.find(i=>i.kind==="grammar"&&i.pattern==="warn sb of sth")).not.toHaveProperty("printedLabel");
 expect(source.usage.find(r=>r.label==="night and day = day and night"&&r.sourcePage===425)).toMatchObject({printedLabel:"*"});
});

it("keeps the checked original book meanings separate from dictionary senses",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV2U47-V090")).toMatchObject({"officialWordId": "W001081", "officialSenseId": null, "sensePos": "vt.", "targetMeaningZh": "避免", "chapterMeaningsZh": "避免", "meaningSource": "textbook_transcription"});
});
