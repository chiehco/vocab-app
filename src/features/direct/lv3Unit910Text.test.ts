import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import source9 from '../../../scripts/sources/LV3Unit9.json';
import source10 from '../../../scripts/sources/LV3Unit10.json';
import curriculum9 from './curriculumLV3Unit9.json';
import { auditHash, lv3AfterUnitFile } from './lv3Audit.testSupport';
import pack from '../../../public/data/v1/sa-pack.json';
import { allQuestions, findUnit, REVISION, templateGroup, validGroup } from './model';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { getOrCreateTemplateGroup, saveGroup } from './store';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds, reviewedExample } from '../vocabulary/model';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { ensureContentAvailable, refreshInstalledContent } from '../../db/seed';
import { siegeUnitWords } from '../siege/model';
import { gradeFlashcard } from '../../checkin/recordActivity';
import { trustedVerbForms } from '../browser/meaningRecords';

beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
});
afterEach(() => vi.unstubAllGlobals());

// Authenticate the entire current runtime document, including untouched rows and
// metadata, before restoring the original U09 source at the U08 checkpoint.
function originalU9Items() {
  return lv3AfterUnitFile('LV3-U08', 'src/features/direct/curriculumLV3Unit9.json',
    { ...curriculum9, learningItems: findUnit(9, 'LV3')!.items }).learningItems;
}

// Synchronous historical consumer test only; never use with an async callback or
// a concurrent test. The current object/array identities and all values survive.
function withOriginalU9Items(assertHistorical: () => void) {
  const unit = findUnit(9, 'LV3')!;
  const currentItems = unit.items;
  const currentDocument = structuredClone({ ...curriculum9, learningItems: currentItems });
  const historicalItems = originalU9Items();
  try {
    unit.items = historicalItems;
    assertHistorical();
  } finally {
    unit.items = currentItems;
    expect(findUnit(9, 'LV3')).toBe(unit);
    expect(unit.items).toBe(currentItems);
    expect({ ...curriculum9, learningItems: unit.items }).toEqual(currentDocument);
  }
}

for (const [source, count, usageCount, mappedCount, headCount] of [
  [source9, 108, 63, 81, 44], [source10, 132, 53, 93, 46],
] as const) {
  const unit = findUnit(source.unit, 'LV3')!;
  const vocabulary = unit.items.filter(i => i.kind === 'vocabulary');
  const rows = [...source.headwords, ...source.related];
  describe(`LV3 U${source.unit} checked text delivery`, () => {
    it('keeps the complete printed headword, supplement and usage scope in book order', () => {
      expect(unit.deliveryMode).toBe('text_only');
      expect(textbookUnits.find(u => u.level === 'LV3' && u.unit === source.unit))
        .toMatchObject({ count, usageCount, partial: false });
      expect(vocabulary.slice(0, headCount).map(i => i.displayWord)).toEqual(source.headwordOrder);
      expect(vocabulary.slice(headCount).map(i => [i.displayWord, i.sourcePage, i.printedLabel]))
        .toEqual(source.related.map(i => [i.word, i.sourcePage, i.printedLabel]));
      const originalItems = source.unit === 9 ? originalU9Items() : unit.items;
      expect(originalItems.filter(i => i.kind === 'grammar').map(i => [i.pattern, i.sourcePage]))
        .toEqual(source.usage.map(i => [i.label, i.sourcePage]));
      expect(new Set(unit.items.map(i => i.learningItemId)).size).toBe(count + usageCount);
      expect(vocabulary.filter(i => !i.officialWordId).map(i => i.displayWord))
        .toEqual(rows.filter(i => !i.officialWordId).map(i => i.word));
    });

    it('keeps original dictionary identity, explicit variants and meaning provenance', () => {
      const originalVocabulary = (source.unit === 9 ? originalU9Items() : unit.items)
        .filter(i => i.kind === 'vocabulary');
      for (const [index, row] of rows.entries()) {
        const item = vocabulary[index];
        expect(item.officialWordId).toBe(row.officialWordId);
        if (!row.officialWordId) continue;
        const official = pack.words.find(w => w.wordId === row.officialWordId)!;
        expect(official.word).toBe(row.officialWord);
        expect(official.word === row.word || official.wordVariants.includes(row.word)).toBe(true);
        expect(originalVocabulary[index].meaningSource).toBe(index < headCount ? 'textbook_transcription' : 'existing_dictionary');
      }
      const originalUnmapped = originalVocabulary.filter(i => i.meaningSource === 'unmapped_supplement');
      expect(originalUnmapped.map(i => i.displayWord))
        .toEqual(source.related.filter(i => !i.officialWordId).map(i => i.word));
      expect(originalUnmapped
        .every(i => !i.officialWordId && i.targetMeaningZh === '教材補充詞；義項待核對。')).toBe(true);
    });

    it('does not adopt pending pictures, captions, senses or textbook questions', () => {
      expect(unit.items.every(i => !i.illustration && !i.originalExample && !i.officialSenseId)).toBe(true);
      expect(unit.questions).toEqual([]);
      expect(practiceIds(unit.items)).toEqual([]);
      expect(unit.items.every(i => !reviewedExample(i))).toBe(true);
      expect(allQuestions.some(q => unit.items.some(i => i.learningItemId === q.learningItemId))).toBe(false);
      expect(REVISION).toBe('20260912-1');
    });

    it('fresh install resolves every existing mapping without a full-data fallback', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(pack))));
      await ensureContentAvailable();
      const group = templateGroup(unit.templateId);
      const ids = groupWordIds(group);
      expect(validGroup(group)).toBe(true);
      expect(group.itemIds).toHaveLength(count + usageCount);
      expect(ids).toHaveLength(mappedCount);
      expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
      expect(resolveGroupWords(group, await contentDb.words.toArray())).toHaveLength(mappedCount);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
    });
  });
}

