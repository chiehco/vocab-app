import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit24.json';
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
const unit=findUnit(24,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["intellect", "miraculous", "forthcoming", "extracurricular", "ponder", "meditate", "meditation", "evacuate", "exempt", "faction", "hypocrite", "hypocritical", "hypocrisy", "tedious", "monotony", "longevity", "mute", "backbone", "amid", "kin", "fragrant", "fragrance", "ornament", "revolt", "disciple", "solitary", "solitude", "induce", "velvet", "industrialize", "dispense", "dispensable", "yogurt", "patriot", "patriotic", "outgoing", "orphanage", "hybrid", "convene", "scrutiny", "salvage", "savage", "ruthless", "organizer"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,44).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:35},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>222+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:231,printedUnit:'Unit 25',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===24)).toMatchObject({count:131,usageCount:26,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(157);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(44).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["hypocritical", "hypocrisy", "miraculously", "approaching", "evacuation", "double-dealer", "insincere", "fundraiser", "monotonous", "permanence", "mute button", "state-of-the-art", "bribery", "perfumed", "scented", "aromatic", "aroma", "the holiday season", "rebelled", "believer", "industrialist", "dispenser", "dispensary", "unnecessary", "yoghurt", "patriotism", "militia", "extrovert", "extroverted", "introvert", "introverted", "rep", "sales rep", "poodle", "cocker spaniel", "uncivilized", "cannibalism", "merciless"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 6 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(38);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(6);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 92 mapped identities in a complete 157-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(157);expect(ids).toHaveLength(92);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(92);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',24,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,44).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U24',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U24',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U24 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U24 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.slice(44).find(i=>i.displayWord==="fundraiser"&&i.sourcePage===224)).toMatchObject({printedLabel:"",sourcePage:224});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="mute button"&&i.sourcePage===224)).toMatchObject({printedLabel:"=",sourcePage:224});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="spine"&&i.sourcePage===225)).toMatchObject({printedLabel:"=",sourcePage:225});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="amidst"&&i.sourcePage===225)).toMatchObject({printedLabel:"=",sourcePage:225});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="the holiday season"&&i.sourcePage===226)).toMatchObject({printedLabel:"*",sourcePage:226});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="rebelled"&&i.sourcePage===226)).toMatchObject({printedLabel:"三",sourcePage:226});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="yoghurt"&&i.sourcePage===227)).toMatchObject({printedLabel:"=",sourcePage:227});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="extroverted"&&i.sourcePage===228)).toMatchObject({printedLabel:"=",sourcePage:228});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="introverted"&&i.sourcePage===228)).toMatchObject({printedLabel:"=",sourcePage:228});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="rep"&&i.sourcePage===228)).toMatchObject({printedLabel:"*",sourcePage:228});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="representative"&&i.sourcePage===228)).toMatchObject({printedLabel:"",sourcePage:228});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="cocker spaniel"&&i.sourcePage===228)).toMatchObject({printedLabel:"",sourcePage:228});
 expect(vocabulary.slice(44).find(i=>i.displayWord==="organize"&&i.sourcePage===230)).toMatchObject({printedLabel:"似",sourcePage:230});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="meditate on / upon sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="evacuate sb from + 地方")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="evacuate sb to + 地方")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have no backbone to + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="in the middle of... = in the midst of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be ornamented with sth = be decorated with sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="can't be too careful when...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="under scrutiny")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The monk meditates under that tree every morning"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Confucius"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("One of the most popular hybrid vehicles is the Prius"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===222&&i.label==="work / perform miracles")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===224&&i.label==="with regard to...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===225&&i.label==="in the middle of... = in the midst of...")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===226&&i.label==="claim sth to + V")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===227&&i.label==="can't be too careful when...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===230&&i.label==="in jest")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===24)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});
