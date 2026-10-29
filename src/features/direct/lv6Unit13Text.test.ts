import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit13.json';
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
const unit=findUnit(13,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["superiority", "wardrobe", "transmit", "nurture", "cultivate", "abound", "abundance", "feasible", "plausible", "urgency", "dictate", "dictation", "static", "revelation", "thermometer", "mobilize", "subjective", "cardinal", "renaissance", "corpse", "cramp", "fracture", "rotate", "rotation", "anthem", "boulevard", "ceramic", "fiancé / fiancée", "harden", "harness", "cram", "maple", "crossing", "shortcoming", "stroll", "radish", "marginal", "quake", "trademark", "martial", "doom"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:36},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>120+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:130,printedUnit:'Unit 14',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===13)).toMatchObject({count:100,usageCount:55,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(155);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["plausible", "static", "renaissance", "fianc\u00e9 / fianc\u00e9e", "inferiority", "naval", "transmitted", "cultivated", "the press", "infertile", "profusion", "implausible", "build-up", "embezzlement", "barometer", "mobilization", "subjectivity", "carcass", "corps", "decayed", "commandant", "Blvd.", "crammed", "maple tree", "sweetener", "sap", "drawback", "picturesque", "radishes", "the competition", "karate"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 5 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(31);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(5);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 69 mapped identities in a complete 155-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(155);expect(ids).toHaveLength(69);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(69);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',13,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U13',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U13',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U13 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U13 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="the press"&&i.sourcePage===121)).toMatchObject({printedLabel:"*",sourcePage:121});
 expect(vocabulary.find(i=>i.displayWord==="build-up"&&i.sourcePage===123)).toMatchObject({printedLabel:"*",sourcePage:123});
 expect(vocabulary.find(i=>i.displayWord==="commandant"&&i.sourcePage===124)).toMatchObject({printedLabel:"*",sourcePage:124});
 expect(vocabulary.find(i=>i.displayWord==="Blvd."&&i.sourcePage===126)).toMatchObject({printedLabel:"",sourcePage:126});
 expect(vocabulary.find(i=>i.displayWord==="sap"&&i.sourcePage===127)).toMatchObject({printedLabel:"",sourcePage:127});
 expect(vocabulary.find(i=>i.displayWord==="radishes"&&i.sourcePage===128)).toMatchObject({printedLabel:"複",sourcePage:128});
 expect(vocabulary.find(i=>i.displayWord==="the competition"&&i.sourcePage===129)).toMatchObject({printedLabel:"*",sourcePage:129});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a sense of superiority = a superiority complex")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="in abundance = in profusion = in large quantities")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make use of... = take advantage of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a railroad / grade crossing = a level crossing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a pedestrian / zebra crossing = a crosswalk")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take a stroll = go for a stroll = take a walk = go for a walk")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="doom... to failure")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Scientists debate how we are affected by nature and nurture"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("General Woodward was promoted"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Alice was brokenhearted when she saw her fianc\u00e9"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===120&&i.label==="a sense of inferiority = an inferiority complex")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===124&&i.label==="the Marine Corps")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===126&&i.label==="job rotation")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===126&&i.label==="crop rotation")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===126&&i.label==="in rotation")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===127&&i.label==="cheat on sb")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===127&&i.label==="for good = forever")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===129&&i.label==="a corporate giant")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===129&&i.label==="impose A on B")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===13)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});

it("keeps native checked readable source batch 35-u13-p125-comparison",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U13-V074")).toMatchObject({sensePos:"vi./vt."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U13-V074")).toMatchObject({targetMeaningZh:"（地球）公轉；（使）旋轉"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U13-V074")).toMatchObject({chapterMeaningsZh:"（地球）公轉；（使）旋轉"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U13-V074")).toMatchObject({meaningSource:"textbook_transcription"});
});
