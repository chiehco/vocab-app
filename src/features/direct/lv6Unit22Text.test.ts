import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit22.json';
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
const unit=findUnit(22,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["reconcile", "renowned", "notorious", "shoplift", "seduce", "lure", "versatile", "usher", "vibrate", "vibration", "referendum", "rehearse", "rigorous", "strangle", "suffocate", "smother", "synonym", "antonym", "stationery", "liner", "retort", "acre", "chirp", "sneaker", "imposing", "spacecraft", "folklore", "devour", "imperial", "occurrence", "drizzle", "disbelief", "disbelieve", "octopus", "oyster", "clam", "trout", "taboo", "tattoo", "confederation", "redundancy", "redundant", "relentless", "procession", "prospective"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:33},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>204+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:213,printedUnit:'Unit 23',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===22)).toMatchObject({count:123,usageCount:36,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(159);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["shoplift", "smother", "drizzle", "disbelieve", "taboo", "tattoo", "redundant", "reconciliation", "womanizer", "infamous", "shoplifter", "stole", "stolen", "seduction", "seductive", "provocative", "versatility", "vibrant", "pluck", "hectic", "upcoming", "forensic", "synonymous", "antonymous", "cruiser", "warship", "raft", "twitter", "tweet", "empress", "downpour", "octopi", "octopuses", "squid", "tentacle", "gulp", "shellfish", "trouts", "taboos", "premarital", "tattoos", "parlor", "federation", "the Confederacy", "redundancies", "superfluous", "endless", "relent"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 9 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(48);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(9);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 72 mapped identities in a complete 159-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(159);expect(ids).toHaveLength(72);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(72);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',22,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,45).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U22',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U22',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U22 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U22 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.slice(45).find(i=>i.displayWord==="stole"&&i.sourcePage===204)).toMatchObject({printedLabel:"三",sourcePage:204});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="stolen"&&i.sourcePage===204)).toMatchObject({printedLabel:"三",sourcePage:204});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="upcoming"&&i.sourcePage===206)).toMatchObject({printedLabel:"",sourcePage:206});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="mattress"&&i.sourcePage===206)).toMatchObject({printedLabel:"",sourcePage:206});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="spaceship"&&i.sourcePage===208)).toMatchObject({printedLabel:"=",sourcePage:208});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="octopi"&&i.sourcePage===209)).toMatchObject({printedLabel:"複",sourcePage:209});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="octopuses"&&i.sourcePage===209)).toMatchObject({printedLabel:"複",sourcePage:209});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="trout"&&i.sourcePage===210)).toMatchObject({printedLabel:"複",sourcePage:210});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="trouts"&&i.sourcePage===210)).toMatchObject({printedLabel:"複",sourcePage:210});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="the Confederacy"&&i.sourcePage===210)).toMatchObject({printedLabel:"*",sourcePage:210});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="limousine"&&i.sourcePage===211)).toMatchObject({printedLabel:"*",sourcePage:211});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="limo"&&i.sourcePage===211)).toMatchObject({printedLabel:"=",sourcePage:211});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="estate"&&i.sourcePage===212)).toMatchObject({printedLabel:"*",sourcePage:212});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be renowned for... = be famous for... = be famed for... = be noted for...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be renowned as... = be famous as... = be known as...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="lure sb into + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a synonym for / of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="devour sth = gulp sth down = wolf sth down")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an unexpected / a frequent / a rare / a common occurrence")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the world is sb's oyster")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a prospective buyer / client")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("John has a vibrant personality"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Strong and weak are antonyms"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Premarital sex is considered a taboo by some people"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===204&&i.label==="on the spot")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===206&&i.label==="risk + V-ing")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===207&&i.label==="a stationary bike")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===207&&i.label==="be none of sb's business")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===208&&i.label==="hold sb in awe")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===209&&i.label==="a reminder of...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===211&&i.label==="go away")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===211&&i.label==="by the hour")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===212&&i.label==="real estate")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===212&&i.label==="a real estate agent")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===212&&i.label==="show sb around")).toMatchObject({printedLabel:""});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===22)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1,2,4,5,6,7,8,9,10]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});