it('retains the printed 44/46 heads, all boundaries and the original Notes page', () => {
  const u9 = findUnit(9, 'LV3')!.items;
  const u10 = findUnit(10, 'LV3')!.items;
  expect(source9.headwords.filter(i=>i.printedNumber).map(i=>i.printedNumber)).toEqual(Array.from({length:34},(_,i)=>i+1));
  expect(source10.headwords.filter(i=>i.printedNumber).map(i=>i.printedNumber)).toEqual(Array.from({length:35},(_,i)=>i+1));
  expect(source9.headwords).toHaveLength(44);
  expect(source10.headwords).toHaveLength(46);
  expect(u9.find(i=>i.displayWord==='freezing')).toMatchObject({sourcePage:84,sourceRole:'unnumbered_headword',officialWordId:null,chapterMeaningsZh:'冷到快要結冰似的（喻極冷的）'});
  expect(u9.find(i=>i.displayWord==='breathe')).toMatchObject({sourcePage:92,sourceRole:'unnumbered_headword'});
  expect(u9.find(i=>i.displayWord==='exhibition')).toMatchObject({sourcePage:94,printedNumber:34});
  expect(u10.find(i=>i.displayWord==='electricity')).toMatchObject({sourcePage:95,sourceRole:'unnumbered_headword'});
  expect(u10.find(i=>i.displayWord==='pea')).toMatchObject({sourcePage:103,printedNumber:27,chapterMeaningsZh:'豌豆'});
  expect(u10.find(i=>i.displayWord==='the barracks')).toMatchObject({sourcePage:98,officialWordId:null});
  expect(u10.find(i=>i.displayWord==='assume')).toMatchObject({sourcePage:105,printedNumber:35});
  expect(source9.photos.at(-1)).toMatchObject({sourcePage:95,printedUnit:'Unit 10',pageType:'boundary'});
  expect(source10.photos.find(p=>p.sourcePage===106)).toMatchObject({printedLevel:null,printedUnit:null,pageType:'notes'});
  expect(source10.photos.at(-1)).toMatchObject({sourcePage:107,printedUnit:'Unit 11',pageType:'boundary'});
});

it.each([
  {unit:9, count:84, kept:['freezing','frozen','extremely']},
  {unit:10, count:98, kept:['owing','violently','automatically','relaxed','talented']},
])('inherits pending-clue exclusion for U$unit without discarding valid unmapped heads', ({unit,count,kept}) => {
  const assertHistorical = () => {
    const words=siegeUnitWords('LV3',unit,[]);
    expect(words).toHaveLength(count);
    expect(words.some(([,meaning])=>meaning.includes('義項待核對'))).toBe(false);
    for(const word of kept) {
      const item=findUnit(unit,'LV3')!.items.find(i=>i.displayWord===word)!;
      expect(item.officialWordId).toBeNull();
      expect(words).toContainEqual([word.toUpperCase(),item.chapterMeaningsZh]);
    }
  };
  if (unit === 9) withOriginalU9Items(assertHistorical);
  else assertHistorical();
});


