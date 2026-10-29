import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV1Unit16.json';
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
const unit=findUnit(16,'LV1')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["guess", "lake", "pond", "clean", "tidy", "jump", "tool", "safe", "dangerous", "hat", "cap", "sweet", "factory", "afraid", "hate", "seat", "tie", "beside", "row", "blow", "pocket", "meat", "beef", "lesson", "salt", "sugar", "mistake", "seed", "magic", "know", "knowledge", "supermarket", "Mr.", "Mrs.", "Ms.", "visit", "visitor", "type"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,38).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:28},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:9},(_,i)=>142+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(8);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:150,printedUnit:'Unit 17',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===16)).toMatchObject({count:79,usageCount:57,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(136);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(38).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["Mr.", "Mrs.", "Ms.", "lakeside", "lakelet", "cleanly", "untidy", "lazybones", "safely", "unsafe", "sweeten", "sweet-and-sour pork", "cod", "typing"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 11 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(14);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(11);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 65 mapped identities in a complete 136-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(136);expect(ids).toHaveLength(65);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(65);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV1',16,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,38).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U16',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U16',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U16 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U16 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="lazybones"&&i.sourcePage===142&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:142});
 expect(vocabulary.find(i=>i.displayWord==="untidy"&&i.sourcePage===142&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:142});
 expect(vocabulary.find(i=>i.displayWord==="sweet-and-sour pork"&&i.sourcePage===144&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:144});
 expect(vocabulary.find(i=>i.displayWord==="steak"&&i.sourcePage===146&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:146});
 expect(vocabulary.find(i=>i.displayWord==="cod"&&i.sourcePage===147&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:147});
 expect(vocabulary.find(i=>i.displayWord==="preserve"&&i.sourcePage===147)).toMatchObject({printedLabel:"",sourcePage:147});
 expect(vocabulary.find(i=>i.displayWord==="address"&&i.sourcePage===148&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:148});
 expect(vocabulary.find(i=>i.displayWord==="typical"&&i.sourcePage===149&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:149});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="do thing cleanly")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="lazybones 單複數同形")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="tie the knot")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="in a row")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="blow one's nose")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="learn one's lesson")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="mistake A for B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="seed A with B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="As sb know,...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="Mr. 常在後加人名使用。")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a visitor to + 地方")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be (not) sb's type")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a blood type")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Knowledge is power."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("As everybody knows, the early bird catches the worm."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===142&&i.label==="do thing cleanly")).toMatchObject({printedLabel:"衍"});
 expect(source.usage.find(i=>i.sourcePage===142&&i.label==="lazybones 單複數同形")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===145&&i.label==="next to...")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===148&&i.label==="Mr. 常在後加人名使用。")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV1 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===16)).toMatchObject({volume:'LV1',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});

it('keeps independently checked empty continuation labels and direct stars',()=>{
 expect(source.related.find(r=>r.word==="preserve"&&r.sourcePage===147)).toMatchObject({printedLabel:""});
 expect(vocabulary.find(r=>r.displayWord==="preserve"&&r.sourcePage===147)).toMatchObject({printedLabel:""});
 expect(source.related.find(r=>r.word==="cod"&&r.sourcePage===147)).toMatchObject({printedLabel:"*"});
 expect(vocabulary.find(r=>r.displayWord==="cod"&&r.sourcePage===147)).toMatchObject({printedLabel:"*"});
});

it("keeps the checked original book meanings separate from dictionary senses",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV1U16-V073")).toMatchObject({"officialWordId": "W001012", "officialSenseId": null, "sensePos": "vt.", "targetMeaningZh": "寄（信）給……", "chapterMeaningsZh": "寄（信）給……", "meaningSource": "textbook_transcription"});
});
