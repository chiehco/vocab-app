import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit19.json';
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
const unit=findUnit(19,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["encyclopedia", "enrich", "enrichment", "heroin", "edible", "cholesterol", "obesity", "diabetes", "cashier", "conscientious", "census", "dental", "cavity", "discomfort", "pebble", "oasis", "dismay", "emigrate", "emigration", "emigrant", "dual", "enlighten", "enlightenment", "expire", "expiration", "screwdriver", "plow", "chestnut", "walnut", "heterosexual", "homosexual", "dazzle", "dazzling", "novice", "sloppy", "relic", "spur", "nucleus", "flourish", "underway", "directive", "collision", "privatize"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,43).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:32},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>177+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:186,printedUnit:'Unit 20',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===19)).toMatchObject({count:130,usageCount:18,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(148);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(43).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["obesity", "dazzling", "encyclopedic", "eatable", "drinkable", "potable", "steroid", "obese", "cardiovascular", "diabetic", "insulin", "a cash register", "dutiful", "censor", "cavities", "a decayed tooth", "oases", "hustle and bustle", "migrate", "dual citizenship", "enlightening", "enlightened", "anchorman", "anchorwoman", "come to an end", "plough", "cashew", "cashew nut", "pine nut", "homo", "bisexual", "a neon sign", "slipshod", "archaeologist", "dug", "nuclei", "nucleuses", "proton", "neutron", "nuke", "in progress", "in business", "in operation", "underweight", "denationalize", "nationalize"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 9 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(46);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(9);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 84 mapped identities in a complete 148-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(148);expect(ids).toHaveLength(84);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(84);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',19,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,43).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U19',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U19',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U19 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U19 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="a cash register"&&i.sourcePage===178)).toMatchObject({printedLabel:"延伸",sourcePage:178});
 expect(vocabulary.find(i=>i.displayWord==="a decayed tooth"&&i.sourcePage===179)).toMatchObject({printedLabel:"似",sourcePage:179});
 expect(vocabulary.find(i=>i.displayWord==="hustle and bustle"&&i.sourcePage===179)).toMatchObject({printedLabel:"*",sourcePage:179});
 expect(vocabulary.find(i=>i.displayWord==="dual citizenship"&&i.sourcePage===181)).toMatchObject({printedLabel:"延伸",sourcePage:181});
 expect(vocabulary.find(i=>i.displayWord==="anchor"&&i.sourcePage===181)).toMatchObject({printedLabel:"*",sourcePage:181});
 expect(vocabulary.find(i=>i.displayWord==="anchorwoman"&&i.sourcePage===181)).toMatchObject({printedLabel:"",sourcePage:181});
 expect(vocabulary.find(i=>i.displayWord==="plough"&&i.sourcePage===182)).toMatchObject({printedLabel:"=",sourcePage:182});
 expect(vocabulary.find(i=>i.displayWord==="cashew nut"&&i.sourcePage===182)).toMatchObject({printedLabel:"=",sourcePage:182});
 expect(vocabulary.find(i=>i.displayWord==="dig"&&i.sourcePage===183)).toMatchObject({printedLabel:"",sourcePage:183});
 expect(vocabulary.find(i=>i.displayWord==="dug"&&i.sourcePage===183)).toMatchObject({printedLabel:"三",sourcePage:183});
 expect(vocabulary.find(i=>i.displayWord==="nuclei"&&i.sourcePage===183)).toMatchObject({printedLabel:"複",sourcePage:183});
 expect(vocabulary.find(i=>i.displayWord==="nucleuses"&&i.sourcePage===183)).toMatchObject({printedLabel:"複",sourcePage:183});
 expect(vocabulary.find(i=>i.displayWord==="proton"&&i.sourcePage===183)).toMatchObject({printedLabel:"*",sourcePage:183});
 expect(vocabulary.find(i=>i.displayWord==="neutron"&&i.sourcePage===183)).toMatchObject({printedLabel:"",sourcePage:183});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a walking encyclopedia")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a walking dictionary")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an automated teller machine")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="get / have a (tooth) cavity filled")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="come out (of the closet)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="on the spur of the moment")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="spur sb (on) to + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take charge (of...)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("He is gay"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("He is a gay"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("That was a really enlightening speech"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Gordon's parents hold enlightened views on education"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===177&&i.label==="a walking dictionary")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===178&&i.label==="an automated teller machine")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===182&&i.label==="come out (of the closet)")).toMatchObject({printedLabel:"延伸"});
 expect(source.usage.find(i=>i.sourcePage===184&&i.label==="a nuclear war")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===184&&i.label==="a nuclear bomb")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===184&&i.label==="take charge (of...)")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===19)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});

it("keeps native checked readable source batch 41-u19-p177-comparison",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U19-V051")).toMatchObject({sensePos:"n."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U19-V051")).toMatchObject({targetMeaningZh:"類固醇"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U19-V051")).toMatchObject({chapterMeaningsZh:"類固醇"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U19-V051")).toMatchObject({meaningSource:"textbook_transcription"});
});
