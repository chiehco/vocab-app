import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit18.json';
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
const unit=findUnit(18,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["brochure", "pamphlet", "addiction", "eccentric", "freak", "aviation", "capsule", "annoyance", "antibiotic", "assassinate", "assassination", "assassin", "boycott", "caption", "captive", "captivity", "algebra", "wag", "porter", "chemist", "navigate", "navigation", "flake", "refute", "heighten", "stagger", "curb", "notable", "notably", "flaw", "heroic", "underpass", "curry", "nearsighted", "shortsighted", "slaughter", "slay", "nostril", "woe", "broaden", "reign", "evoke", "champagne", "provisional", "prototype"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:35},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>167+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:177,printedUnit:'Unit 19',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===18)).toMatchObject({count:123,usageCount:29,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(152);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["pamphlet", "assassination", "notably", "leaflet", "addictive", "enthusiast", "fanatic", "avian", "bird flu", "aerospace", "simulate", "annoying", "nuisance", "antibody", "antidote", "captivate", "wagged", "navigator", "waters", "cornflakes", "snowflake", "ninja", "skid", "flawed", "overpass", "myopia", "farsighted", "massacre", "slew", "slain", "flare", "woeful", "seaside"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 4 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(33);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(4);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 89 mapped identities in a complete 152-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(152);expect(ids).toHaveLength(89);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(89);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',18,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,45).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U18',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U18',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U18 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U18 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(source.related[38]).toMatchObject({word:"evolve",sourcePage:171,printedLabel:"*",sourcePos:"vt.",chapterMeaningsZh:"進化"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V084")).toMatchObject({displayWord:"evolve",sourcePage:171,printedLabel:"*",sensePos:"vt.",targetMeaningZh:"進化",chapterMeaningsZh:"進化",officialWordId:"W004359"});
 expect(vocabulary.find(i=>i.displayWord==="conserve"&&i.sourcePage===167)).toMatchObject({printedLabel:"*",sourcePage:167});
 expect(vocabulary.find(i=>i.displayWord==="bird flu"&&i.sourcePage===168)).toMatchObject({printedLabel:"=",sourcePage:168});
 expect(vocabulary.find(i=>i.displayWord==="astronaut"&&i.sourcePage===168)).toMatchObject({printedLabel:"*",sourcePage:168});
 expect(vocabulary.find(i=>i.displayWord==="simulate"&&i.sourcePage===168)).toMatchObject({printedLabel:"",sourcePage:168});
 expect(vocabulary.find(i=>i.displayWord==="antibody"&&i.sourcePage===168)).toMatchObject({printedLabel:"延伸",sourcePage:168});
 expect(vocabulary.find(i=>i.displayWord==="captivate"&&i.sourcePage===170)).toMatchObject({printedLabel:"似",sourcePage:170});
 expect(vocabulary.find(i=>i.displayWord==="waters"&&i.sourcePage===171)).toMatchObject({printedLabel:"*",sourcePage:171});
 expect(vocabulary.find(i=>i.displayWord==="pedestrian"&&i.sourcePage===172)).toMatchObject({printedLabel:"",sourcePage:172});
 expect(vocabulary.find(i=>i.displayWord==="heroin"&&i.sourcePage===173)).toMatchObject({printedLabel:"似",sourcePage:173});
 expect(vocabulary.find(i=>i.displayWord==="slew"&&i.sourcePage===174)).toMatchObject({printedLabel:"三",sourcePage:174});
 expect(vocabulary.find(i=>i.displayWord==="slain"&&i.sourcePage===174)).toMatchObject({printedLabel:"三",sourcePage:174});
 expect(vocabulary.find(i=>i.displayWord==="resort"&&i.sourcePage===175)).toMatchObject({printedLabel:"",sourcePage:175});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="avian flu = bird flu")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="call for a boycott against...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the capture of a thief")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be a closed book to sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the tail wagging the dog")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="flake (off)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="broaden one's horizons")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the prototype of a(n)...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("I was totally captivated by Mary's beauty"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The snowflakes disappeared right after they fell onto the ground"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Mark's design is rejected because there is a flaw"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===168&&i.label==="avian flu = bird flu")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===169&&i.label==="capture a thief")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===169&&i.label==="the capture of a thief")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===170&&i.label==="be a closed book to sb")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===170&&i.label==="a port city")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===172&&i.label==="hail a taxi / cab")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===175&&i.label==="be nostalgic about...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===175&&i.label==="the provision of...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===175&&i.label==="make provision for...")).toMatchObject({printedLabel:""});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===18)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1,2,4,5,6,7,8,9,10]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});

it("keeps native checked readable source batch 40-u18-comparisons",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V047")).toMatchObject({sensePos:"n."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V047")).toMatchObject({targetMeaningZh:"（單頁）傳單"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V047")).toMatchObject({chapterMeaningsZh:"（單頁）傳單"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V047")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V059")).toMatchObject({targetMeaningZh:"藥丸；避孕藥"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V059")).toMatchObject({chapterMeaningsZh:"藥丸；避孕藥"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V059")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V060")).toMatchObject({targetMeaningZh:"藥片"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V060")).toMatchObject({chapterMeaningsZh:"藥片"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V060")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V060")).toMatchObject({printedLabel:""});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V071")).toMatchObject({sensePos:"n."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V071")).toMatchObject({targetMeaningZh:"新聞標題"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V071")).toMatchObject({chapterMeaningsZh:"新聞標題"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U18-V071")).toMatchObject({meaningSource:"textbook_transcription"});
});
