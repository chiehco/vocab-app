import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit40.json';
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
const unit=findUnit(40,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["wing", "combine", "mix", "mixture", "deaf", "gentle", "gentleman", "lady", "nephew", "niece", "mug", "pumpkin", "yam", "corn", "cabbage", "garlic", "nut", "soybean", "tofu", "mood", "skin", "tissue", "seem", "mention", "dryer", "internet", "network", "screen", "load", "upload", "download", "print", "printer", "hero", "safety", "café", "snack", "biscuit", "cocoa", "salty", "beg"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:21},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>354+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:363,printedUnit:'Unit 41',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===40)).toMatchObject({count:98,usageCount:50,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(148);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["winged", "deafness", "gentlemen", "table manners", "ladies", "jack-o'-lantern", "porridge", "bok choy", "vegetative", "nuts", "cashew", "soy sauce", "soya sauce", "soy milk", "soya milk", "toilet paper", "overload", "workload", "groceries", "footprint", "fingerprint", "block letters", "printery", "printing", "a coffee shop"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 25 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(25);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(25);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 72 mapped identities in a complete 148-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(148);expect(ids).toHaveLength(72);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(72);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',40,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U40',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U40',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U40 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U40 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="winged")).toMatchObject({printedLabel:"衍",sourcePage:354});
 expect(vocabulary.find(i=>i.displayWord==="dough")).toMatchObject({printedLabel:"*",sourcePage:354});
 expect(vocabulary.find(i=>i.displayWord==="deafness")).toMatchObject({printedLabel:"衍",sourcePage:355});
 expect(vocabulary.find(i=>i.displayWord==="rough")).toMatchObject({printedLabel:"反",sourcePage:355});
 expect(vocabulary.find(i=>i.displayWord==="gentlemen")).toMatchObject({printedLabel:"複",sourcePage:355});
 expect(vocabulary.find(i=>i.displayWord==="table manners")).toMatchObject({printedLabel:"*",sourcePage:355});
 expect(vocabulary.find(i=>i.displayWord==="ladies")).toMatchObject({printedLabel:"複",sourcePage:355});
 expect(vocabulary.find(i=>i.displayWord==="jack-o'-lantern")).toMatchObject({printedLabel:"*",sourcePage:356});
 expect(vocabulary.find(i=>i.displayWord==="bok choy")).toMatchObject({printedLabel:"=",sourcePage:356});
 expect(vocabulary.find(i=>i.displayWord==="vegetative")).toMatchObject({printedLabel:"",sourcePage:356});
 expect(vocabulary.find(i=>i.displayWord==="cashew")).toMatchObject({printedLabel:"延伸",sourcePage:357});
 expect(vocabulary.find(i=>i.displayWord==="soya sauce")).toMatchObject({printedLabel:"=",sourcePage:357});
 expect(vocabulary.find(i=>i.displayWord==="moody")).toMatchObject({printedLabel:"衍",sourcePage:357});
 expect(vocabulary.find(i=>i.displayWord==="toilet paper")).toMatchObject({printedLabel:"=",sourcePage:358});
 expect(vocabulary.find(i=>i.displayWord==="appear")).toMatchObject({printedLabel:"似",sourcePage:358});
 expect(vocabulary.find(i=>i.displayWord==="candidate")).toMatchObject({printedLabel:"*",sourcePage:359});
 expect(vocabulary.find(i=>i.displayWord==="groceries")).toMatchObject({printedLabel:"*",sourcePage:359});
 expect(vocabulary.find(i=>i.displayWord==="block letters")).toMatchObject({printedLabel:"*",sourcePage:360});
 expect(vocabulary.find(i=>i.displayWord==="heroine")).toMatchObject({printedLabel:"反",sourcePage:360});
 expect(vocabulary.find(i=>i.displayWord==="a coffee shop")).toMatchObject({printedLabel:"似",sourcePage:361});
 expect(vocabulary.find(i=>i.displayWord==="refreshments")).toMatchObject({printedLabel:"延伸",sourcePage:361});
 expect(vocabulary.find(i=>i.displayWord==="spicy")).toMatchObject({printedLabel:"延伸",sourcePage:361});
 expect(vocabulary.find(i=>i.displayWord==="beggar")).toMatchObject({printedLabel:"衍",sourcePage:362});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take A under B's wing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a mixture of A and B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a ladies' room")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a first lady")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a persistent vegetative state")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have (a) thin / thick skin")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="seem like sb/sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="not to mention sth = not to mention the fact that... = to say nothing of... = not to speak of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a hair dryer = a hairdryer")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="surf the internet / Internet = surf the net / Net")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="load A with B = A be loaded with B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="for safety's sake")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="beg, begged, begged")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="beg sth from sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Chewing betel nuts can be bad for your health."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Tofu is a very healthy source of protein."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The once successful businessman now begs food from strangers."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===356&&i.label==="a persistent vegetative state")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===357&&i.label==="be wary of...")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===357&&i.label==="blow one's nose")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===359&&i.label==="connect A to B")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===40)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});

it('preserves literal empty continuation markers and original stars',()=>{
 expect(source.related.find(r=>r.word==="vegetative"&&r.sourcePage===356)).toMatchObject({printedLabel:""});
 expect(vocabulary.find(r=>r.displayWord==="vegetative"&&r.sourcePage===356)).toMatchObject({printedLabel:""});
 expect(source.related.find(r=>r.word==="persistent"&&r.sourcePage===356)).toMatchObject({printedLabel:"*"});
});
