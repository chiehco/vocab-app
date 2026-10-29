import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV1Unit20.json';
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
const unit=findUnit(20,'LV1')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["fan", "zero", "toy", "robot", "ant", "pet", "ham", "born", "world", "worldwide", "frog", "homework", "juice", "lazy", "pants", "shorts", "jeans", "skirt", "dress", "rainbow", "bug", "kite", "kind", "kindness", "yummy", "cellphone", "telephone", "test", "grade", "mathematics", "parent", "son", "daughter", "write", "writer", "weather", "sunny", "rainy", "file"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,39).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:26},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:8},(_,i)=>173+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(7);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:180,printedUnit:'Unit 21',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===20)).toMatchObject({count:91,usageCount:52,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(143);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(39).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["worldwide", "kindness", "yummy", "zeros", "zeroes", "robotic", "toad", "schoolwork", "laziness", "lazily", "lazybones", "trousers", "denim", "miniskirt", "dresses", "dressed", "kinda", "kindly", "kind-hearted", "unkind", "banana split", "cell phone", "a cellular phone", "a mobile phone", "optometrist", "graded", "son-in-law", "daughter-in-law", "writing", "rewrite"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 27 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(30);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(27);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 59 mapped identities in a complete 143-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(143);expect(ids).toHaveLength(59);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(59);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV1',20,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,39).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U20',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U20',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U20 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U20 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="zeroes"&&i.sourcePage===173&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:173});
 expect(vocabulary.find(i=>i.displayWord==="robotic"&&i.sourcePage===173&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:173});
 expect(vocabulary.find(i=>i.displayWord==="toad"&&i.sourcePage===175&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:175});
 expect(vocabulary.find(i=>i.displayWord==="lazybones"&&i.sourcePage===175&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:175});
 expect(vocabulary.find(i=>i.displayWord==="denim"&&i.sourcePage===175&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:175});
 expect(vocabulary.find(i=>i.displayWord==="dresses"&&i.sourcePage===176&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:176});
 expect(vocabulary.find(i=>i.displayWord==="bow"&&i.sourcePage===176&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:176});
 expect(vocabulary.find(i=>i.displayWord==="banana split"&&i.sourcePage===177&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:177});
 expect(vocabulary.find(i=>i.displayWord==="a cellular phone"&&i.sourcePage===177&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:177});
 expect(vocabulary.find(i=>i.displayWord==="cell phone"&&i.sourcePage===177&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:177});
 expect(vocabulary.find(i=>i.displayWord==="optometrist"&&i.sourcePage===178&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:178});
 expect(vocabulary.find(i=>i.displayWord==="math"&&i.sourcePage===178&&!!i.printedLabel)).toMatchObject({printedLabel:"縮寫",sourcePage:178});
 expect(vocabulary.find(i=>i.displayWord==="whether"&&i.sourcePage===179&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:179});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="fan the flames (of sth)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have / get ants in one's pants")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="keep (... as) a pet")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be born with a silver spoon in one's mouth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have (got) a frog in one's throat")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a pair of jeans")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="dress (sb) up")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="It is kind of sb to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="talk on the telephone = talk on the phone")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="write sth down / write down sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="feel / be under the weather")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="file a lawsuit (against sb)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Barack Obama was born in Hawaii in 1961."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("More than 10,000 companies worldwide use our products."))).toBe(false);
});
it('registers the printed LV1 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===20)).toMatchObject({volume:'LV1',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});

it("keeps the checked original book meanings separate from dictionary senses",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV1U20-V045")).toMatchObject({"officialWordId": "W003455", "officialSenseId": null, "sensePos": "n.", "targetMeaningZh": "地球", "chapterMeaningsZh": "地球", "meaningSource": "textbook_transcription"});
});
