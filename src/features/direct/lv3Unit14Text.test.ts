import 'fake-indexeddb/auto';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import source from '../../../scripts/sources/LV3Unit14.json';
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
const unit=findUnit(14,'LV3')!;
const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());

it('keeps 44 original boxes, numbered 1–26, nine content pages and the actual Notes page',()=>{
 const heads=['swear','parade','march','cigarette','tobacco','plastic','leather','float','pole',
  'casual','casually','doubtful','doubtless','stuff','bare','barely','tourist','tourism','leap',
  'fade','vanish','cabin','hut','powder','pill','tablet','deck','limb','mayor','disk','strategy',
  'crawl','barn','hay','routine','carpet','cleaner','cooker','cupboard','hammer','hanger','heater','broadcast','brunch'];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,44).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:26},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>143+i));
 expect(source.photos.find(p=>p.sourcePage===152)).toMatchObject({pageType:'notes',printedLevel:null,printedUnit:null});
 expect(source.photos.at(-1)).toMatchObject({sourcePage:153,printedUnit:'Unit 15',pageType:'boundary'});
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(9);
 expect(textbookUnits.find(u=>u.level==='LV3'&&u.unit===14)).toMatchObject({count:92,usageCount:53,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(145);
});
it('preserves the printed supplement articles, hyphens, source pages and every use marker',()=>{
 expect(vocabulary.slice(44).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ['a disk drive','a rice cooker','air-conditioner']) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
 expect(vocabulary.find(i=>i.displayWord==='doubtless')).toMatchObject({sourcePage:145,sourceRole:'unnumbered_headword',officialWordId:null,chapterMeaningsZh:'無疑地；必定地'});
 expect(vocabulary.find(i=>i.displayWord==='brunch')).toMatchObject({sourcePage:151,printedNumber:26});
});
it('maps only existing dictionary identities and leaves 22 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;
  expect(word.word).toBe(row.officialWord);expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(24);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(22);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('does not adopt illustrations, running examples, senses or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh lightweight installation resolves all 68 mapped identities in the complete group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);
 expect(validGroup(group)).toBe(true);expect(group.itemIds).toHaveLength(145);expect(ids).toHaveLength(68);
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(68);
 expect(fetch).toHaveBeenCalledTimes(1);expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('excludes pending siege clues and keeps both checked unmapped independent heads',()=>{
 const words=siegeUnitWords('LV3',14,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const word of ['casually','doubtless']) {const item=vocabulary.find(i=>i.displayWord===word)!;expect(item.officialWordId).toBeNull();expect(words).toContainEqual([word.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves all progress tables, personal group name and order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U14',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U14',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U14 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U14 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});
