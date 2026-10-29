import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit14.json';
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
const unit=findUnit(14,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["warrant", "warranty", "morale", "intrude", "intruder", "tropic", "oppress", "oppression", "analytical", "restoration", "rehabilitate", "rehabilitation", "inflict", "ordeal", "comparative", "compile", "civilize", "civilized", "enhance", "enhancement", "applaud", "boxing", "certify", "marvel", "harmonica", "shred", "radius", "crater", "stride", "fin", "haunt", "groan", "torrent", "mingle", "whiskey", "rap", "mermaid", "mediate", "bombard", "treasury", "radioactive", "equalize", "draught", "bureaucrat"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,44).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:36},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>130+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:139,printedUnit:'Unit 15',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===14)).toMatchObject({count:115,usageCount:39,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(154);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(44).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["rehabilitation", "civilized", "bombard", "encroach", "infringe", "analyses", "renovation", "comparatively", "barbarous", "wrestling", "sanity", "mouth organ", "armonica", "shredded", "shredder", "radii", "volcanic", "strode", "stridden", "haunted", "torrential", "whiskeys", "whiskies", "rapped", "rapper", "merman", "mediator", "dispatch", "guerilla", "bomber", "treasurer", "checkers"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 13 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(32);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(13);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 82 mapped identities in a complete 154-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(154);expect(ids).toHaveLength(82);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(82);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',14,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.meaningSource!=='unmapped_supplement'&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,44).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U14',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U14',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U14 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U14 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(vocabulary.find(i=>i.displayWord==="ethnic"&&i.sourcePage===131)).toMatchObject({printedLabel:"",sourcePage:131});
 expect(vocabulary.find(i=>i.displayWord==="analyses"&&i.sourcePage===131)).toMatchObject({printedLabel:"複",sourcePage:131});
 expect(vocabulary.find(i=>i.displayWord==="radii"&&i.sourcePage===134)).toMatchObject({printedLabel:"複",sourcePage:134});
 expect(vocabulary.find(i=>i.displayWord==="volcanic"&&i.sourcePage===134)).toMatchObject({printedLabel:"*",sourcePage:134});
 expect(vocabulary.find(i=>i.displayWord==="whiskies"&&i.sourcePage===136)).toMatchObject({printedLabel:"=",sourcePage:136});
 expect(vocabulary.find(i=>i.displayWord==="guerilla"&&i.sourcePage===137)).toMatchObject({printedLabel:"",sourcePage:137});
 expect(vocabulary.find(i=>i.displayWord==="session"&&i.sourcePage===137)).toMatchObject({printedLabel:"*",sourcePage:137});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be under warranty = be under guarantee")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="intrude on / into... = encroach on... = infringe on...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="marvel at... = be amazed at...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="glass harmonica = armonica")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="鬼 + haunt + 建物 = 建物 + be haunted by + 鬼")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="fall in torrents = come down in torrents")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="rap sb for sth = criticize sb for sth")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="mediate (sth) between A and B")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The game of checkers is known by another name"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("The feminist told the poor girl"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("A huge rock from space cratered the earth"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===130&&i.label==="the Tropic of Capricorn")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===133&&i.label==="take up + N/V-ing")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===135&&i.label==="a haunted house")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===136&&i.label==="torrential rain")).toMatchObject({printedLabel:""});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===14)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});

it("keeps native checked readable source batch 36-u14-p132-comparison",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U14-V063")).toMatchObject({sensePos:"vt."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U14-V063")).toMatchObject({targetMeaningZh:"編輯（文字、版面）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U14-V063")).toMatchObject({chapterMeaningsZh:"編輯（文字、版面）"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U14-V063")).toMatchObject({meaningSource:"textbook_transcription"});
});
