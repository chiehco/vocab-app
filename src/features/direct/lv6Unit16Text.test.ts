import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit16.json';
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
const unit=findUnit(16,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["brink", "verge", "divert", "diversion", "overlap", "yearn", "yearning", "modernize", "modernization", "predecessor", "offspring", "indignant", "harass", "harassment", "scenic", "disable", "disabled", "disability", "propel", "ironic", "hail", "aspire", "chant", "reckon", "anchor", "wharf", "twinkle", "cracker", "crutch", "shrub", "healthful", "wholesome", "mow", "cub", "stepchild", "stepfather", "stepmother", "reef", "muse", "tuck", "endowment", "cellular", "dividend"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,43).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:32},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>149+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:158,printedUnit:'Unit 17',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===16)).toMatchObject({count:113,usageCount:41,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(154);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(43).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["verge", "yearning", "disabled", "antagonism", "overlapped", "overlapping", "orthodontist", "renovate", "descendant", "well-being", "indignation", "handicapped", "accomplished", "propelled", "propeller", "state-of-the-art", "ironically", "sarcastic", "dent", "aspiration", "sutra", "anchorage", "anchorperson", "anchorman", "anchorwoman", "glisten", "crunch", "stepchildren", "an adopted child", "adopted", "an adoptive father", "adoptive", "an adoptive mother", "endow", "mobile phone"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 6 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(35);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(6);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 77 mapped identities in a complete 154-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(154);expect(ids).toHaveLength(77);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(77);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',16,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,43).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U16',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U16',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U16 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U16 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="antagonism"&&i.sourcePage===149)).toMatchObject({printedLabel:"*",sourcePage:149});
 expect(vocabulary.find(i=>i.displayWord==="overlapped"&&i.sourcePage===149)).toMatchObject({printedLabel:"三",sourcePage:149});
 expect(vocabulary.find(i=>i.displayWord==="anchorwoman"&&i.sourcePage===154)).toMatchObject({printedLabel:"",sourcePage:154});
 expect(vocabulary.find(i=>i.displayWord==="stepchildren"&&i.sourcePage===156)).toMatchObject({printedLabel:"複",sourcePage:156});
 expect(vocabulary.find(i=>i.displayWord==="an adopted child"&&i.sourcePage===156)).toMatchObject({printedLabel:"比",sourcePage:156});
 expect(vocabulary.find(i=>i.displayWord==="adopted"&&i.sourcePage===156)).toMatchObject({printedLabel:"*",sourcePage:156});
 expect(vocabulary.find(i=>i.displayWord==="an adoptive father"&&i.sourcePage===156)).toMatchObject({printedLabel:"比",sourcePage:156});
 expect(vocabulary.find(i=>i.displayWord==="adoptive"&&i.sourcePage===156)).toMatchObject({printedLabel:"*",sourcePage:156});
 expect(vocabulary.find(i=>i.displayWord==="cellphone"&&i.sourcePage===157)).toMatchObject({printedLabel:"=",sourcePage:157});
 expect(vocabulary.find(i=>i.displayWord==="mobile phone"&&i.sourcePage===157)).toMatchObject({printedLabel:"=",sourcePage:157});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be on the verge of... = be on the brink / edge of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have a yearning for + N / to + V = have a desire for + N / to + V = have a craving for + N / to + V = have a longing for + N / to + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="現今多以 people with disabilities 代替 physically challenged、the handicapped 或 the disabled。")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="What do you reckon?")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="Great Barrier Reef")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="cellular phone = cellphone = mobile phone")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Albert Einstein was hailed as one of the most distinguished scientists of the twentieth century"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The monks chant sutras every morning"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("During the service in the church"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===151&&i.label==="make a complaint to sb")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===151&&i.label==="be prone to sth")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===152&&i.label==="be able to + V")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===152&&i.label==="enable sb to + V")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===152&&i.label==="be confined to...")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===152&&i.label==="現今多以 people with disabilities 代替 physically challenged、the handicapped 或 the disabled。")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===155&&i.label==="be in good / poor health")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===155&&i.label==="healthy food")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===157&&i.label==="in one's will")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===16)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1,2,4,5,6,7,8,9,10,11,13,14,15,16,17,19,20,21,22,23,24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});

it("keeps native checked readable source batch 38-u16-p156-comparison",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V102")).toMatchObject({sensePos:null});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V102")).toMatchObject({targetMeaningZh:"養子／女"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V102")).toMatchObject({chapterMeaningsZh:"養子／女"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V102")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V103")).toMatchObject({sensePos:"adj."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V103")).toMatchObject({targetMeaningZh:"被領養的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V103")).toMatchObject({chapterMeaningsZh:"被領養的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V103")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V104")).toMatchObject({sensePos:null});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V104")).toMatchObject({targetMeaningZh:"養父"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V104")).toMatchObject({chapterMeaningsZh:"養父"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V104")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V105")).toMatchObject({sensePos:"adj."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V105")).toMatchObject({targetMeaningZh:"領養（人）的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V105")).toMatchObject({chapterMeaningsZh:"領養（人）的"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V105")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V106")).toMatchObject({sensePos:null});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V106")).toMatchObject({targetMeaningZh:"養母"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V106")).toMatchObject({chapterMeaningsZh:"養母"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U16-V106")).toMatchObject({meaningSource:"textbook_transcription"});
});
