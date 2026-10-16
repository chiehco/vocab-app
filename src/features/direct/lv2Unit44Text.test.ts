import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit44.json';
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
const unit=findUnit(44,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["standard", "damage", "article", "essay", "deliver", "delivery", "worth", "willing", "advance", "brief", "cartoon", "comic", "building", "roof", "ceiling", "balcony", "upset", "valuable", "custom", "per", "goal", "aim", "purpose", "target", "focus", "data", "chapter", "unit", "chart", "judge", "judgment", "justice", "law", "legal", "fair", "anywhere", "anytime", "anyway", "alike", "alive"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,40).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:20},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>390+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:400,printedUnit:'Unit 45',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===44)).toMatchObject({count:102,usageCount:59,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(161);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(40).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["damaging", "deliverance", "deliveries", "punctuality", "unwilling", "roofs", "balconies", "unhappy", "valueless", "aimless", "judgmental", "illegal", "betel nut", "fairness"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 14 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(14);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(14);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 87 mapped identities in a complete 161-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(161);expect(ids).toHaveLength(87);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(87);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',44,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,40).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U44',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U44',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U44 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U44 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="damaging"&&i.sourcePage===390&&i.printedLabel!=null)).toMatchObject({printedLabel:"衍",sourcePage:390});
 expect(vocabulary.find(i=>i.displayWord==="benefit"&&i.sourcePage===390&&i.printedLabel!=null)).toMatchObject({printedLabel:"反",sourcePage:390});
 expect(vocabulary.find(i=>i.displayWord==="deliveries"&&i.sourcePage===391&&i.printedLabel!=null)).toMatchObject({printedLabel:"複",sourcePage:391});
 expect(vocabulary.find(i=>i.displayWord==="worthy"&&i.sourcePage===391&&i.printedLabel!=null)).toMatchObject({printedLabel:"衍",sourcePage:391});
 expect(vocabulary.find(i=>i.displayWord==="coupon"&&i.sourcePage===391&&i.printedLabel!=null)).toMatchObject({printedLabel:"*",sourcePage:391});
 expect(vocabulary.find(i=>i.displayWord==="unwilling"&&i.sourcePage===391&&i.printedLabel!=null)).toMatchObject({printedLabel:"反",sourcePage:391});
 expect(vocabulary.find(i=>i.displayWord==="beforehand"&&i.sourcePage===392&&i.printedLabel!=null)).toMatchObject({printedLabel:"=",sourcePage:392});
 expect(vocabulary.find(i=>i.displayWord==="advanced"&&i.sourcePage===392&&i.printedLabel!=null)).toMatchObject({printedLabel:"衍",sourcePage:392});
 expect(vocabulary.find(i=>i.displayWord==="funny"&&i.sourcePage===393&&i.printedLabel!=null)).toMatchObject({printedLabel:"衍",sourcePage:393});
 expect(vocabulary.find(i=>i.displayWord==="roofs"&&i.sourcePage===393&&i.printedLabel!=null)).toMatchObject({printedLabel:"複",sourcePage:393});
 expect(vocabulary.find(i=>i.displayWord==="dome"&&i.sourcePage===393&&i.printedLabel!=null)).toMatchObject({printedLabel:"延伸",sourcePage:393});
 expect(vocabulary.find(i=>i.displayWord==="balconies"&&i.sourcePage===393&&i.printedLabel!=null)).toMatchObject({printedLabel:"複",sourcePage:393});
 expect(vocabulary.find(i=>i.displayWord==="priceless"&&i.sourcePage===394&&i.printedLabel!=null)).toMatchObject({printedLabel:"似",sourcePage:394});
 expect(vocabulary.find(i=>i.displayWord==="valueless"&&i.sourcePage===394&&i.printedLabel!=null)).toMatchObject({printedLabel:"反",sourcePage:394});
 expect(vocabulary.find(i=>i.displayWord==="customary"&&i.sourcePage===394&&i.printedLabel!=null)).toMatchObject({printedLabel:"衍",sourcePage:394});
 expect(vocabulary.find(i=>i.displayWord==="every"&&i.sourcePage===394&&i.printedLabel!=null)).toMatchObject({printedLabel:"似",sourcePage:394});
 expect(vocabulary.find(i=>i.displayWord==="aimless"&&i.sourcePage===395&&i.printedLabel!=null)).toMatchObject({printedLabel:"衍",sourcePage:395});
 expect(vocabulary.find(i=>i.displayWord==="retire"&&i.sourcePage===395&&i.printedLabel!=null)).toMatchObject({printedLabel:"*",sourcePage:395});
 expect(vocabulary.find(i=>i.displayWord==="database"&&i.sourcePage===396&&i.printedLabel!=null)).toMatchObject({printedLabel:"衍",sourcePage:396});
 expect(vocabulary.find(i=>i.displayWord==="article"&&i.sourcePage===396&&i.printedLabel!=null)).toMatchObject({printedLabel:"延伸",sourcePage:396});
 expect(vocabulary.find(i=>i.displayWord==="judgmental"&&i.sourcePage===396&&i.printedLabel!=null)).toMatchObject({printedLabel:"衍",sourcePage:396});
 expect(vocabulary.find(i=>i.displayWord==="lawmaker"&&i.sourcePage===397&&i.printedLabel!=null)).toMatchObject({printedLabel:"衍",sourcePage:397});
 expect(vocabulary.find(i=>i.displayWord==="illegal"&&i.sourcePage===398&&i.printedLabel!=null)).toMatchObject({printedLabel:"反",sourcePage:398});
 expect(vocabulary.find(i=>i.displayWord==="betel nut"&&i.sourcePage===398&&i.printedLabel!=null)).toMatchObject({printedLabel:"*",sourcePage:398});
 expect(vocabulary.find(i=>i.displayWord==="identical"&&i.sourcePage===398&&i.printedLabel!=null)).toMatchObject({printedLabel:"似",sourcePage:398});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an article of clothing / furniture = a piece of clothing / furniture")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="worth one's salt")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="金額's / 時間's + worth of sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a news brief")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="upset 三態同形")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="for the purpose of + V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="to no purpose = in vain = to / of no avail")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="focus 複數：focuses / foci")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a bar / pie / line / flow chart")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="do sb/sth justice = do justice to sb/sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="obey / observe the law")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="by fair means or foul")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="A and B alike = both A and B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be alive to sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Do not judge a book by its cover."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Is it legal for children to buy betel nuts in Taiwan?"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("We have not made great advances in the fight against AIDS."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===391&&i.label==="若金額為阿拉伯數字，則不加『’』。")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===393&&i.label==="upset 三態同形")).toMatchObject({printedLabel:"三"});
 expect(source.usage.find(i=>i.sourcePage===395&&i.label==="focus 複數：focuses / foci")).toMatchObject({printedLabel:"複"});
 expect(source.usage.find(i=>i.sourcePage===396&&i.label==="data 的單數形為 datum")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===396&&i.label==="data 常被視為不可數名詞，其後動詞用單數形，但於正式寫作中常用複數形動詞。")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===44)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
