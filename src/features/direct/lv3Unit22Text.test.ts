import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV3Unit22.json';
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
const unit=findUnit(22,'LV3')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
it('keeps the photographed p233 kilogram wording under the original stable usage IDs',()=>{
 const printed=['一品脫約半公斤重。','一夸脫約兩品脫重（約一公斤）。'];
 expect(source.usage.slice(21,23).map(r=>[r.sourcePage,r.label])).toEqual(printed.map(text=>[233,text]));
 for(const [index,pattern] of printed.entries()) expect(unit.items.find(i=>i.learningItemId===`LI-LV3U22-G0${22+index}`)).toMatchObject({
  sourcePage:233,kind:'grammar',pattern,review:'source_checked_text_only',practiceMode:'read_only',
 });
 expect(source.sourceLimitations.some(note=>note.includes('LI-LV3U22-G022/G023')&&note.includes('待編輯裁示'))).toBe(true);
 expect(source.sourceLimitations[0]).toContain('ballot gloss is partly cropped');
});
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps original head order, printed numbers, checked pages and the next boundary',()=>{
 const heads=["bravery", "cradle", "dam", "darling", "deepen", "dime", "penny", "dip", "arrest", "erase", "fancy", "fare", "flock", "pint", "quart", "gallon", "gasoline", "grocery", "stadium", "helmet", "hometown", "honesty", "jewel", "jewelry", "junk", "litter", "lifetime", "mall", "marvelous", "merry", "queer", "voter", "underwear", "trumpet", "tower", "tangerine", "pineapple", "melon", "lemonade", "surround", "snap"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,41).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:34},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>229+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:239,printedUnit:'Unit 23',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV3'&&u.unit===22)).toMatchObject({count:112,usageCount:48,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(160);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(41).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["quart", "cowardice", "archaeological", "conservationist", "deeply", "in-depth", "top-of-the-line", "immerse", "soapy", "erasable", "delete", "a gas station", "a petrol station", "a grocery store", "dishonesty", "gem", "junkyard", "a litterbug", "a shopping mall", "marvellous", "trumpeter", "cantaloupe", "snappy"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('preserves original derivative marks, articles and explicit printed gloss variants',()=>{
 for(const [word,page,label] of [
  ['brave',229,'衍'],['cowardice',229,'反'],['reservoir',229,'比'],
  ['deep',230,'衍'],['lengthen',230,'似'],['pound',231,'延伸'],
  ['eraser',232,'衍'],['erasable',232,'衍'],['gymnasium',233,'似'],
  ['homesick',234,'衍'],['dishonesty',234,'反'],['junkyard',235,'衍'],
  ['lifelong',236,'似'],['marvel',236,'衍'],['vote',236,'衍'],['lemon',237,'衍'],
  ['surroundings',238,'衍'],['snappy',238,'衍'],
 ] as const) {
  expect(source.related.find(r=>r.word===word)).toMatchObject({sourcePage:page,printedLabel:label});
  expect(vocabulary.find(i=>i.displayWord===word)).toMatchObject({sourcePage:page,printedLabel:label});
 }
 expect(source.headwords.find(h=>h.word==='quart')).toMatchObject({sourcePage:233,printedNumber:null,officialWordId:null});
 expect(source.related.find(r=>r.word==='marvellous')).toMatchObject({sourcePage:236,printedLabel:'=（英）',officialWordId:null});
 for(const spelling of ['dinner','nonsense','a gas station','a petrol station','a grocery store','a litterbug','a shopping mall'])
  expect(source.related.some(r=>r.word===spelling)).toBe(true);
 expect(source.sourceLimitations[0]).toContain('ballot gloss is partly cropped');
 expect(unit.items.some(i=>i.pattern?.includes('Birds of a feather flock together'))).toBe(false);
 expect(unit.items.some(i=>i.pattern?.includes('Honesty is the best policy'))).toBe(false);
});
it('uses existing official identities and keeps 22 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(23);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(22);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 88 mapped identities in a complete 160-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(160);expect(ids).toHaveLength(88);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(88);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes all pending supplements while respecting printed head spellings',()=>{
 const words=siegeUnitWords('LV3',22,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,41).filter(i=>!i.officialWordId)) {
  if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);
  else expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 }
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U22',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U22',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U22 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U22 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});
