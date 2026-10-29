import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit48.json';
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
const unit=findUnit(48,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["state", "statement", "chief", "appreciate", "cycle", "downstairs", "upstairs", "membership", "tone", "motion", "balance", "affect", "force", "snail", "ladybug", "click", "religion", "heaven", "soul", "priest", "pray", "prayer", "saw", "policy", "bathe", "tax", "account", "password", "billion", "arrow", "liberal", "freedom", "sort", "clap", "court", "trial", "maintain", "indicate", "internal", "lay"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,40).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:30},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>427+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:436,printedUnit:'Unit 49',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===48)).toMatchObject({count:86,usageCount:66,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(152);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(40).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["appreciative", "depreciate", "Euro", "stairs", "balanced", "imbalance", "penniless", "forceful", "vengeance", "pastor", "policies", "billionaire"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 12 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(12);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(12);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 74 mapped identities in a complete 152-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(152);expect(ids).toHaveLength(74);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(74);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',48,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,40).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U48',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U48',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U48 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U48 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="statesman"&&i.sourcePage===427&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:427});
 expect(vocabulary.find(i=>i.displayWord==="appreciative"&&i.sourcePage===427&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:427});
 expect(vocabulary.find(i=>i.displayWord==="depreciate"&&i.sourcePage===428&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:428});
 expect(vocabulary.find(i=>i.displayWord==="Euro"&&i.sourcePage===428&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:428});
 expect(vocabulary.find(i=>i.displayWord==="penniless"&&i.sourcePage===429&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:429});
 expect(vocabulary.find(i=>i.displayWord==="effect"&&i.sourcePage===429&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:429});
 expect(vocabulary.find(i=>i.displayWord==="nail"&&i.sourcePage===430&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:430});
 expect(vocabulary.find(i=>i.displayWord==="salute"&&i.sourcePage===430&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:430});
 expect(vocabulary.find(i=>i.displayWord==="paradise"&&i.sourcePage===431&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:431});
 expect(vocabulary.find(i=>i.displayWord==="convict"&&i.sourcePage===431&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:431});
 expect(vocabulary.find(i=>i.displayWord==="policies"&&i.sourcePage===432&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:432});
 expect(vocabulary.find(i=>i.displayWord==="accountable"&&i.sourcePage===433&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:433});
 expect(vocabulary.find(i=>i.displayWord==="conservative"&&i.sourcePage===433&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:433});
 expect(vocabulary.find(i=>i.displayWord==="applaud"&&i.sourcePage===434&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:434});
 expect(vocabulary.find(i=>i.displayWord==="external"&&i.sourcePage===435&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:435});
 expect(vocabulary.find(i=>i.displayWord==="corpse"&&i.sourcePage===435&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:435});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="make a statement (to sb)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an editor in chief = an editor-in-chief")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a commander in chief = a commander-in-chief")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="appreciate + N/V-ing = be thankful for sth = be grateful for sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a membership fee")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="strike a balance between A and B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="at a snail's pace")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the click of a mouse")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="not a soul in sight")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="pray to God for sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="saw, sawed, sawn / sawed")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="see, saw, seen")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an import tax")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an export tax")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take... into account = take... into consideration")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="billions of + 複數可數名詞")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="freedom of the press")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="clap (one's hand)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="by / through trial and error")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="lay, laid, laid；現在分詞為 laying")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Honesty is the best policy."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Heaven's vengeance is slow but sure."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Without freedom, I would rather die."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("This disease mainly affects children under 3."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===431&&i.label==="heaven 此字前面不加 the。")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===432&&i.label==="see, saw, seen")).toMatchObject({printedLabel:"比"});
 expect(source.usage.find(i=>i.sourcePage===435&&i.label==="lie, lied, lied；現在分詞為 lying（說謊）")).toMatchObject({printedLabel:"比"});
 expect(source.usage.find(i=>i.sourcePage===435&&i.label==="lie, lay, lain；現在分詞為 lying（躺）")).toMatchObject({printedLabel:"比"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===48)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});

it('preserves literal empty continuation markers and original stars',()=>{
 expect(source.related.find(r=>r.word==="confess"&&r.sourcePage===431)).toMatchObject({printedLabel:""});
 expect(vocabulary.find(r=>r.displayWord==="confess"&&r.sourcePage===431)).toMatchObject({printedLabel:""});
 expect(source.related.find(r=>r.word==="sin"&&r.sourcePage===431)).toMatchObject({printedLabel:""});
 expect(vocabulary.find(r=>r.displayWord==="sin"&&r.sourcePage===431)).toMatchObject({printedLabel:""});
 expect(source.related.find(r=>r.word==="convict"&&r.sourcePage===431)).toMatchObject({printedLabel:"*"});
});
