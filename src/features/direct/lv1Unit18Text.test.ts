import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV1Unit18.json';
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
const unit=findUnit(18,'LV1')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["popcorn", "holiday", "smell", "ice", "dish", "bowl", "plate", "dig", "round", "dear", "bath", "shower", "fish", "kick", "smoke", "god", "goddess", "tail", "sir", "stair", "potato", "tomato", "dirty", "map", "mud", "joke", "hurt", "music", "piano", "violin", "drum", "guitar", "bite", "lamp", "breakfast", "lunch", "lunchtime", "dinner"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,38).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:27},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:8},(_,i)=>159+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(7);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:166,printedUnit:'Unit 19',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===18)).toMatchObject({count:71,usageCount:63,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(134);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(38).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["lunchtime", "smelly", "dishes", "a round-trip ticket", "dearly", "bathtub", "chain-smoker", "mythology", "staircase", "potatoes", "tomatoes", "drummer", "guitarist"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 12 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(13);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(12);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 57 mapped identities in a complete 134-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(134);expect(ids).toHaveLength(57);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(57);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV1',18,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,38).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U18',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U18',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U18 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U18 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="dishes"&&i.sourcePage===159&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:159});
 expect(vocabulary.find(i=>i.displayWord==="vacation"&&i.sourcePage===159&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:159});
 expect(vocabulary.find(i=>i.displayWord==="a round-trip ticket"&&i.sourcePage===160&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:160});
 expect(vocabulary.find(i=>i.displayWord==="expensive"&&i.sourcePage===160&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:160});
 expect(vocabulary.find(i=>i.displayWord==="goal"&&i.sourcePage===161&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:161});
 expect(vocabulary.find(i=>i.displayWord==="chain-smoker"&&i.sourcePage===162&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:162});
 expect(vocabulary.find(i=>i.displayWord==="mythology"&&i.sourcePage===162&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:162});
 expect(vocabulary.find(i=>i.displayWord==="madam"&&i.sourcePage===162&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:162});
 expect(vocabulary.find(i=>i.displayWord==="tomatoes"&&i.sourcePage===163&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:163});
 expect(vocabulary.find(i=>i.displayWord==="clean"&&i.sourcePage===163&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:163});
 expect(vocabulary.find(i=>i.displayWord==="dump"&&i.sourcePage===164&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:164});
 expect(vocabulary.find(i=>i.displayWord==="cafeteria"&&i.sourcePage===165&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:165});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be on holiday = be on vacation")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="smell, smelled / smelt, smelled / smelt")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="dish the dirt (on sb)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take a peek")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="hold sth dear = value sth = cherish sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="shower down")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="can't make head nor tail of sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="map out a plan = draw up a plan")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be music to sb's ears")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="play the drums")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="grab / have a bite to eat")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="eat / have... for dinner")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("There's no smoke without fire."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The Earth moves round the Sun."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===160&&i.label==="take a peek")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===161&&i.label==="fish 單複數同形")).toMatchObject({printedLabel:"複"});
 expect(source.usage.find(i=>i.sourcePage===164&&i.label==="hurt 三態同形")).toMatchObject({printedLabel:"三"});
});
it('registers the printed LV1 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===18)).toMatchObject({volume:'LV1',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});

it("keeps the checked original book meanings separate from dictionary senses",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV1U18-V065")).toMatchObject({"officialWordId": "W002271", "officialSenseId": null, "sensePos": "vt.", "targetMeaningZh": "遺棄（戀人）", "chapterMeaningsZh": "遺棄（戀人）", "meaningSource": "textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV1U18-V048")).toMatchObject({"officialWordId": "W001078", "officialSenseId": null, "sensePos": "v.", "targetMeaningZh": "沐浴；使沈浸於……", "chapterMeaningsZh": "沐浴；使沈浸於……", "meaningSource": "textbook_transcription"});
});
