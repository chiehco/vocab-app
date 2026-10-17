import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV3Unit16.json';
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
const unit=findUnit(16,'LV3')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps 45 original boxes, numbered 1–30, eleven content pages, Notes and the U17 boundary',()=>{
 const heads=['amaze','amazed','amazing','amazement','acceptable','charm','charming','meaningful','meaningless',
  'statue','living','communicate','swell','shrink','knight','crown','gang','mob','thread','stitch','explode',
  'horror','horrible','gap','fountain','youngster','elderly','tap','faucet','racial','summit','follower',
  'traveler','champion','interrupt','glow','ray','beam','twin','tight','tighten','sigh','citizen','holder','hunger'];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:30},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:13},(_,i)=>163+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(11);
 expect(source.photos.find(p=>p.sourcePage===174)).toMatchObject({printedUnit:null,pageType:'notes'});
 expect(source.photos.at(-1)).toMatchObject({sourcePage:175,printedUnit:'Unit 17',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV3'&&u.unit===16)).toMatchObject({count:134,usageCount:58,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(192);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ['the Statue of Liberty','a tearjerker','a blockbuster','Siamese twins','X-ray','blow up...']) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
 expect(vocabulary.find(i=>i.displayWord==='living')).toMatchObject({sourcePage:165,sourceRole:'main',officialWordId:null,chapterMeaningsZh:'生計；活著的；現在的'});
 expect(vocabulary.find(i=>i.displayWord==='beam')).toMatchObject({sourcePage:171,sensePos:'vt./vi./n.',chapterMeaningsZh:'播送；廣播；高興地微笑（與介詞 at 並用）；愉快的微笑；光束'});
});
it('uses existing official identities and keeps 33 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(38);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(33);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes('A stitch in time saves nine'))).toBe(false);
});
it('fresh starter resolves all 95 mapped identities in a complete 192-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(192);expect(ids).toHaveLength(95);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(95);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending clues but retains all five checked unmapped independent boxes',()=>{
 const words=siegeUnitWords('LV3',16,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const word of ['amazed','amazing','charming','meaningless','living']) {const item=vocabulary.find(i=>i.displayWord===word)!;expect(item.officialWordId).toBeNull();expect(words).toContainEqual([word.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U16',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U16',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U16 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U16 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});
