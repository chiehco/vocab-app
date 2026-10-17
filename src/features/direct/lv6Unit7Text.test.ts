import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit7.json';
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
const unit=findUnit(7,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["resistant", "serving", "liberate", "liberation", "caffeine", "animate", "animation", "magnitude", "diplomacy", "insistence", "clone", "affectionate", "blaze", "cape", "evergreen", "correspondence", "esteem", "deafen", "slump", "hoarse", "spotlight", "plague", "suppress", "constant", "symphony", "examinee", "examiner", "gorilla", "despise", "hostel", "eternity", "vine", "vineyard", "coral", "scroll", "lifelong", "syrup", "virgin", "plantation", "spokesperson", "defiance", "aesthetic", "approximate", "hierarchy"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,44).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:40},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>61+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:71,printedUnit:'Unit 08',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===7)).toMatchObject({count:126,usageCount:40,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(166);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(44).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["animation", "magnitude", "disease-resistant", "botanist", "heat-resistant", "irresistible", "the status quo", "pesticide", "helping", "decaffeinated", "inanimate", "animator", "eye-catching", "seriousness", "replica", "loving", "a bedtime story", "cloak", "lasting", "everlasting", "self-esteem", "deafening", "croaky", "bubonic", "plaque", "constancy", "symphony orchestra", "symphonies", "guerrilla", "orangutan", "grapevine", "refurbish", "esthetic", "hierarchies"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 7 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(34);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(7);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 88 mapped identities in a complete 166-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(166);expect(ids).toHaveLength(88);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(88);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',7,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,44).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U7',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U7',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U7 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U7 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="strain"&&i.sourcePage===61)).toMatchObject({printedLabel:"",sourcePage:61});
 expect(vocabulary.find(i=>i.displayWord==="the status quo"&&i.sourcePage===61)).toMatchObject({printedLabel:"*",sourcePage:61});
 expect(vocabulary.find(i=>i.displayWord==="portrait"&&i.sourcePage===63)).toMatchObject({printedLabel:"",sourcePage:63});
 expect(vocabulary.find(i=>i.displayWord==="complex"&&i.sourcePage===67)).toMatchObject({printedLabel:"",sourcePage:67});
 expect(vocabulary.find(i=>i.displayWord==="esthetic"&&i.sourcePage===69)).toMatchObject({printedLabel:"=",sourcePage:69});
 expect(vocabulary.find(i=>i.displayWord==="hierarchies"&&i.sourcePage===70)).toMatchObject({printedLabel:"複",sourcePage:70});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="computer animation")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have no alternative / choice / option but to + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the Cape of Good Hope")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the Plague / plague = the Black Death = bubonic plague")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a medical examiner")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="spokesperson 若依性別來分，男生可用 spokesman，女生則用 spokeswoman。")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Thousands of visitors flooded into the zoo"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Yesterday by The Beatles"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Some scientists believe that clones"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===62&&i.label==="have no alternative / choice / option but to + V")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===65&&i.label==="be deaf to sth")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===66&&i.label==="claim a life")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===67&&i.label==="look down on...")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===67&&i.label==="a superiority complex")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===69&&i.label==="spokesperson 若依性別來分，男生可用 spokesman，女生則用 spokeswoman。")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===7)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1,2,4,5,6,7,8,9,10]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});

it("keeps native checked readable source batch 32-u7-p67-comparison",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U07-V105")).toMatchObject({targetMeaningZh:"黑猩猩（比大猩猩小很多）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U07-V105")).toMatchObject({chapterMeaningsZh:"黑猩猩（比大猩猩小很多）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U07-V105")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U07-V106")).toMatchObject({sensePos:"n."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U07-V106")).toMatchObject({targetMeaningZh:"紅毛猩猩"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U07-V106")).toMatchObject({chapterMeaningsZh:"紅毛猩猩"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U07-V106")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U07-V106")).toMatchObject({printedLabel:""});
});
