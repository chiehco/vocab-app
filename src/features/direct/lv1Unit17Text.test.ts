import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV1Unit17.json';
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
const unit=findUnit(17,'LV1')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["first", "second", "third", "root", "climb", "gift", "present", "cook", "joy", "ring", "sentence", "word", "noise", "noisy", "coat", "jacket", "correct", "incorrect", "send", "mail", "email", "camera", "photograph", "angry", "mad", "snake", "fat", "slim", "am", "pm", "bread", "fun", "funny", "tired", "tiring", "bottle", "brown", "coffee", "bow"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,39).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:24},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>150+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:159,printedUnit:'Unit 18',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===17)).toMatchObject({count:89,usageCount:53,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(142);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(39).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["incorrect", "tiring", "firstly", "second-hand", "secondly", "thirdly", "steadily", "euro", "correctly", "correction", "mailman", "postman", "angrily", "python", "fatty", "low-fat", "A.M.", "AM", "P.M.", "PM", "tyre", "bottleneck", "bottled water"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 21 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(23);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(21);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 62 mapped identities in a complete 142-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(142);expect(ids).toHaveLength(62);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(62);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV1',17,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,39).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
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
 expect(vocabulary.find(i=>i.displayWord==="priority"&&i.sourcePage===150&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:150});
 expect(vocabulary.find(i=>i.displayWord==="prejudice"&&i.sourcePage===151)).toMatchObject({printedLabel:"",sourcePage:151});
 expect(vocabulary.find(i=>i.displayWord==="euro"&&i.sourcePage===151)).toMatchObject({printedLabel:"",sourcePage:151});
 expect(vocabulary.find(i=>i.displayWord==="postman"&&i.sourcePage===154&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:154});
 expect(vocabulary.find(i=>i.displayWord==="photo"&&i.sourcePage===155&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:155});
 expect(vocabulary.find(i=>i.displayWord==="python"&&i.sourcePage===155&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:155});
 expect(vocabulary.find(i=>i.displayWord==="thin"&&i.sourcePage===156&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:156});
 expect(vocabulary.find(i=>i.displayWord==="a.m."&&i.sourcePage===156&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:156});
 expect(vocabulary.find(i=>i.displayWord==="PM"&&i.sourcePage===156&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:156});
 expect(vocabulary.find(i=>i.displayWord==="tyre"&&i.sourcePage===157&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:157});
 expect(vocabulary.find(i=>i.displayWord==="bottled water"&&i.sourcePage===157&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:157});
 expect(vocabulary.find(i=>i.displayWord==="terrorism"&&i.sourcePage===158&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:158});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="for the first time")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="on second thought = on second thoughts")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="second-hand smoke")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the third time's the charm")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="present sb with sth = present sth to sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a man / woman of few words")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="send sth/sb in")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="snake its way")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have a slim chance of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have fun + V-ing = have a good time + V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be tired from + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take / give a bow")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The love of money is the root of all evil."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Too many cooks spoil the broth."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Never bow to terrorism."))).toBe(false);
});
it('registers the printed LV1 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===17)).toMatchObject({volume:'LV1',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});

it('keeps independently checked empty continuation labels and direct stars',()=>{
 expect(source.related.find(r=>r.word==="prejudice"&&r.sourcePage===151)).toMatchObject({printedLabel:""});
 expect(vocabulary.find(r=>r.displayWord==="prejudice"&&r.sourcePage===151)).toMatchObject({printedLabel:""});
 expect(source.related.find(r=>r.word==="euro"&&r.sourcePage===151)).toMatchObject({printedLabel:""});
 expect(vocabulary.find(r=>r.displayWord==="euro"&&r.sourcePage===151)).toMatchObject({printedLabel:""});
 expect(source.related.find(r=>r.word==="ignorance"&&r.sourcePage===151)).toMatchObject({printedLabel:"*"});
 expect(vocabulary.find(r=>r.displayWord==="ignorance"&&r.sourcePage===151)).toMatchObject({printedLabel:"*"});
 expect(source.related.find(r=>r.word==="pound"&&r.sourcePage===151)).toMatchObject({printedLabel:"*"});
 expect(vocabulary.find(r=>r.displayWord==="pound"&&r.sourcePage===151)).toMatchObject({printedLabel:"*"});
});

it("keeps the checked original book meanings separate from dictionary senses",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV1U17-V061")).toMatchObject({"officialWordId": "W000716", "officialSenseId": null, "sensePos": "adj.", "targetMeaningZh": "正確的", "chapterMeaningsZh": "正確的", "meaningSource": "textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV1U17-V066")).toMatchObject({"officialWordId": "W001655", "officialSenseId": null, "sensePos": "n./vt.", "targetMeaningZh": "郵件；郵寄（英）", "chapterMeaningsZh": "郵件；郵寄（英）", "meaningSource": "textbook_transcription"});
});
