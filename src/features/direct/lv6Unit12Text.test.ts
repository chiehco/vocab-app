import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit12.json';
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
const unit=findUnit(12,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["breakdown", "breakup", "outbreak", "accumulate", "accumulation", "cumulative", "injustice", "disastrous", "devastating", "peninsula", "stabilize", "forsake", "slum", "ghetto", "subscribe", "subscription", "serene", "stature", "parliament", "allege", "allegation", "abstraction", "surpass", "unanimous", "complement", "fortify", "firecracker", "mourn", "mournful", "fertility", "fertilizer", "handicraft", "probe", "publicize", "shaver", "stun", "stunning", "mainland", "majesty", "majestic", "monarch", "proverb", "cement", "recreational", "bilateral"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:32},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>111+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:120,printedUnit:'Unit 13',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===12)).toMatchObject({count:124,usageCount:38,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(162);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["devastating", "ghetto", "allegation", "stunning", "unfairness", "catastrophic", "devastating", "devastate", "forsook", "forsaken", "ghettos", "ghettoes", "serenity", "tranquil", "alleged", "allegedly", "mistreat", "outdo", "unanimously", "complementary", "fortified", "d\u00e9j\u00e0 vu", "fertilize", "infertility", "craftsman", "craftswoman", "electric shaver", "electric razor", "rechargeable", "stunned", "astound", "astonishing", "majesties", "highness", "monarchy", "saying", "adage", "maxim", "lateral", "unilateral", "multilateral"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 9 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(41);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(9);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 80 mapped identities in a complete 162-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(162);expect(ids).toHaveLength(80);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(80);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',12,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,45).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U12',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U12',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U12 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U12 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="forsook"&&i.sourcePage===113)).toMatchObject({printedLabel:"三",sourcePage:113});
 expect(vocabulary.find(i=>i.displayWord==="forsaken"&&i.sourcePage===113)).toMatchObject({printedLabel:"三",sourcePage:113});
 expect(vocabulary.find(i=>i.displayWord==="ghettoes"&&i.sourcePage===113)).toMatchObject({printedLabel:"複",sourcePage:113});
 expect(vocabulary.find(i=>i.displayWord==="d\u00e9j\u00e0 vu"&&i.sourcePage===116)).toMatchObject({printedLabel:"*",sourcePage:116});
 expect(vocabulary.find(i=>i.displayWord==="rechargeable"&&i.sourcePage===117)).toMatchObject({printedLabel:"*",sourcePage:117});
 expect(vocabulary.find(i=>i.displayWord==="majesties"&&i.sourcePage===117)).toMatchObject({printedLabel:"複",sourcePage:117});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="pile up... = amass... = build up...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take out a subscription to sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be unanimous in + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="fortify oneself (against A) with B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="probe into... = look into...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="mainland China = the Chinese mainland")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="Your / His / Her Majesty")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("To do Peter justice, we must admit"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The war devastated much of the old part of the city"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("better safe than sorry"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===111&&i.label==="be better off + V-ing")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===112&&i.label==="take a heavy toll on...")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===112&&i.label==="do... justice")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===112&&i.label==="deal a blow to...")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===115&&i.label==="be elected (as) chairman / mayor...")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===115&&i.label==="set off fireworks")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===116&&i.label==="grieve over / for sth")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===118&&i.label==="Your / His / Her Highness")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===118&&i.label==="stand in awe")).toMatchObject({printedLabel:""});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===12)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1,2,4,5,6,7,8,9,10]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});

it("keeps native checked readable source batch 34-u12-comparisons",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V053")).toMatchObject({targetMeaningZh:"島嶼（四面環海）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V053")).toMatchObject({chapterMeaningsZh:"島嶼（四面環海）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V053")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V067")).toMatchObject({targetMeaningZh:"代表大會；（美國）國會（字首大寫）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V067")).toMatchObject({chapterMeaningsZh:"代表大會；（美國）國會（字首大寫）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V067")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V096")).toMatchObject({targetMeaningZh:"（常指非電動的）剃刀，刮鬍刀"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V096")).toMatchObject({chapterMeaningsZh:"（常指非電動的）剃刀，刮鬍刀"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V096")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V103")).toMatchObject({targetMeaningZh:"島嶼"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V103")).toMatchObject({chapterMeaningsZh:"島嶼"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U12-V103")).toMatchObject({meaningSource:"textbook_transcription"});
});
