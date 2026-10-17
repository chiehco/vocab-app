import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV3Unit23.json';
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
const unit=findUnit(23,'LV3')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps original head order, printed numbers, checked pages and the next boundary',()=>{
 const heads=["microphone", "microwave", "nap", "necktie", "blouse", "vest", "pal", "parcel", "passport", "pity", "pollute", "pollution", "rot", "rotten", "rust", "sack", "shampoo", "shepherd", "slippery", "sorrow", "spy", "scout", "tease", "tender", "trunk", "tutor", "wax", "web", "bulb", "mist", "organic", "palm", "pat", "learning", "kingdom", "industrial", "humid", "rectangle", "scarce", "silk", "slope", "swan", "log"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,43).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:38},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>239+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(source.photos.find(p=>p.sourcePage===248)).toMatchObject({printedUnit:null,pageType:'notes'});
 expect(source.photos.at(-1)).toMatchObject({sourcePage:249,printedUnit:'Unit 24',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV3'&&u.unit===23)).toMatchObject({count:141,usageCount:39,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(180);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(43).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["a wireless microphone", "wireless", "reheat", "siesta", "stunning", "buddy", "a pen pal", "pitiful", "pitiless", "pollutant", "corrode", "corrosion", "erode", "erosion", "conditioner", "dandruff", "a shepherd dog", "bough", "trunks", "a first-aid kit", "styling wax", "earwax", "the World Wide Web", "the internet", "light bulb", "a lamp", "creepy", "misty", "the United Kingdom", "industrious", "industrialist", "the Industrial Revolution", "rectangular", "scarcity", "silky", "lumber"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('keeps original marks, capitalization, articles and existing microphone variants',()=>{
 for(const [word,page,label] of [
  ['shirt',239,'比'],['pitiful',240,'衍'],['pitiless',240,'衍'],
  ['corrode',241,'似'],['corrosion',241,'似'],['erode',241,'似'],['erosion',241,'似'],
  ['slip',242,'衍'],['slipper',242,'衍'],['sorry',243,'衍'],['foggy',245,'似'],['smog',245,'似'],
  ['learned',246,'衍'],['industrialist',246,'衍'],['rectangular',247,'衍'],['scarcity',247,'衍'],
 ] as const) {
  expect(source.related.find(r=>r.word===word)).toMatchObject({sourcePage:page,printedLabel:label});
  expect(vocabulary.find(i=>i.displayWord===word)).toMatchObject({sourcePage:page,printedLabel:label});
 }
 for(const spelling of ['a wireless microphone','a first-aid kit','the World Wide Web','the internet','the United Kingdom','the Industrial Revolution'])
  expect(source.related.find(r=>r.word===spelling)?.officialWordId).toBeNull();
 for(const word of ['microphone','mike']) expect(vocabulary.find(i=>i.displayWord===word)).toMatchObject({officialWordId:'W002539'});
 expect(source.headwords.find(r=>r.word==='microphone')).toMatchObject({officialWord:'microphone/mike',mappingEvidence:'explicit_existing_wordVariants'});
 expect(source.related.find(r=>r.word==='wood(s)')).toMatchObject({officialWordId:'W001993',officialWord:'wood(s)',mappingEvidence:'exact_headword'});
 expect(siegeUnitWords('LV3',23,[]).some(([w])=>w==='WOOD(S)')).toBe(false);
 expect(unit.items.some(i=>i.pattern?.includes('One rotten apple spoils the barrel'))).toBe(false);
});
it('uses existing official identities and keeps 36 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(36);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(36);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 104 mapped identities in a complete 180-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(180);expect(ids).toHaveLength(104);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(104);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes all pending supplements while respecting printed head spellings',()=>{
 const words=siegeUnitWords('LV3',23,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,43).filter(i=>!i.officialWordId)) {
  if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);
  else expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 }
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
