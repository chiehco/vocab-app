import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit35.json';
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
const unit=findUnit(35,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["mirror", "prince", "spread", "foolish", "silly", "desert", "sand", "camel", "cockroach", "spider", "worm", "liquid", "boil", "castle", "dragon", "chalk", "blackboard", "notebook", "workbook", "textbook", "text", "pupil", "active", "activity", "task", "message", "spot", "travel", "tour", "guide", "introduce", "introduction", "arrange", "arrangement", "contact", "dentist", "toothache", "toothbrush", "brush", "feeling", "fireman"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:21},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>309+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:318,printedUnit:'Unit 36',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===35)).toMatchObject({count:99,usageCount:52,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(151);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["wildfire", "heartless", "cockroaches", "earthworm", "silkworm", "gaseous", "have a crush on sb", "sandcastle", "tycoon", "activities", "spotted", "sunbathe", "introductory", "from all walks of life", "decayed", "toothpaste", "hairbrush", "firemen", "firewomen"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 19 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(19);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(19);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 78 mapped identities in a complete 151-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(151);expect(ids).toHaveLength(78);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(78);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',35,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U35',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U35',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U35 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U35 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="princess")).toMatchObject({printedLabel:"反",sourcePage:309});
 expect(vocabulary.find(i=>i.displayWord==="widespread")).toMatchObject({printedLabel:"衍",sourcePage:309});
 expect(vocabulary.find(i=>i.displayWord==="cockroaches")).toMatchObject({printedLabel:"複",sourcePage:310});
 expect(vocabulary.find(i=>i.displayWord==="fluid")).toMatchObject({printedLabel:"似",sourcePage:311});
 expect(vocabulary.find(i=>i.displayWord==="gas")).toMatchObject({printedLabel:"延伸",sourcePage:311});
 expect(vocabulary.find(i=>i.displayWord==="activities")).toMatchObject({printedLabel:"複",sourcePage:313});
 expect(vocabulary.find(i=>i.displayWord==="performance")).toMatchObject({printedLabel:"",sourcePage:314});
 expect(vocabulary.find(i=>i.displayWord==="introductory")).toMatchObject({printedLabel:"衍",sourcePage:315});
 expect(vocabulary.find(i=>i.displayWord==="decayed")).toMatchObject({printedLabel:"*",sourcePage:316});
 expect(vocabulary.find(i=>i.displayWord==="firewoman")).toMatchObject({printedLabel:"反",sourcePage:317});
 expect(vocabulary.find(i=>i.displayWord==="firewomen")).toMatchObject({printedLabel:"複數為",sourcePage:317});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="look in / into a mirror")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="spread, spread, spread")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="spread A on B = spread B with A")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="bury / have one's head in the sand")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a reference book")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an extracurricular activity")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a guide dog = a seeing-eye dog")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="arrange for sth to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make eye contact with sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("My mother takes a flower arranging class every Wednesday."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("I have the feeling that he\u2019ll come."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===310&&i.label==="the ship of the desert")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===311&&i.label==="a chalk（×） → a piece of chalk（○）")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===312&&i.label==="a reference book")).toMatchObject({printedLabel:"延伸"});
 expect(source.usage.find(i=>i.sourcePage===314&&i.label==="train A as B = A be trained as B")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===315&&i.label==="flower arranging")).toMatchObject({printedLabel:"延伸"});
 expect(source.usage.find(i=>i.sourcePage===316&&i.label==="a decayed tooth")).toMatchObject({printedLabel:"延伸"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===35)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
