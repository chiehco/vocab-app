import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit11.json';
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
const unit=findUnit(11,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["liable", "deter", "prohibition", "outset", "conspiracy", "populate", "inhabit", "inhabitant", "applicable", "simplicity", "simplify", "disgrace", "disgraceful", "friction", "deprive", "detergent", "detach", "detached", "altitude", "bodily", "celery", "grumble", "lunar", "feeble", "handicap", "prehistoric", "crackdown", "sharpen", "bribe", "tiptoe", "feminine", "token", "magnify", "priceless", "madam", "maiden", "mistress", "checkup", "tiresome", "weary", "preview", "bosom", "dissent", "avert"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,44).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:36},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>101+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:111,printedUnit:'Unit 12',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===11)).toMatchObject({count:124,usageCount:52,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(176);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(44).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["disgraceful", "detached", "deterred", "deterrence", "hinder", "shoplift", "forbiddance", "beginning", "onset", "malfunction", "conspiracies", "conspire", "populous", "dweller", "plainness", "simplified", "simplification", "attached", "frail", "handicapped", "clampdown", "bribery", "valueless", "behold", "ma'am", "woo", "concubine", "speculation", "assent", "meltdown"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 5 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(30);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(5);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 92 mapped identities in a complete 176-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(176);expect(ids).toHaveLength(92);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(92);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',11,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,44).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U11',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U11',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U11 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U11 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="deterred"&&i.sourcePage===101)).toMatchObject({printedLabel:"三",sourcePage:101});
 expect(vocabulary.find(i=>i.displayWord==="shoplift"&&i.sourcePage===101)).toMatchObject({printedLabel:"*",sourcePage:101});
 expect(vocabulary.find(i=>i.displayWord==="simplified"&&i.sourcePage===103)).toMatchObject({printedLabel:"三",sourcePage:103});
 expect(vocabulary.find(i=>i.displayWord==="vendor"&&i.sourcePage===105)).toMatchObject({printedLabel:"",sourcePage:105});
 expect(vocabulary.find(i=>i.displayWord==="calorie"&&i.sourcePage===105)).toMatchObject({printedLabel:"",sourcePage:105});
 expect(vocabulary.find(i=>i.displayWord==="meltdown"&&i.sourcePage===110)).toMatchObject({printedLabel:"*",sourcePage:110});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be liable to + N/V = be prone to + N/V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="inhabit + 地方 = live in / at + 地方 = dwell in / at + 地方 = reside in / at + 地方")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a city of + 數字 + inhabitants")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="dish detergent = dishwashing liquid")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="grumble about sth = complain about sth = whine about sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="on tiptoe(s)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="as a token of sb's appreciation / gratitude")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be weary of + N/V-ing = be tired of + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The gangsters robbed Judy of her money"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The general relieved Captain Smith of his duties"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The attached files are for reference during the meeting"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===103&&i.label==="apply for sth")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===103&&i.label==="make a scene")).toMatchObject({printedLabel:"*",explanationZh:"當眾大吵大鬧"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U11-G018")).toMatchObject({sourcePage:103,pattern:"make a scene",explanationZh:"當眾大吵大鬧"});
 expect(source.usage.find(i=>i.sourcePage===104&&i.label==="relieve sb of + sb's duties / post")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===104&&i.label==="a bar / cake of soap")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===105&&i.label==="attach A to B")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===105&&i.label==="inflict sth on sb")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===106&&i.label==="call for...")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===108&&i.label==="a symbol of...")).toMatchObject({printedLabel:""});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===11)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1,2,4,5,6,7,8,9,10]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});
