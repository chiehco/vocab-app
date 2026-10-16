import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV3Unit15.json';
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
const unit=findUnit(15,'LV3')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps 45 original boxes, numbered 1–33, ten content pages and the U16 boundary',()=>{
 const heads=['dislike','patience','bubble','mushroom','mobile','nickname','vivid','lively','bury',
  'continent','farther','weep','ripe','boot','complain','complaint','cheek','jaw','chin','forehead',
  'cocktail','bartender','pub','wander','miracle','whip','wealthy','poverty','drunk','lawn','meadow',
  'weed','portrait','marble','bead','comma','laughter','grin','bless','crash','cruel','database','grassy','dumpling','geography'];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:33},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>153+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:163,printedUnit:'Unit 16',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV3'&&u.unit===15)).toMatchObject({count:122,usageCount:46,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(168);
});
it('preserves all supplement/use pages and printed spelling without stripping articles',()=>{
 expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ['a mobile phone','a cellular phone','a cellphone','a smartphone','a lawn mower','poverty-stricken']) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
 expect(vocabulary.find(i=>i.displayWord==='forehead')).toMatchObject({sourcePage:157,sourceRole:'unnumbered_headword',officialWordId:null,chapterMeaningsZh:'前額'});
 expect(vocabulary.find(i=>i.displayWord==='crash')).toMatchObject({sourcePage:161,sensePos:'n./vi.',chapterMeaningsZh:'墜毀；撞擊聲；衝撞；撞擊'});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==='a lawn mower'&&i.sourcePage===159)).toBe(true);
 expect(unit.items.some(i=>i.displayWord==='a lawnmower'||i.pattern==='a lawnmower')).toBe(false);
 for(const [word,label] of [['grass','衍'],['geographic','衍'],['geographical','衍（= geographic）']]) expect(vocabulary.find(i=>i.displayWord===word)).toMatchObject({sourcePage:162,printedLabel:label});
 expect(vocabulary.find(i=>i.displayWord==='data')).toMatchObject({sourcePage:161,printedLabel:'衍'});
});
it('uses existing official identities and keeps 31 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(33);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(31);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 88 mapped identities in a complete 168-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(168);expect(ids).toHaveLength(88);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(88);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending clues but retains both checked unmapped independent boxes',()=>{
 const words=siegeUnitWords('LV3',15,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const word of ['forehead','bartender']) {const item=vocabulary.find(i=>i.displayWord===word)!;expect(item.officialWordId).toBeNull();expect(words).toContainEqual([word.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U15',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U15',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U15 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U15 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});
