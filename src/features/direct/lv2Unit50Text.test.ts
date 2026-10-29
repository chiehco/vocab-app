import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV2Unit50.json';
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
const unit=findUnit(50,'LV2')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["melody", "burden", "gradual", "classic", "classical", "beard", "link", "connection", "relate", "joint", "tube", "burst", "forth", "gun", "crime", "prison", "prisoner", "switch", "advice", "lid", "congratulations", "aloud", "plus", "extra", "humble", "expense", "angle", "branch", "brand", "principal", "principle", "ignore", "organ", "liver", "cell", "lens", "keeper", "shopkeeper", "stream", "flow"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,40).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:27},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>446+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:455,printedUnit:'Unit 50',pageType:'content'});
 expect(source.photos.some(p=>p.pageType==='boundary')).toBe(false);
 expect(source.endEvidence).toMatchObject({kind:'observed_unit_end',sourcePage:455,lastHeadword:"flow",followingUnitVerified:false});
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===50)).toMatchObject({count:100,usageCount:60,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(160);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(40).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["melodious", "hyperlink", "obesity", "out loud", "humbleness", "headteacher", "headmaster", "hepatitis", "lenses", "streamline", "livestream"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 11 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(11);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(11);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 89 mapped identities in a complete 160-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(160);expect(ids).toHaveLength(89);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(89);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV2',50,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,40).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U50',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U50',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U50 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U50 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="melodious"&&i.sourcePage===446&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:446});
 expect(vocabulary.find(i=>i.displayWord==="steep"&&i.sourcePage===446&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:446});
 expect(vocabulary.find(i=>i.displayWord==="typical"&&i.sourcePage===446&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:446});
 expect(vocabulary.find(i=>i.displayWord==="mustache"&&i.sourcePage===447&&!!i.printedLabel)).toMatchObject({printedLabel:"比",sourcePage:447});
 expect(vocabulary.find(i=>i.displayWord==="hyperlink"&&i.sourcePage===447&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:447});
 expect(vocabulary.find(i=>i.displayWord==="obesity"&&i.sourcePage===447&&!!i.printedLabel)).toMatchObject({printedLabel:"*",sourcePage:447});
 expect(vocabulary.find(i=>i.displayWord==="relation"&&i.sourcePage===448&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:448});
 expect(vocabulary.find(i=>i.displayWord==="individual"&&i.sourcePage===448&&!!i.printedLabel)).toMatchObject({printedLabel:"反",sourcePage:448});
 expect(vocabulary.find(i=>i.displayWord==="criminal"&&i.sourcePage===449&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:449});
 expect(vocabulary.find(i=>i.displayWord==="adviser"&&i.sourcePage===450&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:450});
 expect(vocabulary.find(i=>i.displayWord==="recommendation"&&i.sourcePage===450&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:450});
 expect(vocabulary.find(i=>i.displayWord==="out loud"&&i.sourcePage===451&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:451});
 expect(vocabulary.find(i=>i.displayWord==="surplus"&&i.sourcePage===452&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:452});
 expect(vocabulary.find(i=>i.displayWord==="angel"&&i.sourcePage===452&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:452});
 expect(vocabulary.find(i=>i.displayWord==="headteacher"&&i.sourcePage===453&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:453});
 expect(vocabulary.find(i=>i.displayWord==="hepatitis"&&i.sourcePage===454&&!!i.printedLabel)).toMatchObject({printedLabel:"延伸",sourcePage:454});
 expect(vocabulary.find(i=>i.displayWord==="lenses"&&i.sourcePage===454&&!!i.printedLabel)).toMatchObject({printedLabel:"複",sourcePage:454});
 expect(vocabulary.find(i=>i.displayWord==="livestream"&&i.sourcePage===454&&!!i.printedLabel)).toMatchObject({printedLabel:"衍",sourcePage:454});
 expect(vocabulary.find(i=>i.displayWord==="brook"&&i.sourcePage===455&&!!i.printedLabel)).toMatchObject({printedLabel:"似",sourcePage:455});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="shoulder / bear / carry the burden of + V-ing")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="wear / have a beard")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="shave (off) a beard")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="link A to / with B = A be linked to / with B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="relate A to B = A is related to B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a joint venture")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="watch the tube = watch TV")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="burst out crying / laughing = burst into tears / laughter")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="and so forth = and so on = and the like = etc")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="aim one's gun at...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="switch A for B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a piece of advice")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="give A B's congratulations")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an extra + 數字 = an additional + 數字")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="at the expense of sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="from a different angle / perspective")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a man of principle")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="an organ donor")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a pair of contact lenses")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a lighthouse keeper")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="stream down...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Researchers say lung cancer is linked to smoking."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The life span of skin cells is quite short\u2014about two to three weeks."))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The politician thought hiring more police officers could help prevent crime in our city."))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===451&&i.label==="2 − 1 = 1；Two minus one equals one.")).toMatchObject({printedLabel:"延伸"});
 expect(source.usage.find(i=>i.sourcePage===451&&i.label==="2 × 2 = 4；Two times two equals four.")).toMatchObject({printedLabel:"延伸"});
 expect(source.usage.find(i=>i.sourcePage===451&&i.label==="4 ÷ 2 = 2；Four divided by two equals two.")).toMatchObject({printedLabel:"延伸"});
 expect(source.usage.find(i=>i.sourcePage===454&&i.label==="hepatitis A / B / C")).toMatchObject({printedLabel:"延伸"});
});
it('registers the printed LV2 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV2'&&u.unit===50)).toMatchObject({volume:'LV2',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
});
