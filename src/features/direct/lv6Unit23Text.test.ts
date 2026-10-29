import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit23.json';
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
const unit=findUnit(23,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["complexion", "distraction", "condense", "dissident", "differentiate", "beverage", "cater", "charitable", "communicative", "concise", "conquest", "cosmetic", "cosmetics", "dismantle", "curfew", "skeptical", "cynical", "dubious", "dusk", "twilight", "detain", "disciplinary", "discreet", "bachelor", "aluminum", "cigar", "odor", "ozone", "fowl", "indifference", "discard", "paradox", "sneaky", "paddle", "revive", "revival", "orient", "oriental", "sorrowful", "zoom", "airway", "trustee", "paperback", "lining", "provincial", "respective"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,46).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:39},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>213+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:222,printedUnit:'Unit 24',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===23)).toMatchObject({count:119,usageCount:32,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(151);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(46).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["dissident", "dismantle", "dictatorial", "caterer", "benevolent", "uncharitable", "conqueror", "crumble", "sceptical", "skeptic", "skepticism", "cynicism", "daybreak", "discretion", "prudent", "indiscreet", "spinster", "odorous", "deodorant", "pungent", "ultraviolet", "fowls", "paradoxical", "inconsistency", "peddle", "renaissance", "impressionist", "oriented", "the Occident", "occidental", "barbarous", "zoom lens", "hardcover", "a keynote speech"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 3 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(34);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(3);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 84 mapped identities in a complete 151-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(151);expect(ids).toHaveLength(84);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(84);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',23,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,46).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U23',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U23',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U23 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U23 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.slice(46).find(i=>i.displayWord==="dictatorial"&&i.sourcePage===213)).toMatchObject({printedLabel:"*",sourcePage:213});
 expect(vocabulary.slice(46).find(i=>i.displayWord==="exile"&&i.sourcePage===213)).toMatchObject({printedLabel:"",sourcePage:213});
 expect(vocabulary.slice(46).find(i=>i.displayWord==="sceptical"&&i.sourcePage===215)).toMatchObject({printedLabel:"=",sourcePage:215});
 expect(vocabulary.slice(46).find(i=>i.displayWord==="doubtful"&&i.sourcePage===216)).toMatchObject({printedLabel:"衍",sourcePage:216});
 expect(vocabulary.slice(46).find(i=>i.displayWord==="fowls"&&i.sourcePage===217)).toMatchObject({printedLabel:"複",sourcePage:217});
 expect(vocabulary.slice(46).find(i=>i.displayWord==="fowl"&&i.sourcePage===217)).toMatchObject({printedLabel:"複",sourcePage:217});
 expect(vocabulary.slice(46).find(i=>i.displayWord==="the Occident"&&i.sourcePage===219)).toMatchObject({printedLabel:"反",sourcePage:219});
 expect(vocabulary.slice(46).find(i=>i.displayWord==="zoom lens"&&i.sourcePage===219)).toMatchObject({printedLabel:"=",sourcePage:219});
 expect(vocabulary.slice(46).find(i=>i.displayWord==="a keynote speech"&&i.sourcePage===221)).toMatchObject({printedLabel:"*",sourcePage:221});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="differentiate A from B = differentiate between A and B = tell A from B = tell between A and B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="dismantle sth = take sth apart = disassemble sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="from dawn to dusk")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="throw away... = get rid of...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="orient A to B = accustom A to B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="the Orient")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an exam-oriented educational system")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Mary didn't wear any cosmetics today"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Mary didn't wear any makeup today"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("every cloud has a silver lining"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===213&&i.label==="distinguish A from B = distinguish between A and B")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===215&&i.label==="swear sb in")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===215&&i.label==="be sworn in")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===218&&i.label==="throw away... = get rid of...")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===218&&i.label==="be up to sth")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===219&&i.label==="a money-oriented society")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===219&&i.label==="an exam-oriented educational system")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===220&&i.label==="zoom out")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===221&&i.label==="cheer (sb) up")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===23)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});
