import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV3Unit24.json';
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
const unit=findUnit(24,'LV3')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps original head order, printed numbers, ten content pages and observed index transition',()=>{
 const heads=["chimney", "clip", "tack", "countable", "dearly", "energetic", "fairy", "fireworks", "greenhouse", "lighthouse", "housekeeper", "hairdresser", "barbershop", "hatch", "hug", "kangaroo", "keyboard", "kit", "lace", "leak", "scrub", "scarf", "pearl", "poster", "sausage", "shovel", "spice", "starve", "sting", "tame", "thirst", "tow", "vase", "lollipop", "teenage", "tank", "bacteria", "bay", "bomb", "cave", "flute", "razor", "magnet"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,43).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:40},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:10},(_,i)=>249+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:258,printedUnit:'Unit 24',pageType:'content'});
 expect(source.terminalIndexObservation).toMatchObject({observationVisuallyChecked:true,editionOrTotalUnitCountNotRuledOn:true,lastNumberedHead:{number:40,word:'magnet'}});
 expect(source.photos.some(p=>p.pageType==='boundary')).toBe(false);
 expect(textbookUnits.find(u=>u.level==='LV3'&&u.unit===24)).toMatchObject({count:115,usageCount:44,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(159);
});
it('preserves U24 printed labels, articles, parentheses and unresolved headword identities',()=>{
 for(const [word,label,page] of [['hair','衍',251],['haircut','衍',251],['hairdo','衍',251],['hairstyle','=',251],['barber','衍',251],['shove','衍',254],['spade','似',254],['teen(s)','衍',257],['bacterium','單',257],['a cave-in','延伸',258]] as const) {
  expect(vocabulary.find(i=>i.displayWord===word)).toMatchObject({printedLabel:label,sourcePage:page});
 }
 for(const word of ['a beauty parlor','a hair salon','teen(s)','a cave-in','disposable chopsticks']) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
 expect(vocabulary.find(i=>i.displayWord==='tack')).toMatchObject({officialWordId:null,chapterMeaningsZh:'圖釘；用圖釘釘',sourcePage:249});
 expect(vocabulary.find(i=>i.displayWord==='barbershop')).toMatchObject({officialWordId:null,chapterMeaningsZh:'（男）理髮店',sourcePage:251});
 expect(unit.items.filter(i=>i.kind==='grammar').some(i=>i.pattern?.includes("Don't count your chickens before they hatch")||i.pattern?.includes('Variety is the spice of life'))).toBe(false);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(43).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["tack", "dearly", "fireworks", "barbershop", "thumbtack", "countless", "uncountable", "greatly", "deeply", "arrogance", "fairies", "firecrackers", "butler", "hairdo", "hairstyle", "a beauty parlor", "a hair salon", "hatches", "kangaroos", "undone", "leaky", "scarfs", "scarves", "swine", "pearly", "cinnamon", "stinger", "docile", "teen(s)", "tanker", "bacterium", "handrail", "bomber", "bombard", "a cave-in", "disposable chopsticks"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 32 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(36);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(32);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 79 mapped identities in a complete 159-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(159);expect(ids).toHaveLength(79);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(79);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes all pending supplements while respecting printed head spellings',()=>{
 const words=siegeUnitWords('LV3',24,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 for(const item of vocabulary.slice(0,43).filter(i=>!i.officialWordId)) {
  if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);
  else expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);
 }
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U24',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U24',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U24 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U24 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});
