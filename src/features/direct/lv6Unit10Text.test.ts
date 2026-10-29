import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit10.json';
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
const unit=findUnit(10,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["customary", "decisive", "indecisive", "aboriginal", "familiarity", "adaptation", "medieval", "hacker", "illuminate", "illuminating", "extract", "endurance", "deem", "defect", "posture", "contradict", "narrate", "narrator", "intersection", "counterpart", "upright", "alligator", "crocodile", "blot", "caretaker", "poultry", "lotus", "shabby", "cozy", "stylish", "fascination", "tilt", "suitcase", "loudspeaker", "lullaby", "caterpillar", "deficient", "preach", "preacher", "drawback", "audit", "auditorium", "unify", "unification"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,44).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:37},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>91+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.find(p=>p.sourcePage===100)).toMatchObject({printedUnit:null,pageType:'notes'});
 expect(source.photos.at(-1)).toMatchObject({sourcePage:101,printedUnit:'Unit 11',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===10)).toMatchObject({count:124,usageCount:33,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(157);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(44).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["indecisive", "illuminating", "deficient", "preacher", "drawback", "bellboy", "aborigine", "familiarize", "adaption", "hack", "illuminated", "inspiring", "willpower", "deformity", "defective", "recurring", "contradictory", "narration", "the Holocaust", "crossroads", "blotted", "inkblot", "fowls", "lotuses", "derelict", "cosy", "lullabies", "lull", "pupa", "cocoon", "deficiency", "the gospel", "auditor", "unified"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
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
it('fresh starter resolves all 90 mapped identities in a complete 157-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(157);expect(ids).toHaveLength(90);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(90);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',10,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,44).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U10',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U10',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U10 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U10 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="the Holocaust"&&i.sourcePage===95)).toMatchObject({printedLabel:"*",sourcePage:95});
 expect(vocabulary.find(i=>i.displayWord==="crossroads"&&i.sourcePage===95)).toMatchObject({printedLabel:"似",sourcePage:95});
 expect(vocabulary.find(i=>i.displayWord==="janitor"&&i.sourcePage===96)).toMatchObject({printedLabel:"=",sourcePage:96});
 expect(vocabulary.find(i=>i.displayWord==="fowls"&&i.sourcePage===96)).toMatchObject({printedLabel:"複",sourcePage:96});
 expect(vocabulary.find(i=>i.displayWord==="cosy"&&i.sourcePage===97)).toMatchObject({printedLabel:"=",sourcePage:97});
 expect(vocabulary.find(i=>i.displayWord==="the gospel"&&i.sourcePage===98)).toMatchObject({printedLabel:"*",sourcePage:98});
 expect(vocabulary.find(i=>i.displayWord==="unified"&&i.sourcePage===99)).toMatchObject({printedLabel:"三",sourcePage:99});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="It is customary (for sb) to + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="in medieval times = in the Middle Ages")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="deem A (to be) B = consider A (to be) B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="adopt a(n) + adj. + posture toward(s)...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="upright piano")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="shed crocodile tears")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a drawback to / of + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Familiarity breeds contempt"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The gangsters may torture Tommy"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("John's father is a pastor"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===91&&i.label==="make a decision")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===92&&i.label==="be familiar with...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===92&&i.label==="adapt to sth")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===92&&i.label==="adapt A for B")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===93&&i.label==="light up...")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===94&&i.label==="good posture")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===94&&i.label==="pose for a picture")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===98&&i.label==="lull a child / baby to sleep")).toMatchObject({printedLabel:""});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===10)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});
