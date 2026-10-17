import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV3Unit21.json';
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
const unit=findUnit(21,'LV3')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps original head order, printed numbers, checked pages and the next boundary',()=>{
 const heads=["luggage", "baggage", "excellence", "spoil", "novelist", "invent", "inventor", "cheerful", "gossip", "dump", "ditch", "dairy", "jar", "sticky", "advanced", "bacon", "bait", "beast", "monster", "berry", "cherry", "best-seller", "pancake", "jelly", "brake", "bud", "yolk", "buffet", "bump", "carpenter", "tailor", "chat", "chop", "slice", "loaf", "circus", "clown", "clinic", "stool", "zipper", "zip", "cable", "cart"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,43).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:33},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>219+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.find(p=>p.sourcePage===228)).toMatchObject({printedUnit:null,pageType:'notes'});
 expect(source.photos.at(-1)).toMatchObject({sourcePage:229,printedUnit:'Unit 22',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV3'&&u.unit===21)).toMatchObject({count:87,usageCount:43,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(130);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(43).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["best-seller", "zip", "inventive", "alibi", "hearsay", "jerk", "dairy products", "con", "a con artist", "a conman", "blueberry", "cranberry", "mulberry", "nip", "egg white", "bumper", "bumpy", "carpentry", "mason", "a tailor-made suit", "a custom-made suit", "a ready-made suit", "the chat room", "a cable car"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('keeps original derivative and comparison marks plus literal compound spellings',()=>{
 for(const [word,page,label] of [
  ['excellent',219,'衍'],['novel',220,'衍'],['diary',221,'似'],
  ['stick',222,'衍'],['advance',222,'衍'],['monstrous',223,'衍'],
  ['break',224,'似'],['egg white',224,'比'],['bumper',225,'衍'],
  ['bumpy',225,'衍'],['carpentry',225,'衍'],['crow',226,'似'],['couch',227,'比'],
 ] as const) {
  expect(source.related.find(r=>r.word===word)).toMatchObject({sourcePage:page,printedLabel:label});
  expect(vocabulary.find(i=>i.displayWord===word)).toMatchObject({sourcePage:page,printedLabel:label});
 }
 expect(source.headwords.find(h=>h.word==='best-seller')).toMatchObject({sourcePage:223,printedNumber:17,officialWordId:null});
 expect(source.headwords.find(h=>h.word==='zip')).toMatchObject({sourcePage:227,printedNumber:null,officialWordId:null});
 for(const spelling of ['a tailor-made suit','a custom-made suit','a ready-made suit','the chat room','a cable car'])
  expect(source.related.some(r=>r.word===spelling)).toBe(true);
 expect(unit.items.some(i=>i.pattern?.includes('Spare the rod, spoil the child'))).toBe(false);
 expect(unit.items.some(i=>i.pattern?.includes('The tailor makes the man'))).toBe(false);
});
it('uses existing official identities and keeps 22 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(24);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(22);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 63 mapped identities in a complete 130-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(130);expect(ids).toHaveLength(63);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(63);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes all pending supplements while respecting printed head spellings',()=>{
 const words=siegeUnitWords('LV3',21,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,43).filter(i=>!i.officialWordId)) {
  if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);
  else expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 }
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U21',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U21',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U21 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U21 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});
