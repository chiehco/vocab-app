import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit49.json';
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
const unit=findUnit(49,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["track", "path", "lane", "nation", "domestic", "appetite", "grain", "instrument", "fault", "trap", "altogether", "flat", "dull", "hop", "birth", "function", "cage", "capital", "port", "coast", "shore", "needle", "swallow", "being", "gram", "kilogram", "mile", "meter", "centimeter", "terrorist", "terrorism", "available", "nor", "participate", "behave", "punish", "punishment", "fellow", "symbol", "greet"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,40).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:28},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>436+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:446,printedUnit:'Unit 50',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===49)).toMatchObject({count:93,usageCount:62,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(155);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(40).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["domesticate", "appetizer", "mousetrap", "totally", "completely", "caged", "capitalize", "onshore", "availability", "Christianity"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 10 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(10);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(10);
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
 const words=siegeUnitWords('LV2',49,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,40).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U49',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U49',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U49 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U49 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="nationalism"&&i.sourcePage===437&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:437});
 expect(vocabulary.find(i=>i.displayWord==="domesticate"&&i.sourcePage===437&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:437});
 expect(vocabulary.find(i=>i.displayWord==="foreign"&&i.sourcePage===437&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:437});
 expect(vocabulary.find(i=>i.displayWord==="chore"&&i.sourcePage===437&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:437});
 expect(vocabulary.find(i=>i.displayWord==="completely"&&i.sourcePage===438&&!!i.printedLabel)).toMatchObject({printedLabel:"=",sourcePage:438});
 expect(vocabulary.find(i=>i.displayWord==="spring"&&i.sourcePage===439&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:439});
 expect(vocabulary.find(i=>i.displayWord==="capitalism"&&i.sourcePage===440&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:440});
 expect(vocabulary.find(i=>i.displayWord==="onshore"&&i.sourcePage===441&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:441});
 expect(vocabulary.find(i=>i.displayWord==="pin"&&i.sourcePage===441&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:441});
 expect(vocabulary.find(i=>i.displayWord==="milestone"&&i.sourcePage===442&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:442});
 expect(vocabulary.find(i=>i.displayWord==="terrify"&&i.sourcePage===443&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:443});
 expect(vocabulary.find(i=>i.displayWord==="or"&&i.sourcePage===443&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:443});
 expect(vocabulary.find(i=>i.displayWord==="participant"&&i.sourcePage===444&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:444});
 expect(vocabulary.find(i=>i.displayWord==="Christianity"&&i.sourcePage===444&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:444});
 expect(vocabulary.find(i=>i.displayWord==="greeting"&&i.sourcePage===445&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:445});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be on the right track")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a path to success / freedom")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the United Nations")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have an appetite for sth = have a liking for sth = have a passion for sth = enjoy sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="take sth with a grain of salt")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be at fault = be wrong")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="trap, trapped, trapped")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="fall into the trap of + V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="American / Canadian / French /... by birth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="capital punishment")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a port city = a harbor city")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="off the coast")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="off shore")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a needle and thread")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a bitter pill to swallow")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="come into being = come into existence")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a human (being)")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="2 kilograms = 2 kilos = 2 kg")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a water / an electricity meter")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="neither A nor B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="receive (a) punishment for + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be greeted with...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("All work and no play makes Jack a dull boy."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("One swallow doesn't make a summer."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("One thousand grams equals one kilogram."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("I punished my daughter for smoking."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===442&&i.label==="2 kilograms = 2 kilos = 2 kg")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===442&&i.label==="10 meters = 10 m")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===442&&i.label==="10 centimeters = 10 cm")).toMatchObject({printedLabel:"用法"});
 expect(source.usage.find(i=>i.sourcePage===443&&i.label==="以 neither A nor B 連接主詞時，動詞按最接近的主詞作變化。")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===49)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});

it('preserves literal empty continuation markers and original stars',()=>{
 expect(source.related.find(r=>r.word==="evolve"&&r.sourcePage===442)).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(r=>r.label==="evolve from..."&&r.sourcePage===442)).toMatchObject({printedLabel:""});
 expect(unit.items.find(i=>i.kind==="grammar"&&i.pattern==="evolve from...")).not.toHaveProperty("printedLabel");
 expect(source.usage.find(r=>r.label==="be second to none = be the best"&&r.sourcePage===442)).toMatchObject({printedLabel:"*"});
});