it('authenticates the current U09 source corrections and rejects complete-document drift', () => {
  const path = 'src/features/direct/curriculumLV3Unit9.json';
  const delivered = { ...curriculum9, learningItems: findUnit(9, 'LV3')!.items };
  expect(lv3AfterUnitFile('LV3-U09', path, delivered)).toEqual(delivered);
  // Independently pinned before application, from source-inline-v3 expected-after.
  expect(auditHash(delivered)).toBe('e62802c55ea73587daaa3cc36c41abf742facce41cb676b202931fd66a63612f');
  expect(delivered.learningItems.filter(i => i.kind === 'vocabulary' && !i.officialWordId)).toHaveLength(27);
  const supplements = source9.related.filter(i => !i.officialWordId).map(i => i.word);
  expect(supplements).toHaveLength(24);
  const reviewed = delivered.learningItems.filter(i => supplements.includes(i.displayWord ?? ''));
  expect(reviewed.map(i => i.displayWord)).toEqual(supplements);
  expect(reviewed.every(i => i.officialWordId === null && i.officialSenseId === null
    && i.meaningSource === 'textbook_source_review' && i.targetMeaningZh
    && i.targetMeaningZh !== '教材補充詞；義項待核對。' && i.practiceMode === 'read_only')).toBe(true);
  expect(delivered.learningItems.find(i => i.learningItemId === 'LI-LV3U09-V045')).toMatchObject({
    displayWord: 'bump', sensePos: 'vt.', targetMeaningZh: '猛然撞擊', meaningSource: 'textbook_source_review',
  });
  expect(delivered.learningItems.find(i => i.learningItemId === 'LI-LV3U09-G023')).toMatchObject({
    pattern: '若干以 -ior 結尾的形容詞有比較級意味，與 to 並用，不與 than 並用', sourcePage: 86,
  });
  expect(delivered.learningItems.find(i => i.learningItemId === 'LI-LV3U09-G055')).toMatchObject({
    pattern: 'top the charts（此片語中的 charts 用複數）', sourcePage: 92,
  });
  const meaning = structuredClone(delivered);
  meaning.learningItems.find(i => i.learningItemId === 'LI-LV3U09-V045')!.targetMeaningZh += ' unrecorded';
  const provenance = structuredClone(delivered);
  provenance.learningItems.find(i => i.learningItemId === 'LI-LV3U09-V045')!.meaningSource = 'existing_dictionary';
  const pattern = structuredClone(delivered);
  pattern.learningItems.find(i => i.learningItemId === 'LI-LV3U09-G023')!.pattern += ' unrecorded';
  const explanation = structuredClone(delivered);
  explanation.learningItems.find(i => i.learningItemId === 'LI-LV3U09-G055')!.explanationZh += ' unrecorded';
  const untouched = structuredClone(delivered);
  untouched.learningItems.find(i => i.learningItemId === 'LI-LV3U09-V001')!.sourcePage = 999;
  const reordered = structuredClone(delivered);
  reordered.learningItems.reverse();
  const missing = structuredClone(delivered);
  missing.learningItems.pop();
  const metadata = { ...delivered, template: { ...delivered.template, unrecorded: true } };
  for (const unknown of [meaning, provenance, pattern, explanation, untouched, reordered, missing, metadata]) {
    expect(() => lv3AfterUnitFile('LV3-U08', path, unknown)).toThrow(/drift/);
  }
});

it('uses all source-reviewed U09 siege clues after the isolated historical test restores current data', () => {
  const delivered = { ...curriculum9, learningItems: findUnit(9, 'LV3')!.items };
  expect(lv3AfterUnitFile('LV3-U09', 'src/features/direct/curriculumLV3Unit9.json', delivered)).toEqual(delivered);
  const words = siegeUnitWords('LV3', 9, []);
  expect(words).toHaveLength(103);
  // Hash covers every spelling, meaning and order. Derived from the independent
  // expected source document, not from product output or the implementation.
  expect(auditHash(words)).toBe('6dbce93e0d2aadbc3b0503c3775b95074cc215113c3b7b46a67bf93642f05317');
  expect(words.some(([, meaning]) => meaning.includes('義項待核對'))).toBe(false);
  for (const word of ['freezing', 'frozen', 'extremely']) {
    const item = findUnit(9, 'LV3')!.items.find(i => i.displayWord === word)!;
    expect(item.officialWordId).toBeNull();
    expect(words).toContainEqual([word.toUpperCase(), item.chapterMeaningsZh]);
  }
});

