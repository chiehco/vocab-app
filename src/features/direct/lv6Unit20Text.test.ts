import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit20.json';
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
const unit=findUnit(20,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["infer", "inference", "starvation", "famine", "hospitable", "hospitality", "hospitalize", "irritate", "irritable", "irritation", "fireproof", "waterproof", "splendor", "humiliate", "humiliating", "humiliation", "imprison", "imprisonment", "intimidate", "extinguisher", "spiral", "nude", "hijack", "reptile", "lieutenant", "sergeant", "admiral", "colonel", "continuity", "goalkeeper", "ward", "flunk", "resent", "resentment", "awesome", "brotherhood", "motherhood", "chili", "oath", "nickel", "nickel-and-dime", "contention", "gauge", "commonwealth", "premiere"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:30},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>186+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:195,printedUnit:'Unit 21',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===20)).toMatchObject({count:114,usageCount:31,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(145);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["inference", "famine", "irritation", "humiliating", "humiliation", "extinguisher", "colonel", "nickel-and-dime", "inferred", "confer", "starving", "inhospitable", "short-tempered", "bulletproof", "water-resistant", "embarrassing", "reprimand", "thug", "extinguish", "spire", "staircase", "hijacker", "carjack", "carjacker", "amphibian", "platoon", "a pep talk", "maternity", "resentful", "bitterly", "fatherhood", "chilli", "chilies", "chillies", "Chile", "stainless"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 4 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(36);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(4);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 78 mapped identities in a complete 145-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(145);expect(ids).toHaveLength(78);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(78);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',20,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,45).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
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
 expect(vocabulary.find(i=>i.displayWord==="inferred"&&i.sourcePage===186)).toMatchObject({printedLabel:"三",sourcePage:186});
 expect(vocabulary.find(i=>i.displayWord==="carjacker"&&i.sourcePage===189)).toMatchObject({printedLabel:"",sourcePage:189});
 expect(vocabulary.find(i=>i.displayWord==="a pep talk"&&i.sourcePage===190)).toMatchObject({printedLabel:"*",sourcePage:190});
 expect(vocabulary.find(i=>i.displayWord==="boost"&&i.sourcePage===190)).toMatchObject({printedLabel:"",sourcePage:190});
 expect(vocabulary.find(i=>i.displayWord==="morale"&&i.sourcePage===190)).toMatchObject({printedLabel:"",sourcePage:190});
 expect(vocabulary.find(i=>i.displayWord==="maternity"&&i.sourcePage===191)).toMatchObject({printedLabel:"*",sourcePage:191});
 expect(vocabulary.find(i=>i.displayWord==="chilli"&&i.sourcePage===192)).toMatchObject({printedLabel:"=",sourcePage:192});
 expect(vocabulary.find(i=>i.displayWord==="chilies"&&i.sourcePage===192)).toMatchObject({printedLabel:"複",sourcePage:192});
 expect(vocabulary.find(i=>i.displayWord==="chillies"&&i.sourcePage===192)).toMatchObject({printedLabel:"=",sourcePage:192});
 expect(vocabulary.find(i=>i.displayWord==="Chile"&&i.sourcePage===192)).toMatchObject({printedLabel:"似",sourcePage:192});
 expect(vocabulary.find(i=>i.displayWord==="stainless"&&i.sourcePage===192)).toMatchObject({printedLabel:"*",sourcePage:192});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="confer a degree / diploma on sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make / draw an inference")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="put sb in prison")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="intimidate sb into + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="ward off... = get rid of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="flunk out of school = withdraw from school")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have resentment toward(s)...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="A be treated to B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the Commonwealth of Nations = the (British) Commonwealth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The president often confers with his advisers on important issues"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The president of Yale University conferred an honorary doctorate"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Dennis hates to get up early"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===186&&i.label==="refer to...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===186&&i.label==="confer with sb")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===186&&i.label==="confer a degree / diploma on sb")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===186&&i.label==="be starving to death")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===187&&i.label==="a bulletproof vest")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===188&&i.label==="put sb in prison")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===191&&i.label==="a maternity ward")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===191&&i.label==="A be treated to B")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===192&&i.label==="black pepper")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===192&&i.label==="a red pepper")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===192&&i.label==="a green pepper")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===192&&i.label==="give evidence")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===192&&i.label==="stainless steel")).toMatchObject({printedLabel:""});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===20)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});

it("keeps native checked readable source batch 42-u20-p191-comparison",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U20-V097")).toMatchObject({targetMeaningZh:"可怕的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U20-V097")).toMatchObject({chapterMeaningsZh:"可怕的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U20-V097")).toMatchObject({meaningSource:"textbook_transcription"});
});
