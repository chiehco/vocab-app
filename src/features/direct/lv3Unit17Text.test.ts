import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV3Unit17.json';
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
const unit=findUnit(17,'LV3')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps 45 original boxes, numbered 1–33, eleven content pages, Notes and the U18 boundary',()=>{
 const heads=['knit','weave','monk','nun','breeze','mathematical','postpone','postponement','emperor','feather','fur','wrap','dose','drown','bunch','bundle','motel','inn','suicide','mess','separation','bush','panic','seal','recorder','afterward(s)','ladder','skip','plug','earplug','humor','humorous','deed','stomach','belly','misery','fold','punch','label','tag','regret','regretful','regrettable','jazz','jeep'];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:33},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:13},(_,i)=>175+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(11);
 expect(source.photos.find(p=>p.sourcePage===186)).toMatchObject({printedUnit:null,pageType:'notes'});
 expect(source.photos.at(-1)).toMatchObject({sourcePage:187,printedUnit:'Unit 18',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV3'&&u.unit===17)).toMatchObject({count:110,usageCount:55,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(165);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ['the Arctic','the Antarctic','a tape recorder','a flight data recorder','a black box','afterward(s)']) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
 expect(vocabulary.find(i=>i.displayWord==='afterward(s)')).toMatchObject({sourcePage:181,sourceRole:'main',officialWordId:null,chapterMeaningsZh:'之後'});
 expect(vocabulary.find(i=>i.displayWord==='dose')).toMatchObject({sourcePage:178,sensePos:'n./vt.',chapterMeaningsZh:'藥劑；（按劑量）給……服藥（常與介詞 with 並用）'});
});
it('uses existing official identities and keeps 27 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(32);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(27);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes('A stitch in time saves nine'))).toBe(false);
});
it('fresh starter resolves all 76 mapped identities in a complete 165-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(165);expect(ids).toHaveLength(76);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(76);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending clues but retains four checked ASCII unmapped independent boxes and excludes printed afterward(s)',()=>{
 const words=siegeUnitWords('LV3',17,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const word of ['earplug','belly','regretful','regrettable']) {const item=vocabulary.find(i=>i.displayWord===word)!;expect(item.officialWordId).toBeNull();expect(words).toContainEqual([word.toUpperCase(),item.chapterMeaningsZh]);}
 expect(words.some(([word])=>word.includes('AFTERWARD'))).toBe(false);
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U17',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U17',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U17 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U17 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});
