import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import source from '../../../scripts/sources/LV6Unit8.json';
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
const unit=findUnit(8,'LV6')!;const vocabulary=unit.items.filter(i=>i.kind==='vocabulary');
beforeEach(async()=>{await Promise.all([...contentDb.tables,...progressDb.tables].map(t=>t.clear()));});
afterEach(()=>vi.unstubAllGlobals());
it('keeps checked original heads, printed numbers, content pages and checked source closure',()=>{
 const heads=["reflective", "vitality", "implicit", "lush", "stimulation", "skim", "bouquet", "affirm", "verify", "teller", "supplement", "intervene", "orderly", "turmoil", "ambush", "span", "airtight", "bleach", "cardboard", "carton", "packet", "limp", "gospel", "graze", "courtyard", "playwright", "sculptor", "grapefruit", "summon", "linger", "excel", "selective", "superstitious", "excess", "tan", "vowel", "consonant", "livestock", "tempo", "broth", "lizard", "lodge", "lodging", "exclusion", "archaeology"];
 expect(source.headwordOrder).toEqual(heads);expect(vocabulary.slice(0,45).map(i=>i.displayWord)).toEqual(heads);
 expect(source.headwords.filter(h=>h.printedNumber).map(h=>h.printedNumber)).toEqual(Array.from({length:39},(_,i)=>i+1));
 expect(source.photos.map(p=>p.sourcePage)).toEqual(Array.from({length:11},(_,i)=>71+i));
 expect(source.photos.filter(p=>p.pageType==='content')).toHaveLength(10);
 expect(source.photos.some(p=>p.pageType==='notes')).toBe(false);
 expect(source.photos.at(-1)).toMatchObject({sourcePage:81,printedUnit:'Unit 09',pageType:'boundary'});
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===8)).toMatchObject({count:127,usageCount:45,partial:false});
 expect(new Set(unit.items.map(i=>i.learningItemId)).size).toBe(172);
});
it('preserves printed supplements, articles, capitalization and use pages',()=>{
 expect(vocabulary.slice(45).map(i=>[i.displayWord,i.sourcePage,i.printedLabel])).toEqual(source.related.map(r=>[r.word,r.sourcePage,r.printedLabel]));
 expect(unit.items.filter(i=>i.kind==='grammar').map(i=>[i.pattern,i.sourcePage])).toEqual(source.usage.map(r=>[r.label,r.sourcePage]));
 for(const word of ["bouquet", "verify", "lodging", "implied", "luxuriant", "verdant", "stimuli", "skimmed", "affirmation", "verified", "orderlies", "disorderly", "militia", "spanned", "watertight", "nutritional", "lame", "sculpt", "a statue maker", "carver", "accomplished", "the Renaissance", "grapefruits", "lingering", "excelled", "choosy", "tanned", "suntanned", "suntan", "sunburn", "sunburned", "sunburnt", "fowls", "archeology", "archaeologist", "archaeological"]) expect(vocabulary.find(i=>i.displayWord===word)?.officialWordId).toBeNull();
});
it('uses existing official identities and keeps 13 unmapped supplements pending',()=>{
 for(const [index,row] of [...source.headwords,...source.related].entries()) {
  expect(vocabulary[index].officialWordId).toBe(row.officialWordId);if(!row.officialWordId)continue;
  const word=pack.words.find(w=>w.wordId===row.officialWordId)!;expect(word.word).toBe(row.officialWord);
  expect(word.word===row.word||word.wordVariants.includes(row.word)).toBe(true);
 }
 expect(vocabulary.filter(i=>!i.officialWordId)).toHaveLength(36);expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')).toHaveLength(13);
 expect(vocabulary.filter(i=>i.meaningSource==='unmapped_supplement').every(i=>i.targetMeaningZh==='教材補充詞；義項待核對。')).toBe(true);
});
it('adopts no pictures, running examples, sense IDs or textbook questions',()=>{
 expect(unit.deliveryMode).toBe('text_only');expect(unit.questions).toEqual([]);expect(practiceIds(unit.items)).toEqual([]);
 expect(unit.items.every(i=>!i.illustration&&!i.originalExample&&!i.officialSenseId&&i.practiceMode==='read_only')).toBe(true);
 expect(allQuestions.some(q=>unit.items.some(i=>i.learningItemId===q.learningItemId))).toBe(false);
});
it('fresh starter resolves all 91 mapped identities in a complete 172-item group',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(pack))));await ensureContentAvailable();
 const group=templateGroup(unit.templateId);const ids=groupWordIds(group);expect(validGroup(group)).toBe(true);
 expect(group.itemIds).toHaveLength(172);expect(ids).toHaveLength(91);expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
 expect(resolveGroupWords(group,await contentDb.words.toArray())).toHaveLength(91);expect(fetch).toHaveBeenCalledTimes(1);
 expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
});
it('siege excludes pending supplements and preserves checked headword clues',()=>{
 const words=siegeUnitWords('LV6',8,[]);expect(words.some(([,m])=>m.includes('義項待核對'))).toBe(false);
 for(const item of vocabulary.filter(i=>i.meaningSource==='unmapped_supplement')) {const mapped=vocabulary.filter(i=>i.officialWordId&&i.displayWord!.toUpperCase()===item.displayWord!.toUpperCase());if(!mapped.length) expect(words.some(([w])=>w===item.displayWord!.toUpperCase())).toBe(false);else for(const [,clue] of words.filter(([w])=>w===item.displayWord!.toUpperCase())) expect(mapped.some(i=>i.targetMeaningZh===clue)).toBe(true);}
 for(const item of vocabulary.slice(0,45).filter(i=>!i.officialWordId)) {if(/^[A-Za-z]{2,16}$/.test(item.displayWord!)) expect(words).toContainEqual([item.displayWord!.toUpperCase(),item.chapterMeaningsZh]);}
});
it('content refresh preserves every progress table and personal group name/order',async()=>{
 const ids=groupWordIds(templateGroup(unit.templateId));const oldWords=pack.words.filter(w=>!ids.includes(w.wordId));
 let incoming={...pack,words:oldWords,meta:{...pack.meta,contentHash:'sa:before-U8',counts:{...pack.meta.counts,words:oldWords.length}}};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(incoming))));await ensureContentAvailable();
 await gradeFlashcard(oldWords[0].word,2,'before-U8',true);const {group}=await getOrCreateTemplateGroup(unit.templateId);
 await saveGroup({...group,name:'U8 personal order',itemIds:[...group.itemIds].reverse()});await progressDb.settings.put({key:'fontScale',value:1.15});
 const before=await Promise.all(progressDb.tables.map(t=>t.toArray()));incoming=pack;await refreshInstalledContent();
 expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);expect(await Promise.all(progressDb.tables.map(t=>t.toArray()))).toEqual(before);
 const saved=await getOrCreateTemplateGroup(unit.templateId);expect(saved.added).toBe(false);expect(saved.group.name).toBe('U8 personal order');expect(saved.group.itemIds).toEqual([...group.itemIds].reverse());
});

