import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit25.json';
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
const unit=findUnit(25,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["transplant", "nourish", "nourishment", "outnumber", "underestimate", "vanilla", "utensil", "outrage", "outrageous", "retrieve", "royalty", "smuggle", "escalate", "stationary", "staple", "symmetry", "veterinarian", "ounce", "snore", "badge", "arithmetic", "clasp", "bra", "solemn", "janitor", "wrinkle", "dresser", "dressing", "freeway", "inland", "yoga", "fume", "pact", "pollutant", "revolve", "woodpecker", "peacock", "seagull", "sparrow", "statute", "jockey", "offshore", "obsess", "obsession", "booklet"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:38},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:9},(_,i)=>231+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:239,printedUnit:'Unit 25',pageType:'content'});
 expect(source.photos.some(p=>p.pageType==='boundary')).toBe(false);
 expect(source.endEvidence).toMatchObject({kind:'observed_unit_end',sourcePage:239,lastHeadword:"booklet",followingUnitVerified:false});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===25)).toMatchObject({count:130,usageCount:26,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(156);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["escalate", "pact", "pollutant", "obsession", "transplantation", "nourishing", "outwit", "outsmart", "outdistance", "outlive", "outshine", "overestimate", "whisk", "infuriate", "shocking", "parole", "retriever", "royalties", "smuggler", "stapler", "symmetrical", "asymmetry", "esthetics", "aesthetics", "solemnity", "solemnly", "wrinkled", "a tall tale", "seasoning", "condiment", "expressway", "peck", "peahen", "lamppost", "rider", "inshore", "onshore", "orchid", "pamphlet", "handbook"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 2 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(40);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(2);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 87 mapped identities in a complete 156-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(156);expect(ids).toHaveLength(87);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(87);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',25,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,45).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U25',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U25',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U25 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U25 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.slice(45).find(i=>i.displayWord==="outwit"&&i.sourcePage===231)).toMatchObject({printedLabel:"延伸",sourcePage:231});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="outshine"&&i.sourcePage===231)).toMatchObject({printedLabel:"延伸",sourcePage:231});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="esthetics"&&i.sourcePage===234)).toMatchObject({printedLabel:"*",sourcePage:234});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="aesthetics"&&i.sourcePage===234)).toMatchObject({printedLabel:"=",sourcePage:234});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="vet"&&i.sourcePage===234)).toMatchObject({printedLabel:"常簡寫",sourcePage:234});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="brassiere"&&i.sourcePage===235)).toMatchObject({printedLabel:"=",sourcePage:235});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="a tall tale"&&i.sourcePage===235)).toMatchObject({printedLabel:"*",sourcePage:235});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="sauce"&&i.sourcePage===236)).toMatchObject({printedLabel:"延伸",sourcePage:236});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="rotation"&&i.sourcePage===237)).toMatchObject({printedLabel:"",sourcePage:237});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="notice"&&i.sourcePage===237)).toMatchObject({printedLabel:"=",sourcePage:237});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="inshore"&&i.sourcePage===238)).toMatchObject({printedLabel:"比",sourcePage:238});
 expect(vocabulary.slice(45).find(i=>i.displayWord==="handbook"&&i.sourcePage===239)).toMatchObject({printedLabel:"延伸",sourcePage:239});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="transplant A to B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a liver / heart transplant")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a member of the royalty")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="smuggle sth into + 地方")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="smuggle sth out of + 地方")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a badge of honor")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="wrinkle (up) one's nose")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="car exhaust fumes")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="revolve around...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be obsessed with...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Women usually outlive their husbands"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("An ounce of prevention is worth a pound of cure"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("New Zealand is a country where the sheep population outnumbers the human population"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===232&&i.label==="be on parole")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===232&&i.label==="a golden retriever")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===235&&i.label==="a wrinkled face")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===236&&i.label==="stand sb up")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===237&&i.label==="reduce pollution")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===237&&i.label==="peck at...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===238&&i.label==="drive under the influence")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===238&&i.label==="cost sb sth")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===25)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1,2,4,5,6,7,8,9,10,11,13,14,15,16,17,19,20,21,22,23,24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});

it("keeps native checked readable source batch 43-u25-comparisons",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V082")).toMatchObject({targetMeaningZh:"磅（等於 454 公克，縮寫為 lb）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V082")).toMatchObject({chapterMeaningsZh:"磅（等於 454 公克，縮寫為 lb）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V082")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V088")).toMatchObject({targetMeaningZh:"內衣（集合名詞，不可數）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V088")).toMatchObject({chapterMeaningsZh:"內衣（集合名詞，不可數）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V088")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V111")).toMatchObject({sensePos:"vi./vt."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V111")).toMatchObject({targetMeaningZh:"（使）旋轉；地球自轉；輪流做"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V111")).toMatchObject({chapterMeaningsZh:"（使）旋轉；地球自轉；輪流做"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V111")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V112")).toMatchObject({targetMeaningZh:"旋轉；地球自轉；輪作"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V112")).toMatchObject({chapterMeaningsZh:"旋轉；地球自轉；輪作"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V112")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V123")).toMatchObject({sensePos:"adj."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V123")).toMatchObject({targetMeaningZh:"近岸的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V123")).toMatchObject({chapterMeaningsZh:"近岸的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V123")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V124")).toMatchObject({sensePos:"adj."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V124")).toMatchObject({targetMeaningZh:"陸上的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V124")).toMatchObject({chapterMeaningsZh:"陸上的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U25-V124")).toMatchObject({meaningSource:"textbook_transcription"});
});
