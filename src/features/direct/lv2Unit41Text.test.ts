import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit41.json';
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
const unit=findUnit(41,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["silver", "gold", "golden", "wooden", "silent", "silence", "plain", "average", "general", "folk", "host", "guest", "bother", "royal", "chemical", "pillow", "pajamas", "primary", "secondary", "major", "minor", "minority", "divide", "division", "discover", "discovery", "curious", "railroad", "platform", "display", "male", "female", "sex", "slip", "slipper", "smooth", "bend", "rare", "rude", "naughty", "effort"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:20},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>363+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:372,printedUnit:'Unit 42',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===41)).toMatchObject({count:89,usageCount:62,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(151);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["woody", "prairie", "bothersome", "pillowcase", "higher education", "minorities", "discoveries", "unusual", "rostrum", "manly", "womanly", "bendy", "rareness", "unusual", "effortless"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 15 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(15);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(15);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 72 mapped identities in a complete 151-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(151);expect(ids).toHaveLength(72);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(72);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',41,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U41',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U41',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U41 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U41 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="woody"&&i.sourcePage===363)).toMatchObject({printedLabel:"衍",sourcePage:363});
 expect(vocabulary.find(i=>i.displayWord==="quiet"&&i.sourcePage===364)).toMatchObject({printedLabel:"似",sourcePage:364});
 expect(vocabulary.find(i=>i.displayWord==="prairie"&&i.sourcePage===364)).toMatchObject({printedLabel:"衍",sourcePage:364});
 expect(vocabulary.find(i=>i.displayWord==="hostess"&&i.sourcePage===365)).toMatchObject({printedLabel:"反",sourcePage:365});
 expect(vocabulary.find(i=>i.displayWord==="bothersome"&&i.sourcePage===365)).toMatchObject({printedLabel:"衍",sourcePage:365});
 expect(vocabulary.find(i=>i.displayWord==="loyal"&&i.sourcePage===365)).toMatchObject({printedLabel:"似",sourcePage:365});
 expect(vocabulary.find(i=>i.displayWord==="pillowcase"&&i.sourcePage===366)).toMatchObject({printedLabel:"衍",sourcePage:366});
 expect(vocabulary.find(i=>i.displayWord==="higher education"&&i.sourcePage===366)).toMatchObject({printedLabel:"延伸",sourcePage:366});
 expect(vocabulary.find(i=>i.displayWord==="minorities"&&i.sourcePage===367)).toMatchObject({printedLabel:"複",sourcePage:367});
 expect(vocabulary.find(i=>i.displayWord==="department"&&i.sourcePage===367)).toMatchObject({printedLabel:"似",sourcePage:367});
 expect(vocabulary.find(i=>i.displayWord==="invent"&&i.sourcePage===368)).toMatchObject({printedLabel:"延伸",sourcePage:368});
 expect(vocabulary.find(i=>i.displayWord==="discoveries"&&i.sourcePage===368)).toMatchObject({printedLabel:"複",sourcePage:368});
 expect(vocabulary.find(i=>i.displayWord==="rostrum"&&i.sourcePage===368)).toMatchObject({printedLabel:"似",sourcePage:368});
 expect(vocabulary.find(i=>i.displayWord==="exhibit"&&i.sourcePage===368)).toMatchObject({printedLabel:"似",sourcePage:368});
 expect(vocabulary.find(i=>i.displayWord==="offspring"&&i.sourcePage===369)).toMatchObject({printedLabel:"*",sourcePage:369});
 expect(vocabulary.find(i=>i.displayWord==="slippery"&&i.sourcePage===369)).toMatchObject({printedLabel:"衍",sourcePage:369});
 expect(vocabulary.find(i=>i.displayWord==="rough"&&i.sourcePage===370)).toMatchObject({printedLabel:"反",sourcePage:370});
 expect(vocabulary.find(i=>i.displayWord==="general"&&i.sourcePage===370)).toMatchObject({printedLabel:"反",sourcePage:370});
 expect(vocabulary.find(i=>i.displayWord==="unusual"&&i.sourcePage===370)).toMatchObject({printedLabel:"似",sourcePage:370});
 expect(vocabulary.find(i=>i.displayWord==="mischievous"&&i.sourcePage===371)).toMatchObject({printedLabel:"似",sourcePage:371});
 expect(vocabulary.find(i=>i.displayWord==="effortless"&&i.sourcePage===371)).toMatchObject({printedLabel:"衍",sourcePage:371});
 expect(vocabulary.find(i=>i.displayWord==="affect"&&i.sourcePage===371)).toMatchObject({printedLabel:"比",sourcePage:371});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be born with a silver spoon in one's mouth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a golden opportunity")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an average of + 數字")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="in general = generally speaking = by and large = for the most part = on the whole")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="It bothers sb that... = It bothers sb to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a pair of pajamas")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="major in... = choose... as one's major")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a minority of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="find out...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make a discovery")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a railroad station = a railway station = a train station")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a slip of paper")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be bent on + V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="It is rare (for sb/sth) to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make every effort to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("There is no royal road to learning."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The scientists have discovered a cure for the terrible disease."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The president called an urgent meeting in an effort to handle the sudden spread of the disease."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===365&&i.label==="folk 當「人們」之意時，本身即為複數，也可寫成 folks。")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===366&&i.label==="pajamas 含上衣及褲子，故恆用複數。")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===368&&i.label==="find out...")).toMatchObject({printedLabel:"延伸"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===41)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
