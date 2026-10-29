import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV1Unit19.json';
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
const unit=findUnit(19,'LV1')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["ticket", "nurse", "welcome", "hungry", "lucky", "sheep", "brave", "basket", "vegetable", "rice", "bell", "taxicab", "pie", "clothes", "shirt", "T-shirt", "smart", "stupid", "lion", "tiger", "kiss", "happy", "glad", "happiness", "sad", "sadness", "mouse", "soup", "loud", "rope", "bat", "baseball", "spell", "ghost", "flower", "rose", "orange", "meal"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,38).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:29},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:8},(_,i)=>166+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(7);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:173,printedUnit:'Unit 20',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===19)).toMatchObject({count:89,usageCount:52,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(141);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(38).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["T-shirt", "happiness", "sadness", "nursing", "luckily", "unlucky", "hillside", "fearless", "veggie", "doorbell", "lionhearted", "lioness", "kisses", "kisser", "happily", "delighted", "unhappy", "sadly", "sadden", "mice", "mouses", "loudly", "loudly", "bouquet", "rosy"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 22 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(25);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(22);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 62 mapped identities in a complete 141-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(141);expect(ids).toHaveLength(62);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(62);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV1',19,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,38).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
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
 expect(vocabulary.find(i=>i.displayWord==="nursing"&&i.sourcePage===166&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:166});
 expect(vocabulary.find(i=>i.displayWord==="hillside"&&i.sourcePage===167)).toMatchObject({printedLabel:"",sourcePage:167});
 expect(vocabulary.find(i=>i.displayWord==="doorbell"&&i.sourcePage===167&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:167});
 expect(vocabulary.find(i=>i.displayWord==="cab"&&i.sourcePage===168&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:168});
 expect(vocabulary.find(i=>i.displayWord==="lioness"&&i.sourcePage===168&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:168});
 expect(vocabulary.find(i=>i.displayWord==="kisses"&&i.sourcePage===169&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:169});
 expect(vocabulary.find(i=>i.displayWord==="mouses"&&i.sourcePage===170&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:170});
 expect(vocabulary.find(i=>i.displayWord==="loudly"&&i.sourcePage===170&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:170});
 expect(vocabulary.find(i=>i.displayWord==="bouquet"&&i.sourcePage===171&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:171});
 expect(vocabulary.find(i=>i.displayWord==="feast"&&i.sourcePage===172&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:172});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a ticket to + 地方")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a nursing home")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="You're welcome.")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a flock of sheep")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="hail a taxicab / taxi / cab")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a lion's den")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be happy about / with... = be satisfied with...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="learn / know the ropes")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="cast / put a spell (on sb)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a bunch / bouquet of roses")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="(a glass of) orange juice")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="serve a meal")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("There are not many wild tigers left in the world."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Most people have three meals a day."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===166&&i.label==="You're welcome.")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===167&&i.label==="sheep 單複數同形")).toMatchObject({printedLabel:"複"});
 expect(source.usage.find(i=>i.sourcePage===168&&i.label==="clothes 視為複數名詞，其後動詞須使用複數動詞。")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV1 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV1'&&u.unit===19)).toMatchObject({volume:'LV1',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});

it('preserves the native p166/p167 direct labels without inherited badges',()=>{
 expect(source.related[9]).toMatchObject({word:'hillside',sourcePage:167,printedLabel:''});
 expect(source.related.find(i=>i.word==='graze'&&i.sourcePage===167)).toMatchObject({printedLabel:'*'});
 expect(vocabulary.find(i=>i.learningItemId==='LI-LV1U19-V048')).toMatchObject({displayWord:'hillside',printedLabel:'',officialWordId:null});
 expect(vocabulary.find(i=>i.displayWord==='graze'&&i.sourcePage===167)).toMatchObject({printedLabel:'*'});
 expect(source.usage[6]).toMatchObject({label:"You're welcome.",sourcePage:166,printedLabel:''});
 expect(unit.items.find(i=>i.learningItemId==='LI-LV1U19-G007')).not.toHaveProperty('printedLabel');
});

it("keeps the checked original book meanings separate from dictionary senses",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV1U19-V046")).toMatchObject({"officialWordId": "W001490", "officialSenseId": null, "sensePos": "n.", "targetMeaningZh": "小羊；羊肉", "chapterMeaningsZh": "小羊；羊肉", "meaningSource": "textbook_transcription"});
});
