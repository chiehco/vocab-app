import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit17.json';
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
const unit=findUnit(17,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["hygiene", "sanitation", "trek", "solidarity", "momentum", "refine", "refinement", "reliance", "coalition", "layman", "sociology", "socialize", "sociable", "potent", "subordinate", "mastery", "accessory", "acclaim", "accountable", "accusation", "astray", "growl", "stutter", "mustache", "referee", "hearty", "shutter", "cucumber", "hedge", "statesman", "fishery", "underneath", "nag", "widow", "widower", "terrace", "bulky", "pending", "goodwill", "Celsius", "Fahrenheit", "psychiatry", "psychic", "psychotherapy"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,44).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:36},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>158+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:167,printedUnit:'Unit 18',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===17)).toMatchObject({count:94,usageCount:39,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(133);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(44).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["Celsius", "Fahrenheit", "hygienic", "sanitary", "trekked", "refined", "refinery", "layperson", "laymen", "sociological", "criminology", "unsociable", "potency", "snarl", "stammer", "moustache", "goatee", "umpire", "detector", "statesmen", "fisheries", "a bomb squad", "defuse", "nagged", "nagging", "secluded", "laptop", "psychiatrist", "psychical", "psycho"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 8 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(30);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(8);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 63 mapped identities in a complete 133-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(133);expect(ids).toHaveLength(63);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(63);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',17,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,44).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U17',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U17',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U17 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U17 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="trekked"&&i.sourcePage===158)).toMatchObject({printedLabel:"三",sourcePage:158});
 expect(vocabulary.find(i=>i.displayWord==="layperson"&&i.sourcePage===159)).toMatchObject({printedLabel:"=",sourcePage:159});
 expect(vocabulary.find(i=>i.displayWord==="criminology"&&i.sourcePage===159)).toMatchObject({printedLabel:"*",sourcePage:159});
 expect(vocabulary.find(i=>i.displayWord==="moustache"&&i.sourcePage===162)).toMatchObject({printedLabel:"=",sourcePage:162});
 expect(vocabulary.find(i=>i.displayWord==="goatee"&&i.sourcePage===162)).toMatchObject({printedLabel:"似",sourcePage:162});
 expect(vocabulary.find(i=>i.displayWord==="detector"&&i.sourcePage===163)).toMatchObject({printedLabel:"*",sourcePage:163});
 expect(vocabulary.find(i=>i.displayWord==="a bomb squad"&&i.sourcePage===164)).toMatchObject({printedLabel:"*",sourcePage:164});
 expect(vocabulary.find(i=>i.displayWord==="defuse"&&i.sourcePage===164)).toMatchObject({printedLabel:"",sourcePage:164});
 expect(vocabulary.find(i=>i.displayWord==="ambassador"&&i.sourcePage===164)).toMatchObject({printedLabel:"",sourcePage:164});
 expect(vocabulary.find(i=>i.displayWord==="nagged"&&i.sourcePage===164)).toMatchObject({printedLabel:"三",sourcePage:164});
 expect(vocabulary.find(i=>i.displayWord==="psychical"&&i.sourcePage===166)).toMatchObject({printedLabel:"=",sourcePage:166});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="show / express one's solidarity with sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="rely on... = depend on... = count on...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="in layman's terms")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be held accountable for sth = be held responsible for sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be / remain as cool as a cucumber")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="nag sb to + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Tim's personal hygiene is terrible"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Abraham Lincoln was a great statesman"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Some people thought that the fortune teller had amazing psychic powers"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===159&&i.label==="rely on... = depend on... = count on...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===159&&i.label==="be reliant on...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===161&&i.label==="receive acclaim")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===161&&i.label==="be accused of sth")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===163&&i.label==="a lie detector")).toMatchObject({printedLabel:""});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===17)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1,2,4,5,6,7,8,9,10]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});

it("keeps native checked readable source batch 39-u17-comparisons",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U17-V070")).toMatchObject({sensePos:"n."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U17-V070")).toMatchObject({targetMeaningZh:"（棒球等）裁判（在比賽中常靜止不動）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U17-V070")).toMatchObject({chapterMeaningsZh:"（棒球等）裁判（在比賽中常靜止不動）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U17-V070")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U17-V073")).toMatchObject({targetMeaningZh:"（鐵製或木頭製的）籬笆"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U17-V073")).toMatchObject({chapterMeaningsZh:"（鐵製或木頭製的）籬笆"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U17-V073")).toMatchObject({meaningSource:"textbook_transcription"});
});