it('retains the reviewed ordinary-card forms, rare meaning and all four starter note corrections', () => {
  expect(trustedVerbForms(pack.words.find(w => w.wordId === 'W002345')!)).toEqual({
    base: 'freeze', past: 'froze', pastParticiple: 'frozen',
    sourceRef: 'https://www.collinsdictionary.com/dictionary/english/freeze', status: 'approved',
  });
  expect(trustedVerbForms(pack.words.find(w => w.wordId === 'W003883')!)).toBeUndefined();
  expect(pack.words.find(w => w.wordId === 'W002435')).toMatchObject({
    word: 'inferior', pos: 'adj./n.', meaningEn: 'lower in quality, status, or rank; a person of lower rank or position',
  });
  expect(pack.senses.filter(sense => sense.wordId === 'W002435').map(sense => [sense.senseId, sense.status]))
    .toEqual([['W002435-1', 'needs_check'], ['W002435-2', 'needs_check']]);
  expect(pack.senses.find(sense => sense.senseId === 'W002435-2')).toMatchObject({
    sensePos: 'n.', meaningZh: '部屬', note: '罕用，建議刪列｜待拆分；主表字義：次等的；較差的；下方的；下級的',
  });
  expect(pack.examples.find(e => e.exampleId === 'EXc9bfeeee')).toMatchObject({
    sentenceEn: 'France first became a republic in the late eighteenth century.',
    sentenceZh: '法國在十八世紀晚期首次成為共和國。',
    blankSentence: 'France first became a _____ in the late eighteenth century.',
    answer: 'republic', status: 'reviewed',
  });
  for (const [noteId, content] of [
    ['NX05c3062c', '停止做某事，可以指停止眼前的動作，也可以指停止一項習慣或長期活動。'],
    ['NX8c961ea5', 'require + V-ing 在此結構表示「需要被……」；V-ing 形式為主動，意思通常為被動，主詞是接受該動作的對象。'],
    ['NXb496cc4b', 'stop to V 表示「停下原本的事，轉去做另一件事」；stop V-ing 表示「停止做某事」，也可指停止習慣或長期活動。例：We stopped to rest.／We stopped walking.'],
    ['NXe18069f9', 'come to a halt 表示停下來；grind to a halt 指逐漸變慢直到停下或停擺，用於車輛時可帶緩慢且有噪音的意思。兩者不是在所有語境都完全等同。'],
  ]) {
    expect(pack.notes.find(note => note.noteId === noteId)).toMatchObject({ content, status: 'approved' });
  }
});

it('updating the starter resolves both new units and retains progress and personal groups', async () => {
  const units = [findUnit(9, 'LV3')!, findUnit(10, 'LV3')!];
  const ids = [...new Set(units.flatMap(u => groupWordIds(templateGroup(u.templateId))))];
  const oldWords = pack.words.filter(w => !ids.includes(w.wordId));
  let incoming = { ...pack, words: oldWords, meta: { ...pack.meta, contentHash: 'sa:before-U9-U10',
    counts: { ...pack.meta.counts, words: oldWords.length } } };
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(incoming))));
  await ensureContentAvailable();
  await gradeFlashcard(oldWords[0].word, 2, 'pre-batch-progress', true);
  for (const unit of units) {
    const { group } = await getOrCreateTemplateGroup(unit.templateId);
    await saveGroup({ ...group, name: `保留 U${unit.unit} 個人名稱`, itemIds: [...group.itemIds].reverse() });
  }
  await progressDb.settings.put({ key: 'fontScale', value: 1.15 });
  const before = await Promise.all(progressDb.tables.map(table => table.toArray()));
  incoming = pack;
  await refreshInstalledContent();
  expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
  expect(await Promise.all(progressDb.tables.map(table => table.toArray()))).toEqual(before);
  for (const unit of units) {
    const saved = await getOrCreateTemplateGroup(unit.templateId);
    expect(saved.added).toBe(false);
    expect(saved.group.name).toBe(`保留 U${unit.unit} 個人名稱`);
    expect(saved.group.itemIds).toEqual(unit.items.map(i => i.learningItemId).reverse());
  }
});
