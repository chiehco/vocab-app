import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit15.json';
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
const unit=findUnit(15,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["lengthy", "conserve", "setback", "manuscript", "transcript", "soothe", "attendant", "preventive", "purity", "purify", "synthetic", "synthesis", "diversify", "elite", "prosecute", "formidable", "colloquial", "slang", "alienate", "wrestle", "slash", "pierce", "brace", "chairperson", "monstrous", "reap", "finite", "puff", "shriek", "overdo", "overflow", "overwork", "overhear", "wholesale", "mortal", "mound", "resolute", "well-being", "reckless", "ascend", "breadth", "bypass", "ratify"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,43).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:36},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>139+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:149,printedUnit:'Unit 16',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===15)).toMatchObject({count:141,usageCount:43,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(184);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(43).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["synthesis", "elite", "pierce", "resolute", "well-being", "transcription", "transcribe", "soothing", "ointment", "pandemic", "impurity", "purified", "purification", "cleanse", "urine", "synthesize", "syntheses", "prosecutor", "redoubtable", "linguist", "spoken", "marijuana", "alienation", "wrestler", "wrestling", "bucktooth", "unanimously", "limited", "alarming", "overdid", "overdone", "liven", "overtime", "overheard", "eavesdrop", "wholesaler", "retailer", "immortality", "mythology", "immortal", "determined", "recklessly", "careless", "irresponsible", "overpass"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 6 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(45);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(6);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 93 mapped identities in a complete 184-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(184);expect(ids).toHaveLength(93);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(93);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',15,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,43).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U15',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U15',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U15 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U15 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="bucktooth"&&i.sourcePage===143)).toMatchObject({printedLabel:"延伸",sourcePage:143});
 expect(vocabulary.find(i=>i.displayWord==="chairwoman"&&i.sourcePage===144)).toMatchObject({printedLabel:"",sourcePage:144});
 expect(vocabulary.find(i=>i.displayWord==="overdid"&&i.sourcePage===145)).toMatchObject({printedLabel:"三",sourcePage:145});
 expect(vocabulary.find(i=>i.displayWord==="overdone"&&i.sourcePage===145)).toMatchObject({printedLabel:"三",sourcePage:145});
 expect(vocabulary.find(i=>i.displayWord==="liven"&&i.sourcePage===145)).toMatchObject({printedLabel:"",sourcePage:145});
 expect(vocabulary.find(i=>i.displayWord==="retailer"&&i.sourcePage===146)).toMatchObject({printedLabel:"",sourcePage:146});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take preventive measures to + V = take precautions to + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="此字可用單數或複數動詞，而用複數動詞較常見。")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a slang expression / word / term")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="overflow with... = brim with... = be filled with... = be full of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a mortal blow / wound to...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="can hardly catch one's breath")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="ratify a treaty / agreement")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("They that sow in tears shall reap in joy"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("He knows many slangs"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("He knows a lot of slang"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("He knows many slang expressions"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===140&&i.label==="in place")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===141&&i.label==="此字可用單數或複數動詞，而用複數動詞較常見。")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===142&&i.label==="charge sb with sth")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===142&&i.label==="slang 為不可數，故：")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===144&&i.label==="at an alarming rate")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===145&&i.label==="liven sth up")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===146&&i.label==="work overtime")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===146&&i.label==="mortality rate")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===147&&i.label==="make a resolution to + V")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===148&&i.label==="hold one's breath")).toMatchObject({printedLabel:""});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===15)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});

it("keeps native checked readable source batch 37-u15-p146-comparison",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U15-V114")).toMatchObject({sensePos:"vi."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U15-V114")).toMatchObject({targetMeaningZh:"竊聽（與介詞 on 並用）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U15-V114")).toMatchObject({chapterMeaningsZh:"竊聽（與介詞 on 並用）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U15-V114")).toMatchObject({meaningSource:"textbook_transcription"});
});
