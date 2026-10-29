import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit45.json';
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
const unit=findUnit(45,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and the next unit boundary',()=>{
 const heads=["debate", "argue", "argument", "title", "mate", "classmate", "friendship", "shell", "puzzle", "pose", "position", "sidewalk", "subway", "whisper", "china", "rat", "evil", "found", "nearby", "nearly", "ancient", "insist", "tradition", "traditional", "historical", "regular", "broad", "belief", "reply", "responsible", "object", "handle", "crisis", "pound", "leadership", "solve", "solution", "impressive", "require", "requirement"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,40).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:29},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>400+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:409,printedUnit:'Unit 46',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===45)).toMatchObject({count:102,usageCount:53,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(155);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(40).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["debatable", "seashell", "puzzled", "puzzling", "puzzlement", "poser", "overpass", "MRT", "whispering", "China", "ceramics", "malicious", "nearness", "clockwork", "irregular", "billionaire", "Santa (Claus)", "replies", "UFO", "crises", "required"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 21 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(21);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(21);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 80 mapped identities in a complete 155-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(155);expect(ids).toHaveLength(80);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(80);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',45,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,40).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U45',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U45',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U45 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U45 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="argument"&&i.sourcePage===400&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:400});
 expect(vocabulary.find(i=>i.displayWord==="abortion"&&i.sourcePage===400&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:400});
 expect(vocabulary.find(i=>i.displayWord==="entitle"&&i.sourcePage===400&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:400});
 expect(vocabulary.find(i=>i.displayWord==="puzzlement"&&i.sourcePage===401&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:401});
 expect(vocabulary.find(i=>i.displayWord==="poser"&&i.sourcePage===401&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:401});
 expect(vocabulary.find(i=>i.displayWord==="MRT"&&i.sourcePage===402&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:402});
 expect(vocabulary.find(i=>i.displayWord==="China"&&i.sourcePage===403&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:403});
 expect(vocabulary.find(i=>i.displayWord==="ceramics"&&i.sourcePage===403&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:403});
 expect(vocabulary.find(i=>i.displayWord==="find"&&i.sourcePage===403&&!!i.printedLabel)).toMatchObject({printedLabel:"比",sourcePage:403});
 expect(vocabulary.find(i=>i.displayWord==="nearness"&&i.sourcePage===403&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:403});
 expect(vocabulary.find(i=>i.displayWord==="clockwork"&&i.sourcePage===404&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:404});
 expect(vocabulary.find(i=>i.displayWord==="historic"&&i.sourcePage===404&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:404});
 expect(vocabulary.find(i=>i.displayWord==="irregular"&&i.sourcePage===405&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:405});
 expect(vocabulary.find(i=>i.displayWord==="billionaire"&&i.sourcePage===405&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:405});
 expect(vocabulary.find(i=>i.displayWord==="Santa (Claus)"&&i.sourcePage===405&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:405});
 expect(vocabulary.find(i=>i.displayWord==="replies"&&i.sourcePage===405&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:405});
 expect(vocabulary.find(i=>i.displayWord==="objective"&&i.sourcePage===406&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:406});
 expect(vocabulary.find(i=>i.displayWord==="UFO"&&i.sourcePage===406&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:406});
 expect(vocabulary.find(i=>i.displayWord==="crises"&&i.sourcePage===406&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:406});
 expect(vocabulary.find(i=>i.displayWord==="resolve"&&i.sourcePage===407&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:407});
 expect(vocabulary.find(i=>i.displayWord==="imposing"&&i.sourcePage===407&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:407});
 expect(vocabulary.find(i=>i.displayWord==="required"&&i.sourcePage===408&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:408});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="have an argument with sb about / over sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="bring sb out of sb's shell")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="pose for a photo / picture")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be in no position to V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="whisper in / into sb's ear")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="like a bull in a china shop")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="found, founded, founded")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="find, found, found")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="insist that + S + (should) + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="object to + N/V-ing = oppose + N/V-ing = be opposed to + N/V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="handle a crisis = deal with a crisis = solve / resolve a crisis")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="solve a problem = resolve a problem")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="require that + S + (should) + V")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="meet a requirement")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The love of money is the root of all evil."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("An ounce of prevention is worth a pound of cure."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Whenever I have a sore throat, my mom asks me to clean my throat with a salt solution."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===401&&i.label==="hold... dear")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===403&&i.label==="mouse 複數為 mice")).toMatchObject({printedLabel:"似"});
 expect(source.usage.find(i=>i.sourcePage===403&&i.label==="find, found, found")).toMatchObject({printedLabel:"比"});
 expect(source.usage.find(i=>i.sourcePage===407&&i.label==="pound sterling 之複數為 pounds sterling；lb 之複數為 lb / lbs。")).toMatchObject({printedLabel:"用法"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===45)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
});
