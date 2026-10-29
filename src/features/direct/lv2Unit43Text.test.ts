import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit43.json';
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
const unit=findUnit(43,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["storm", "thunder", "typhoon", "fog", "temperature", "bar", "chopstick", "coal", "victory", "memory", "forgive", "universe", "university", "college", "official", "formal", "promise", "appearance", "disappear", "indeed", "admit", "courage", "encourage", "encouragement", "ordinary", "measure", "measurement", "length", "width", "depth", "upper", "lower", "rapid", "positive", "negative", "disagree", "disagreement", "dial", "instruction", "wire"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,40).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:25},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>381+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:390,printedUnit:'Unit 44',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===43)).toMatchObject({count:103,usageCount:52,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(155);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(40).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["thunderstorm", "thunderbolt", "cyclone", "victories", "victorious", "memories", "forgiving", "forgiveness", "universities", "convincing", "show up", "disappearance", "truly", "admittance", "cash register", "speedy", "unsure", "wiring", "wired"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
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
it('fresh starter resolves all 83 mapped identities in a complete 155-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(155);expect(ids).toHaveLength(83);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(83);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',43,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,40).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U43',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U43',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U43 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U43 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="thunderbolt"&&i.sourcePage===381)).toMatchObject({printedLabel:"衍",sourcePage:381});
 expect(vocabulary.find(i=>i.displayWord==="lightning"&&i.sourcePage===381)).toMatchObject({printedLabel:"延伸",sourcePage:381});
 expect(vocabulary.find(i=>i.displayWord==="cyclone"&&i.sourcePage===381)).toMatchObject({printedLabel:"延伸",sourcePage:381});
 expect(vocabulary.find(i=>i.displayWord==="gasoline"&&i.sourcePage===382)).toMatchObject({printedLabel:"延伸",sourcePage:382});
 expect(vocabulary.find(i=>i.displayWord==="petrol"&&i.sourcePage===382)).toMatchObject({printedLabel:"=",sourcePage:382});
 expect(vocabulary.find(i=>i.displayWord==="victories"&&i.sourcePage===382)).toMatchObject({printedLabel:"複",sourcePage:382});
 expect(vocabulary.find(i=>i.displayWord==="defeat"&&i.sourcePage===382)).toMatchObject({printedLabel:"反",sourcePage:382});
 expect(vocabulary.find(i=>i.displayWord==="memorial"&&i.sourcePage===383)).toMatchObject({printedLabel:"衍",sourcePage:383});
 expect(vocabulary.find(i=>i.displayWord==="alien"&&i.sourcePage===383)).toMatchObject({printedLabel:"*",sourcePage:383});
 expect(vocabulary.find(i=>i.displayWord==="universities"&&i.sourcePage===383)).toMatchObject({printedLabel:"複",sourcePage:383});
 expect(vocabulary.find(i=>i.displayWord==="show up"&&i.sourcePage===384)).toMatchObject({printedLabel:"=",sourcePage:384});
 expect(vocabulary.find(i=>i.displayWord==="vanish"&&i.sourcePage===384)).toMatchObject({printedLabel:"似",sourcePage:384});
 expect(vocabulary.find(i=>i.displayWord==="admittance"&&i.sourcePage===385)).toMatchObject({printedLabel:"衍",sourcePage:385});
 expect(vocabulary.find(i=>i.displayWord==="cash register"&&i.sourcePage===385)).toMatchObject({printedLabel:"*",sourcePage:385});
 expect(vocabulary.find(i=>i.displayWord==="discouragement"&&i.sourcePage===385)).toMatchObject({printedLabel:"反",sourcePage:385});
 expect(vocabulary.find(i=>i.displayWord==="extraordinary"&&i.sourcePage===385)).toMatchObject({printedLabel:"反",sourcePage:385});
 expect(vocabulary.find(i=>i.displayWord==="lengthen"&&i.sourcePage===386)).toMatchObject({printedLabel:"衍",sourcePage:386});
 expect(vocabulary.find(i=>i.displayWord==="deepen"&&i.sourcePage===387)).toMatchObject({printedLabel:"衍",sourcePage:387});
 expect(vocabulary.find(i=>i.displayWord==="unsure"&&i.sourcePage===388)).toMatchObject({printedLabel:"反",sourcePage:388});
 expect(vocabulary.find(i=>i.displayWord==="consent"&&i.sourcePage===388)).toMatchObject({printedLabel:"反",sourcePage:388});
 expect(vocabulary.find(i=>i.displayWord==="wired"&&i.sourcePage===389)).toMatchObject({printedLabel:"衍",sourcePage:389});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="at a(n) + adj. + temperature")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="bar sb's way / path")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="declare (a) victory")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="forgive, forgave, forgiven")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the university of one's choice")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make an appearance")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="admit sb to / into... = sb be admitted to / into...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="measure up to sb's expectations = live up to sb's expectations = meet sb's expectations")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an upper arm")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be out of one's depth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be in disagreement about / over... = have a disagreement about / over...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="follow (sb's) instructions")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("A friend in need is a friend indeed."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Derek tested positive for COVID-19."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Read the instructions carefully before operating the machine."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===381&&i.label==="以上 3 字其實皆指「颱風」，只是在不同的地區有不同的名稱。")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===381&&i.label==="give sb a shot")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===43)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});
