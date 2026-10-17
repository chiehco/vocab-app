import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit42.json';
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
const unit=findUnit(42,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["strict", "crowd", "wheel", "latest", "delay", "thief", "income", "earn", "nod", "hip", "waist", "lap", "ankle", "eyebrow", "gymnasium", "shame", "sour", "technology", "sheet", "chain", "image", "imagine", "separate", "metal", "steel", "iron", "narrow", "stretch", "vote", "culture", "cultural", "valley", "peak", "expert", "struggle", "entrance", "exit", "absent", "absence", "current"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,40).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:27},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>372+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:381,printedUnit:'Unit 43',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===42)).toMatchObject({count:92,usageCount:57,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(149);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(40).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["strictness", "crowded", "thieves", "earnings", "butt", "work out", "shameless", "technologies", "chain-smoker", "parlor", "self-image", "separated", "narrow-minded", "improperly", "absent-minded"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
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
it('fresh starter resolves all 77 mapped identities in a complete 149-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(149);expect(ids).toHaveLength(77);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(77);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',42,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,40).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U42',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U42',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U42 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U42 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="strictness"&&i.sourcePage===372)).toMatchObject({printedLabel:"衍",sourcePage:372});
 expect(vocabulary.find(i=>i.displayWord==="crowded"&&i.sourcePage===372)).toMatchObject({printedLabel:"衍",sourcePage:372});
 expect(vocabulary.find(i=>i.displayWord==="wheelchair"&&i.sourcePage===372)).toMatchObject({printedLabel:"衍",sourcePage:372});
 expect(vocabulary.find(i=>i.displayWord==="later"&&i.sourcePage===372)).toMatchObject({printedLabel:"衍",sourcePage:372});
 expect(vocabulary.find(i=>i.displayWord==="thieves"&&i.sourcePage===373)).toMatchObject({printedLabel:"複",sourcePage:373});
 expect(vocabulary.find(i=>i.displayWord==="plumber"&&i.sourcePage===373)).toMatchObject({printedLabel:"*",sourcePage:373});
 expect(vocabulary.find(i=>i.displayWord==="outcome"&&i.sourcePage===373)).toMatchObject({printedLabel:"似",sourcePage:373});
 expect(vocabulary.find(i=>i.displayWord==="earnings"&&i.sourcePage===373)).toMatchObject({printedLabel:"衍",sourcePage:373});
 expect(vocabulary.find(i=>i.displayWord==="work out"&&i.sourcePage===374)).toMatchObject({printedLabel:"*",sourcePage:374});
 expect(vocabulary.find(i=>i.displayWord==="shameless"&&i.sourcePage===374)).toMatchObject({printedLabel:"衍",sourcePage:374});
 expect(vocabulary.find(i=>i.displayWord==="technologies"&&i.sourcePage===374)).toMatchObject({printedLabel:"複",sourcePage:374});
 expect(vocabulary.find(i=>i.displayWord==="chain-smoker"&&i.sourcePage===375)).toMatchObject({printedLabel:"衍",sourcePage:375});
 expect(vocabulary.find(i=>i.displayWord==="link"&&i.sourcePage===375)).toMatchObject({printedLabel:"延伸",sourcePage:375});
 expect(vocabulary.find(i=>i.displayWord==="self-image"&&i.sourcePage===375)).toMatchObject({printedLabel:"衍",sourcePage:375});
 expect(vocabulary.find(i=>i.displayWord==="separated"&&i.sourcePage===376)).toMatchObject({printedLabel:"衍",sourcePage:376});
 expect(vocabulary.find(i=>i.displayWord==="mental"&&i.sourcePage===376)).toMatchObject({printedLabel:"似",sourcePage:376});
 expect(vocabulary.find(i=>i.displayWord==="narrow-minded"&&i.sourcePage===377)).toMatchObject({printedLabel:"衍",sourcePage:377});
 expect(vocabulary.find(i=>i.displayWord==="adjustment"&&i.sourcePage===377)).toMatchObject({printedLabel:"*",sourcePage:377});
 expect(vocabulary.find(i=>i.displayWord==="expertise"&&i.sourcePage===378)).toMatchObject({printedLabel:"衍",sourcePage:378});
 expect(vocabulary.find(i=>i.displayWord==="improperly"&&i.sourcePage===379)).toMatchObject({printedLabel:"*",sourcePage:379});
 expect(vocabulary.find(i=>i.displayWord==="absent-minded"&&i.sourcePage===379)).toMatchObject({printedLabel:"衍",sourcePage:379});
 expect(vocabulary.find(i=>i.displayWord==="presence"&&i.sourcePage===379)).toMatchObject({printedLabel:"反",sourcePage:379});
 expect(vocabulary.find(i=>i.displayWord==="attendance"&&i.sourcePage===379)).toMatchObject({printedLabel:"反",sourcePage:379});
 expect(vocabulary.find(i=>i.displayWord==="retreat"&&i.sourcePage===380)).toMatchObject({printedLabel:"*",sourcePage:380});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="behind the wheel = driving")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="four-wheel drive")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a delay in + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="on sb's lap")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="It is a shame that... = It is a pity that... = It is too bad that...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a sheet of paper = a piece of paper")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="separate A from B = A be / got separated from B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="steel oneself for / against sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="narrow sth down (to...)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have a narrow escape (from...)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have / take a vote on...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="reach sth's peak")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be expert on / in / at + N/V-ing = be experienced in + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an emergency exit")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="in the absence of... = without...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an ocean current")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Strike while the iron is hot."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Learning things is like sailing a boat against the current; it either advances or retreats."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Knowing where the emergency exits are in a building can save your life."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===379&&i.label==="in a fury")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===42)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
