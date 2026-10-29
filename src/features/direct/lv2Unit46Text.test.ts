import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit46.json';
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
const unit=findUnit(46,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["instant", "instance", "sudden", "furniture", "curtain", "mat", "following", "praise", "cancel", "asleep", "sleepy", "dot", "alarm", "childish", "mature", "improve", "improvement", "progress", "doubt", "ease", "aid", "review", "exist", "existence", "upon", "serve", "servant", "master", "rocky", "population", "settle", "settlement", "whatever", "whoever", "exact", "mass", "avoid", "select", "selection", "propose"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,40).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:26},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>409+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:418,printedUnit:'Unit 47',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===46)).toMatchObject({count:100,usageCount:60,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(160);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(40).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["suddenly", "drapes", "doormat", "cancellation", "childlike", "immature", "improved", "doubtless", "easily", "teamwork", "aide", "reviewer", "guru", "masses", "avoidable", "avoidance", "proposition"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 17 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(17);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(17);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 83 mapped identities in a complete 160-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(160);expect(ids).toHaveLength(83);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(83);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',46,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,40).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U46',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U46',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U46 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U46 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="suddenly"&&i.sourcePage===409&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:409});
 expect(vocabulary.find(i=>i.displayWord==="abrupt"&&i.sourcePage===409&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:409});
 expect(vocabulary.find(i=>i.displayWord==="drapes"&&i.sourcePage===410&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:410});
 expect(vocabulary.find(i=>i.displayWord==="previous"&&i.sourcePage===410&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:410});
 expect(vocabulary.find(i=>i.displayWord==="cancellation"&&i.sourcePage===410&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:410});
 expect(vocabulary.find(i=>i.displayWord==="immature"&&i.sourcePage===411&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:411});
 expect(vocabulary.find(i=>i.displayWord==="easily"&&i.sourcePage===413&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:413});
 expect(vocabulary.find(i=>i.displayWord==="teamwork"&&i.sourcePage===413&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:413});
 expect(vocabulary.find(i=>i.displayWord==="on"&&i.sourcePage===414&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:414});
 expect(vocabulary.find(i=>i.displayWord==="masterpiece"&&i.sourcePage===415&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:415});
 expect(vocabulary.find(i=>i.displayWord==="guru"&&i.sourcePage===415&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:415});
 expect(vocabulary.find(i=>i.displayWord==="predict"&&i.sourcePage===415&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:415});
 expect(vocabulary.find(i=>i.displayWord==="global"&&i.sourcePage===415)).toMatchObject({printedLabel:"",sourcePage:415});
 expect(vocabulary.find(i=>i.displayWord==="economy"&&i.sourcePage===415)).toMatchObject({printedLabel:"",sourcePage:415});
 expect(vocabulary.find(i=>i.displayWord==="masses"&&i.sourcePage===416&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:416});
 expect(vocabulary.find(i=>i.displayWord==="selective"&&i.sourcePage===417&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:417});
 expect(vocabulary.find(i=>i.displayWord==="proposition"&&i.sourcePage===417&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:417});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="on the dot")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an alarm (clock)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="reach maturity")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make progress")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="without (a) doubt")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="at ease")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="ill at ease")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="with ease")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="come into existence = come into being")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a civil servant")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a master's degree")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have a population of + 數字")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="settle down")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="to be exact")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a mass of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="avoid + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="select A as B = A be selected as B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="propose that + S + (should) + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="propose to sb")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Taiwan has a population of about 23 million."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("We hope there will be a peaceful settlement of the Middle East conflict."))).toBe(false);
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===46)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});

it('preserves literal empty continuation markers and original stars',()=>{
 expect(source.related.find(r=>r.word==="global"&&r.sourcePage===415)).toMatchObject({printedLabel:""});
 expect(vocabulary.find(r=>r.displayWord==="global"&&r.sourcePage===415)).toMatchObject({printedLabel:""});
 expect(source.related.find(r=>r.word==="economy"&&r.sourcePage===415)).toMatchObject({printedLabel:""});
 expect(vocabulary.find(r=>r.displayWord==="economy"&&r.sourcePage===415)).toMatchObject({printedLabel:""});
 expect(source.related.find(r=>r.word==="predict"&&r.sourcePage===415)).toMatchObject({printedLabel:"*"});
});