it('keeps independent original printed labels and phrases',()=>{
 expect(source.related[12]).toMatchObject({word:"bunch",sourcePage:72,printedLabel:"似"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V058")).toMatchObject({displayWord:"bunch",sourcePage:72,printedLabel:"似"});
 expect(vocabulary.find(i=>i.displayWord==="stabilize"&&i.sourcePage===73)).toMatchObject({printedLabel:"",sourcePage:73});
 expect(vocabulary.find(i=>i.displayWord==="currency"&&i.sourcePage===73)).toMatchObject({printedLabel:"*",sourcePage:73});
 expect(vocabulary.find(i=>i.displayWord==="patrol"&&i.sourcePage===74)).toMatchObject({printedLabel:"",sourcePage:74});
 expect(vocabulary.find(i=>i.displayWord==="the Renaissance"&&i.sourcePage===76)).toMatchObject({printedLabel:"",sourcePage:76});
 expect(vocabulary.find(i=>i.displayWord==="infection"&&i.sourcePage===78)).toMatchObject({printedLabel:"",sourcePage:78});
 expect(vocabulary.find(i=>i.displayWord==="injection"&&i.sourcePage===78)).toMatchObject({printedLabel:"*",sourcePage:78});
 expect(vocabulary.find(i=>i.displayWord==="archeology"&&i.sourcePage===80)).toMatchObject({printedLabel:"=",sourcePage:80});
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="be reflective of... = reflect...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="intervene in... = interfere in...")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="a life span = a life expectancy")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="graze on the grass")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="summon (up) one's courage = pluck up one's courage = work up one's courage")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern==="board and lodging = room and board")).toBe(true);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Too many cooks spoil the broth"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("William Shakespeare's plays span many themes"))).toBe(false);
 expect(unit.items.some(i=>i.kind==='grammar'&&i.pattern?.includes("Rex summoned up his courage and asked Catherine out"))).toBe(false);
 expect(source.usage.find(i=>i.sourcePage===73&&i.label==="in the event of...")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===73&&i.label==="proceed to + 地方")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===74&&i.label==="on patrol")).toMatchObject({printedLabel:""});
 expect(source.usage.find(i=>i.sourcePage===77&&i.label==="catch sight of...")).toMatchObject({printedLabel:"*"});
 expect(source.usage.find(i=>i.sourcePage===77&&i.label==="be all thumbs")).toMatchObject({printedLabel:"*"});
});
it('registers the printed LV6 unit while preserving formal LV3 and LV4 entries',()=>{
 expect(textbookUnits.find(u=>u.level==='LV6'&&u.unit===8)).toMatchObject({volume:'LV6',track:'7000',publisher:'ivy',partial:false});
 expect(textbookUnits.filter(u=>u.level==='LV3').map(u=>u.unit)).toEqual([1,2,4,5,6,7,8,9,10]);
 expect(textbookUnits.filter(u=>u.level==='LV4').map(u=>u.unit)).toEqual([1,...Array.from({length:22},(_,i)=>i+3)]);
});

it("keeps native checked readable source batch 33-u8-p77-comparison",()=>{
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V094")).toMatchObject({sensePos:"vi./vt."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V094")).toMatchObject({targetMeaningZh:"漫步"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V094")).toMatchObject({chapterMeaningsZh:"漫步"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V094")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V095")).toMatchObject({sensePos:"vt."});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V095")).toMatchObject({targetMeaningZh:"散步"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V095")).toMatchObject({chapterMeaningsZh:"散步"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V095")).toMatchObject({meaningSource:"textbook_transcription"});
 expect(unit.items.find(i=>i.learningItemId==="LI-LV6U08-V095")).toMatchObject({printedLabel:""});
});
