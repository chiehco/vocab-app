import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import source9 from '../../../scripts/sources/LV3Unit9.json';
import source10 from '../../../scripts/sources/LV3Unit10.json';
import curriculum9 from './curriculumLV3Unit9.json';
import curriculum10 from './curriculumLV3Unit10.json';
import words10 from '../../../public/data/v1/words.json';
import examples10 from '../../../public/data/v1/examples.json';
import { auditHash, lv3AfterUnitFile, loadLV3Chain, isAuditUnitStep, lv3AfterUnitPublishedText } from './lv3Audit.testSupport';
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

// U10 historical assertions retain the exact U09 checkpoint. Authenticate the
// complete document, not a subset of learning items or selected reviewed rows.
function originalU10Items() {
  return lv3AfterUnitFile('LV3-U09', 'src/features/direct/curriculumLV3Unit10.json',
    { ...curriculum10, learningItems: findUnit(10, 'LV3')!.items }).learningItems;
}

// Synchronous and non-concurrent only. Never retain historical runtime state.
function withOriginalU10Items(assertHistorical: () => void) {
  const unit = findUnit(10, 'LV3')!;
  const currentItems = unit.items;
  const currentDocument = structuredClone({ ...curriculum10, learningItems: currentItems });
  const historicalItems = originalU10Items();
  try {
    unit.items = historicalItems;
    assertHistorical();
  } finally {
    unit.items = currentItems;
    expect(findUnit(10, 'LV3')).toBe(unit);
    expect(unit.items).toBe(currentItems);
    expect({ ...curriculum10, learningItems: unit.items }).toEqual(currentDocument);
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
      const originalItems = source.unit === 9 ? originalU9Items() : originalU10Items();
      expect(originalItems.filter(i => i.kind === 'grammar').map(i => [i.pattern, i.sourcePage]))
        .toEqual(source.usage.map(i => [i.label, i.sourcePage]));
      expect(new Set(unit.items.map(i => i.learningItemId)).size).toBe(count + usageCount);
      expect(vocabulary.filter(i => !i.officialWordId).map(i => i.displayWord))
        .toEqual(rows.filter(i => !i.officialWordId).map(i => i.word));
    });

    it('keeps original dictionary identity, explicit variants and meaning provenance', () => {
      const originalVocabulary = (source.unit === 9 ? originalU9Items() : originalU10Items())
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
  else withOriginalU10Items(assertHistorical);
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
  const historicalPack = lv3AfterUnitFile('LV3-U10', 'public/data/v1/sa-pack.json', pack);
  expect(trustedVerbForms(historicalPack.words.find(w => w.wordId === 'W002345')!)).toEqual({
    base: 'freeze', past: 'froze', pastParticiple: 'frozen',
    sourceRef: 'https://www.collinsdictionary.com/dictionary/english/freeze', status: 'approved',
  });
  expect(trustedVerbForms(historicalPack.words.find(w => w.wordId === 'W003883')!)).toBeUndefined();
  expect(historicalPack.words.find(w => w.wordId === 'W002435')).toMatchObject({
    word: 'inferior', pos: 'adj./n.', meaningEn: 'lower in quality, status, or rank; a person of lower rank or position',
  });
  expect(historicalPack.senses.filter(sense => sense.wordId === 'W002435').map(sense => [sense.senseId, sense.status]))
    .toEqual([['W002435-1', 'needs_check'], ['W002435-2', 'needs_check']]);
  expect(historicalPack.senses.find(sense => sense.senseId === 'W002435-2')).toMatchObject({
    sensePos: 'n.', meaningZh: '部屬', note: '罕用，建議刪列｜待拆分；主表字義：次等的；較差的；下方的；下級的',
  });
  expect(historicalPack.examples.find(e => e.exampleId === 'EXc9bfeeee')).toMatchObject({
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
    expect(historicalPack.notes.find(note => note.noteId === noteId)).toMatchObject({ content, status: 'approved' });
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


// Independent frozen-source expectations, prepared before product application.
// Source candidate raw SHA256: 74648d62c6fb06ff32dabbcc15dc66c4a798eb06642c21e376e675ee24565aac
// Independent expected raw SHA256: 6e2955e88401bd706a844b8cb00499534c2aa9071213b78e263b7be1e3c288fc
// No test reads transient output/ files, nor reconstructs expectations from actual-after.
type U10Row = Record<string, unknown>;
type U10ExpectedRow = {dataset: string; id: string; key: string; beforeHash: string; afterHash: string; starterIncluded: boolean; fields: U10Row; sources: Record<string, string>};
const u10ExpectedDocuments: Record<string, string> = {
  "src/features/direct/curriculumLV3Unit10.json": "6c0e1eb342a5b289e0cc9294af845c875c783c6cb97b1383817f218e6ad6f00c",
  "public/data/v1/words.json": "1b9264c38eef7fd30ad867c3ef8098d91e8b9a1e5ded767d3c8a22c7f7fa43b1",
  "public/data/v1/examples.json": "321cd6306d1ad321b762908f5b5e4c25e8168fda73fd47abfd6d1d999b0f5f51"
};
const u10BeforeDocuments: Record<string, string> = {
  "src/features/direct/curriculumLV3Unit10.json": "67820d63d516882442441b52f4db93bebc91963ab3f272a7610a696e77443130",
  "public/data/v1/words.json": "1e27f7826330e66a46640e29b5acc763ea7e07b426b88d3d139c0f68a01f6431",
  "public/data/v1/examples.json": "3ed8282fb66b797868f27f67dc239fe1702d4d7a9f1c5040956e431257e03854"
};
const u10ExpectedRows: U10ExpectedRow[] = [
  {"dataset":"curriculum","id":"LI-LV3U10-V047","key":"learningItemId","beforeHash":"7b0576c00bba8b89b48835caaf4f3ce266088feb4a14297ebfd50e5920b4d5e2","afterHash":"dbd9b0df23a4446fe7e1a2750c4e6df940d09ecc5e7ec3f6a8b5c5619b2e9cbc","starterIncluded":false,"fields":{"targetMeaningZh":"電的；電動的","chapterMeaningsZh":"電的；電動的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"d969935858869bbfd926ef032f019b9a19febb08cce521305c370956e6087ff0","chapterMeaningsZh":"d969935858869bbfd926ef032f019b9a19febb08cce521305c370956e6087ff0","meaningSource":"d969935858869bbfd926ef032f019b9a19febb08cce521305c370956e6087ff0"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V049","key":"learningItemId","beforeHash":"1836013e186e853f74dbe902f272760c3ff47d5e99638c0ce337b4910a53d8bd","afterHash":"849b48bf4b12a4be89747fba0241565155ca802c1733057a100707d422625e24","starterIncluded":false,"fields":{"targetMeaningZh":"技工；電工","chapterMeaningsZh":"技工；電工","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"1d955430fbb4779a3e8a422479a5f35c697f34755ca95f945a5774d653cbcff6","chapterMeaningsZh":"1d955430fbb4779a3e8a422479a5f35c697f34755ca95f945a5774d653cbcff6","meaningSource":"1d955430fbb4779a3e8a422479a5f35c697f34755ca95f945a5774d653cbcff6"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V050","key":"learningItemId","beforeHash":"5a55f9c37c24e89a02b315d43535ca90783d2ecc80d2f6616bc83bf5908ff104","afterHash":"9b7116969bc97211889c0799f3661c21b06f6f5719a7a4704d49b2b2bbde53c0","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"有光澤的；光滑的","chapterMeaningsZh":"有光澤的；光滑的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"326e49a8104264f5ab2319f464ff8f65b0194cbeb168da4927868d22bb36910e","targetMeaningZh":"326e49a8104264f5ab2319f464ff8f65b0194cbeb168da4927868d22bb36910e","chapterMeaningsZh":"326e49a8104264f5ab2319f464ff8f65b0194cbeb168da4927868d22bb36910e","meaningSource":"326e49a8104264f5ab2319f464ff8f65b0194cbeb168da4927868d22bb36910e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V051","key":"learningItemId","beforeHash":"d14d1c6c27e66950b5866cd58d82db2776713e18d6e2fbea31239fa7d152e4a8","afterHash":"b57de6a57983fcf0078c50c421875a1d7884e693dcfdec1c889896abc6c3847d","starterIncluded":false,"fields":{"sensePos":"vt./vi./n.","targetMeaningZh":"擦亮；發亮；照耀；光亮","chapterMeaningsZh":"擦亮；發亮；照耀；光亮","meaningSource":"textbook_source_review"},"sources":{"sensePos":"6a08f124312d522803190a11543650ddd657d549bd9bf70fbed72284dbbe256b","targetMeaningZh":"6a08f124312d522803190a11543650ddd657d549bd9bf70fbed72284dbbe256b","chapterMeaningsZh":"6a08f124312d522803190a11543650ddd657d549bd9bf70fbed72284dbbe256b","meaningSource":"6a08f124312d522803190a11543650ddd657d549bd9bf70fbed72284dbbe256b"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V052","key":"learningItemId","beforeHash":"9930acdb905d39a5aa86859acbd428b70b3cafd5e4802a9cd8bad9a8a5ea58db","afterHash":"24b90e4e9ce45506e37ba36ae3a88a62ffc6fbe6e8927e20a2e02fdce74c486d","starterIncluded":false,"fields":{"sensePos":"n./vt.","targetMeaningZh":"地方；放置","chapterMeaningsZh":"地方；放置","meaningSource":"textbook_source_review"},"sources":{"sensePos":"17316f5d9983dde3aa2525353784985d22d9b1adaf385113817c7dc67fb2180c","targetMeaningZh":"17316f5d9983dde3aa2525353784985d22d9b1adaf385113817c7dc67fb2180c","chapterMeaningsZh":"17316f5d9983dde3aa2525353784985d22d9b1adaf385113817c7dc67fb2180c","meaningSource":"17316f5d9983dde3aa2525353784985d22d9b1adaf385113817c7dc67fb2180c"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V053","key":"learningItemId","beforeHash":"bed11a9649fe9ce531cc5c31f3ee77059af5f42df39f126c7bf8753c8fee5507","afterHash":"f685e1f65b80cf913fd5610c63104e9a2ef232c92e8ee24576f454672c8430bc","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"等級","chapterMeaningsZh":"等級","meaningSource":"textbook_source_review"},"sources":{"sensePos":"3dd5dd5a20cbfe24bf7e524094b9beff4641ab5d5e5e13ed492d3c771bb16bec","targetMeaningZh":"3dd5dd5a20cbfe24bf7e524094b9beff4641ab5d5e5e13ed492d3c771bb16bec","chapterMeaningsZh":"3dd5dd5a20cbfe24bf7e524094b9beff4641ab5d5e5e13ed492d3c771bb16bec","meaningSource":"3dd5dd5a20cbfe24bf7e524094b9beff4641ab5d5e5e13ed492d3c771bb16bec"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V054","key":"learningItemId","beforeHash":"955cd98eadacd19c02daefac14622b06bf6ad4d79e128e6b61890c9d1c6b9783","afterHash":"d8467ea23199d5761cfd64ea099e330d2cde0dad8045b09f8e8956d27552b681","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"級別","chapterMeaningsZh":"級別","meaningSource":"textbook_source_review"},"sources":{"sensePos":"f04ee9aa0406b1ca655d9026f786bf883ed0b962469a3635475f43bb520f4006","targetMeaningZh":"f04ee9aa0406b1ca655d9026f786bf883ed0b962469a3635475f43bb520f4006","chapterMeaningsZh":"f04ee9aa0406b1ca655d9026f786bf883ed0b962469a3635475f43bb520f4006","meaningSource":"f04ee9aa0406b1ca655d9026f786bf883ed0b962469a3635475f43bb520f4006"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V055","key":"learningItemId","beforeHash":"f13c0c8ee36654a3ab03f212edd00178e663cb37c3754a102c3b519d7fd75eda","afterHash":"945423dabebc5165900c6350075471f8efc076c4144e5678a3740b0755212642","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"不平坦的","chapterMeaningsZh":"不平坦的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"c21a8cb727495e027412e6975d146c83493fb39e915e68060fbd2f7f62ed4334","targetMeaningZh":"c21a8cb727495e027412e6975d146c83493fb39e915e68060fbd2f7f62ed4334","chapterMeaningsZh":"c21a8cb727495e027412e6975d146c83493fb39e915e68060fbd2f7f62ed4334","meaningSource":"c21a8cb727495e027412e6975d146c83493fb39e915e68060fbd2f7f62ed4334"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V056","key":"learningItemId","beforeHash":"6d070fedf991c14dad300b8bbf01f3469d895763abc83acd2b9551ee3e1c217c","afterHash":"5f75ddc254d51c62d8c6c175d9a56975dacafe34bd37220ff5ad428151a0e5c6","starterIncluded":false,"fields":{"targetMeaningZh":"粗糙的","chapterMeaningsZh":"粗糙的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"9b61b32319819fe88f71ebb55e91286558ab5907709355666915839631f9cd91","chapterMeaningsZh":"9b61b32319819fe88f71ebb55e91286558ab5907709355666915839631f9cd91","meaningSource":"9b61b32319819fe88f71ebb55e91286558ab5907709355666915839631f9cd91"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V057","key":"learningItemId","beforeHash":"1ae519036a10654283e8e84ea78823862fd1e2c813170356ad31059c83b2bd5e","afterHash":"e8b99c7c6e4c0d43d87a165a3d25bfd3d80798af317a5e9c3f094524cb0bd0d5","starterIncluded":false,"fields":{"targetMeaningZh":"粗野的","chapterMeaningsZh":"粗野的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"cf2d981e9d7e5a7fba121b3c24b953671b02e65cd1a4fc273236b19be5a008b7","chapterMeaningsZh":"cf2d981e9d7e5a7fba121b3c24b953671b02e65cd1a4fc273236b19be5a008b7","meaningSource":"cf2d981e9d7e5a7fba121b3c24b953671b02e65cd1a4fc273236b19be5a008b7"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V058","key":"learningItemId","beforeHash":"a8f88f5b671d7821e617f280215526310796180336d880ff0aeadc99a12bc1d5","afterHash":"91ecf680eda72b7b9754e1655d7bd9f926ef069761493bb7055ae5ee3fc383a8","starterIncluded":false,"fields":{"targetMeaningZh":"粗暴的","chapterMeaningsZh":"粗暴的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"837e5b9d405b3c3ce1f7065b8d99d9a59a8d242be96ba3336eaa9daf0241a044","chapterMeaningsZh":"837e5b9d405b3c3ce1f7065b8d99d9a59a8d242be96ba3336eaa9daf0241a044","meaningSource":"837e5b9d405b3c3ce1f7065b8d99d9a59a8d242be96ba3336eaa9daf0241a044"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V059","key":"learningItemId","beforeHash":"5725668257a99bae22b33d92172ca5ad9e6351fa3f3cb449fcd525ebde9de188","afterHash":"9b5978155c9b1c6e384fa78a3b0d811ac035984bea4a386423fd7118424a20e7","starterIncluded":false,"fields":{"sensePos":"adv.","targetMeaningZh":"簡略地","chapterMeaningsZh":"簡略地","meaningSource":"textbook_source_review"},"sources":{"sensePos":"e7d206ee34070709a1f2da3250745a679d978454e559bc8082eb343e746b1b56","targetMeaningZh":"e7d206ee34070709a1f2da3250745a679d978454e559bc8082eb343e746b1b56","chapterMeaningsZh":"e7d206ee34070709a1f2da3250745a679d978454e559bc8082eb343e746b1b56","meaningSource":"e7d206ee34070709a1f2da3250745a679d978454e559bc8082eb343e746b1b56"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V060","key":"learningItemId","beforeHash":"198ec5e169490014bbbf819582e0e87d8ff29e5325139610c3e1fe7b031f71da","afterHash":"e0442c66fec021023878c9b530ea1107a59846e062fbbfd0b99c1dcf38b93d66","starterIncluded":false,"fields":{"targetMeaningZh":"入口","chapterMeaningsZh":"入口","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"e31b7dabc817e35ba04df3bf4c5382ef90cc573f6710b4e30f8522adeaaa53d3","chapterMeaningsZh":"e31b7dabc817e35ba04df3bf4c5382ef90cc573f6710b4e30f8522adeaaa53d3","meaningSource":"e31b7dabc817e35ba04df3bf4c5382ef90cc573f6710b4e30f8522adeaaa53d3"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V061","key":"learningItemId","beforeHash":"16ecf8c78dc42bd6db13fcac0c9527f5dbb0572529df44e414baff0988c6f8b8","afterHash":"edb5240362733bf9ef56f93e971cf93066d5b26fe5bb5a5ddfff0d9b808b546c","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"出口","chapterMeaningsZh":"出口","meaningSource":"textbook_source_review"},"sources":{"sensePos":"f3293fb193f0b72cbf3295f40282b84faca3178f3554319f04e556b896b362b5","targetMeaningZh":"f3293fb193f0b72cbf3295f40282b84faca3178f3554319f04e556b896b362b5","chapterMeaningsZh":"f3293fb193f0b72cbf3295f40282b84faca3178f3554319f04e556b896b362b5","meaningSource":"f3293fb193f0b72cbf3295f40282b84faca3178f3554319f04e556b896b362b5"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V062","key":"learningItemId","beforeHash":"7d95d1de15e440c465dadffe51cbdceb9bb572e25baff162f33bd79cb34b0568","afterHash":"92c3013f1ef18b6e0e3cc4e42c0f4f1dabd1bfc9d9292345dd55b21ee338905e","starterIncluded":false,"fields":{"sensePos":"vt./vi.","targetMeaningZh":"證明；結果顯示","chapterMeaningsZh":"證明；結果顯示","meaningSource":"textbook_source_review"},"sources":{"sensePos":"f97269bb4059faf869ee8f2754a788c598301dfcb87faed1556298149116400e","targetMeaningZh":"f97269bb4059faf869ee8f2754a788c598301dfcb87faed1556298149116400e","chapterMeaningsZh":"f97269bb4059faf869ee8f2754a788c598301dfcb87faed1556298149116400e","meaningSource":"f97269bb4059faf869ee8f2754a788c598301dfcb87faed1556298149116400e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V063","key":"learningItemId","beforeHash":"459135a5cb48d6f2aaf16fa1bc5123e7a28ade2b715c81ee539f045c80d707cc","afterHash":"0521a63a15695328cfd1ac5522b384ba09a1fe24c63e297c7103398d2516efc3","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"證據；證明（集合名詞，不可數）","chapterMeaningsZh":"證據；證明（集合名詞，不可數）","meaningSource":"textbook_source_review"},"sources":{"sensePos":"a4f7f37a7f8486bd5a225b2fd40e6b064b098243231e036796a594f400d31776","targetMeaningZh":"a4f7f37a7f8486bd5a225b2fd40e6b064b098243231e036796a594f400d31776","chapterMeaningsZh":"a4f7f37a7f8486bd5a225b2fd40e6b064b098243231e036796a594f400d31776","meaningSource":"a4f7f37a7f8486bd5a225b2fd40e6b064b098243231e036796a594f400d31776"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V064","key":"learningItemId","beforeHash":"70a4918ed78a9229c1519900b2049c6fb8e34e09e0a3602dff45fe4e4031c143","afterHash":"34a70b1ccf3d7284e9265af6cb8e237efeca49c599609d9cdbbe0dcd50f0427a","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"防水的","chapterMeaningsZh":"防水的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"ed2a4d01b8c6c62cfe8bde57c8a0c5ee68e88264a3411567056ed165486b8633","targetMeaningZh":"ed2a4d01b8c6c62cfe8bde57c8a0c5ee68e88264a3411567056ed165486b8633","chapterMeaningsZh":"ed2a4d01b8c6c62cfe8bde57c8a0c5ee68e88264a3411567056ed165486b8633","meaningSource":"ed2a4d01b8c6c62cfe8bde57c8a0c5ee68e88264a3411567056ed165486b8633"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V065","key":"learningItemId","beforeHash":"6624fe24e7a3cade962422577cfa84cbfff7371d2e2a4796e9df3c6fe91ed421","afterHash":"dafbc70029f65cbc32006eec37a7344394b6740719ef32a21f26e69223d95119","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"隔音的","chapterMeaningsZh":"隔音的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"54ae8aa159ee768816ca5ffe69b709d4b8bc1282aaf3d3270f55055538ee6dbc","targetMeaningZh":"54ae8aa159ee768816ca5ffe69b709d4b8bc1282aaf3d3270f55055538ee6dbc","chapterMeaningsZh":"54ae8aa159ee768816ca5ffe69b709d4b8bc1282aaf3d3270f55055538ee6dbc","meaningSource":"54ae8aa159ee768816ca5ffe69b709d4b8bc1282aaf3d3270f55055538ee6dbc"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V066","key":"learningItemId","beforeHash":"516555af1380863343e8b62a085619c6cd7d4771f39d539cecb7f33ea8a8a508","afterHash":"cacf629deb1a8848272a8a990a9c056d5977103dc22a48d9e994e17daa005280","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"防彈的","chapterMeaningsZh":"防彈的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"0b19b32ce272bb9c0d820cc61894d574ce8c9665cacf6697637eeb748ed6dfe2","targetMeaningZh":"0b19b32ce272bb9c0d820cc61894d574ce8c9665cacf6697637eeb748ed6dfe2","chapterMeaningsZh":"0b19b32ce272bb9c0d820cc61894d574ce8c9665cacf6697637eeb748ed6dfe2","meaningSource":"0b19b32ce272bb9c0d820cc61894d574ce8c9665cacf6697637eeb748ed6dfe2"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V067","key":"learningItemId","beforeHash":"54759a826ec13d9a4c29f499be3519a05f04c343218162ab988cfdd207ad3630","afterHash":"d922a1a172ecfd274d956570da8cd0b469c8f8149e652e448f631ae58727c119","starterIncluded":false,"fields":{"targetMeaningZh":"被告","chapterMeaningsZh":"被告","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"57798220208e8b85b7f2c8e73d3ee0e715029af3398726d0308d65921a809b49","chapterMeaningsZh":"57798220208e8b85b7f2c8e73d3ee0e715029af3398726d0308d65921a809b49","meaningSource":"57798220208e8b85b7f2c8e73d3ee0e715029af3398726d0308d65921a809b49"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V068","key":"learningItemId","beforeHash":"96cb8f6129b7ea272a977dacf7585701174b03ffe3377e736f0d97f53ad59b31","afterHash":"397dc260ce9c214e3df6049cb4495e5a08ce45383d74bc67e7e58348eb743923","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"有（違背良心）罪的","chapterMeaningsZh":"有（違背良心）罪的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"af9a51e9a0830025f4ceaf59a658a5e0288ea34ce6782d5897ec75f95069dde9","targetMeaningZh":"af9a51e9a0830025f4ceaf59a658a5e0288ea34ce6782d5897ec75f95069dde9","chapterMeaningsZh":"af9a51e9a0830025f4ceaf59a658a5e0288ea34ce6782d5897ec75f95069dde9","meaningSource":"af9a51e9a0830025f4ceaf59a658a5e0288ea34ce6782d5897ec75f95069dde9"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V069","key":"learningItemId","beforeHash":"cb5abc55b2b2c354d72f0fc9218eeca6f0a0a98861831aaea365c2625afede85","afterHash":"aebe5a2c07863bf90b2bbda2b0b5688161c848bf36f705e46315e1a29592a9d3","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"海軍的","chapterMeaningsZh":"海軍的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"3be16902213cf8b8f38eccd5466ae7344a23eb1041fbc403a15c9473a0abaa02","targetMeaningZh":"3be16902213cf8b8f38eccd5466ae7344a23eb1041fbc403a15c9473a0abaa02","chapterMeaningsZh":"3be16902213cf8b8f38eccd5466ae7344a23eb1041fbc403a15c9473a0abaa02","meaningSource":"3be16902213cf8b8f38eccd5466ae7344a23eb1041fbc403a15c9473a0abaa02"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V070","key":"learningItemId","beforeHash":"9091569c5f5d7d0e2c34e8e3c25596e109a3c917ca7663e76b120369c5c74551","afterHash":"c322bf8da5b4dd7a9acd289b6e91cc3ae26bb75501da30ff2a64fb49fa5126f4","starterIncluded":false,"fields":{"targetMeaningZh":"陸軍","chapterMeaningsZh":"陸軍","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"6ccc74dd353e79f224eea7f666295e0e6e1d5aeace825584cd9d9b01918e10b6","chapterMeaningsZh":"6ccc74dd353e79f224eea7f666295e0e6e1d5aeace825584cd9d9b01918e10b6","meaningSource":"6ccc74dd353e79f224eea7f666295e0e6e1d5aeace825584cd9d9b01918e10b6"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V071","key":"learningItemId","beforeHash":"2af0c7f04150cff87b616c02e0970b962050e5e63f1da52ec0d5fa74df91bdd7","afterHash":"14679d541c35a62d47181b976a2098d893cc1e69efb1dd1147caf2743f7a4039","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"海軍陸戰隊","chapterMeaningsZh":"海軍陸戰隊","meaningSource":"textbook_source_review"},"sources":{"sensePos":"dee2b9137d82f3df14c60fd2a95031680b23b623f5b2d2a05c2bfde38bdaf43a","targetMeaningZh":"dee2b9137d82f3df14c60fd2a95031680b23b623f5b2d2a05c2bfde38bdaf43a","chapterMeaningsZh":"dee2b9137d82f3df14c60fd2a95031680b23b623f5b2d2a05c2bfde38bdaf43a","meaningSource":"dee2b9137d82f3df14c60fd2a95031680b23b623f5b2d2a05c2bfde38bdaf43a"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V073","key":"learningItemId","beforeHash":"8e38361cfa6700a45e1588424f97ace1916101d19915d5f82467058ea1438f3b","afterHash":"be31ef92eb2bca42c87f993436ea4fe6d2e8dc2c4bb4072eb248af8178137256","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"空軍基地","chapterMeaningsZh":"空軍基地","meaningSource":"textbook_source_review"},"sources":{"sensePos":"696e3c1b881e4e35b33dfad1aa99f6345e1c4d01dbea4bdc2306eda5959abc7e","targetMeaningZh":"696e3c1b881e4e35b33dfad1aa99f6345e1c4d01dbea4bdc2306eda5959abc7e","chapterMeaningsZh":"696e3c1b881e4e35b33dfad1aa99f6345e1c4d01dbea4bdc2306eda5959abc7e","meaningSource":"696e3c1b881e4e35b33dfad1aa99f6345e1c4d01dbea4bdc2306eda5959abc7e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V074","key":"learningItemId","beforeHash":"ff6192ebee8a9505c87b81d671a8db165137690b07dbf3fefb9c1625858c00ae","afterHash":"6563d3c7d8bf5b60b6a1e19e655cfd44113e8db50d2193fecf324890addd21c1","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"營房；兵營","chapterMeaningsZh":"營房；兵營","meaningSource":"textbook_source_review"},"sources":{"sensePos":"dabce5ef31b89f4621e08e8e4a36d957336bb5c74d2f7c203291f80761c19e16","targetMeaningZh":"dabce5ef31b89f4621e08e8e4a36d957336bb5c74d2f7c203291f80761c19e16","chapterMeaningsZh":"dabce5ef31b89f4621e08e8e4a36d957336bb5c74d2f7c203291f80761c19e16","meaningSource":"dabce5ef31b89f4621e08e8e4a36d957336bb5c74d2f7c203291f80761c19e16"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V075","key":"learningItemId","beforeHash":"8ae23c01d9b820c782f2590b23a874cf3a75ac2b83b75593680be6fe584e1e6f","afterHash":"bbe23b217324a662c6c3a4cc6fd79bc5b97c426ecab0c1f2dd120177d72ba272","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"福利社（軍中福利社；the post exchange 的縮寫）","chapterMeaningsZh":"福利社（軍中福利社；the post exchange 的縮寫）","meaningSource":"textbook_source_review"},"sources":{"sensePos":"e85506841646e23ca89a350fcc16709c677755e2e0556a4233f7f405bf0b8461","targetMeaningZh":"e85506841646e23ca89a350fcc16709c677755e2e0556a4233f7f405bf0b8461","chapterMeaningsZh":"e85506841646e23ca89a350fcc16709c677755e2e0556a4233f7f405bf0b8461","meaningSource":"e85506841646e23ca89a350fcc16709c677755e2e0556a4233f7f405bf0b8461"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V076","key":"learningItemId","beforeHash":"0382aa88610ca5395612fd6d04d52c6d20354c4efe6ebcb9c3c824c618346230","afterHash":"d1ff6edf7c9f4078fd39969eaac5dd75eef6360fd5cafc30236636acd9b3464d","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"福利社（軍中福利社）","chapterMeaningsZh":"福利社（軍中福利社）","meaningSource":"textbook_source_review"},"sources":{"sensePos":"e33d6847b63deeea9e7968d04a7ef73c372a9539d01196cebc7167c1c1d6baac","targetMeaningZh":"e33d6847b63deeea9e7968d04a7ef73c372a9539d01196cebc7167c1c1d6baac","chapterMeaningsZh":"e33d6847b63deeea9e7968d04a7ef73c372a9539d01196cebc7167c1c1d6baac","meaningSource":"e33d6847b63deeea9e7968d04a7ef73c372a9539d01196cebc7167c1c1d6baac"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V077","key":"learningItemId","beforeHash":"69f80f2002f1b731127cbd94a88f3540eb281b856fd8f639dae98fec701364c0","afterHash":"067c406d6b042bee4f5290edd1b3b38b3247898e011b0e256fd8b46b8d2d1c0a","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"賄賂","chapterMeaningsZh":"賄賂","meaningSource":"textbook_source_review"},"sources":{"sensePos":"de58cebe108bba7e28398c960dba57c8aa1e30949152a697b312549f31e037f5","targetMeaningZh":"de58cebe108bba7e28398c960dba57c8aa1e30949152a697b312549f31e037f5","chapterMeaningsZh":"de58cebe108bba7e28398c960dba57c8aa1e30949152a697b312549f31e037f5","meaningSource":"de58cebe108bba7e28398c960dba57c8aa1e30949152a697b312549f31e037f5"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V078","key":"learningItemId","beforeHash":"496223171efa1b24450c3decbc82ea197b220bba5aea5cd8aa35aca1a4198160","afterHash":"71ea52878c00e612288fdd592e705ae4d3a8104138a817247fb630a91984b13c","starterIncluded":false,"fields":{"targetMeaningZh":"貪汙；腐敗","chapterMeaningsZh":"貪汙；腐敗","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"486842d830844b189752790958166087b2af631b8137aeabbb3653f4dcc21046","chapterMeaningsZh":"486842d830844b189752790958166087b2af631b8137aeabbb3653f4dcc21046","meaningSource":"486842d830844b189752790958166087b2af631b8137aeabbb3653f4dcc21046"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V081","key":"learningItemId","beforeHash":"4e289ad29c181277a639695bc00f93376132a31d328436bc3eda9dc84e0e256d","afterHash":"07fe4580fcb3e208b1803e570bc740ba8354ebe922198a5a3a335e4b9ee7c50a","starterIncluded":false,"fields":{"targetMeaningZh":"殘忍的","chapterMeaningsZh":"殘忍的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"a470386e11bdd46b69319c8a8e71c0d7f740fcca2c2a148da015f11fd13f793c","chapterMeaningsZh":"a470386e11bdd46b69319c8a8e71c0d7f740fcca2c2a148da015f11fd13f793c","meaningSource":"a470386e11bdd46b69319c8a8e71c0d7f740fcca2c2a148da015f11fd13f793c"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V082","key":"learningItemId","beforeHash":"072c40d3779e147f56221d14811d287e7710cfb28dad6cc71179baa8d3f73aa9","afterHash":"65f072c3181958e0109aee31b649dcad591b570d0bc4d91d1a69a5df6da8c5a5","starterIncluded":false,"fields":{"targetMeaningZh":"殘暴的","chapterMeaningsZh":"殘暴的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"b43e1fd04ed0b3cc8e37a9c8a15253d22b56cfc11fb30e78a15559eb7d50ff05","chapterMeaningsZh":"b43e1fd04ed0b3cc8e37a9c8a15253d22b56cfc11fb30e78a15559eb7d50ff05","meaningSource":"b43e1fd04ed0b3cc8e37a9c8a15253d22b56cfc11fb30e78a15559eb7d50ff05"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V083","key":"learningItemId","beforeHash":"629c8e87ef5adbc924418f2e5eb1ac27bd84187ae5a70493413543c086cff7df","afterHash":"1f23dfa55e93ebc584bb255a1667ca22bed4c5fb1e5eacba65a3d1e0ca17945f","starterIncluded":false,"fields":{"sensePos":"adv.","targetMeaningZh":"強烈地","chapterMeaningsZh":"強烈地","meaningSource":"textbook_source_review"},"sources":{"sensePos":"4ec2a4880321b0b1ce1c410696b7b55ddf4c9c31c53528f8e15c0e3bc6112a64","targetMeaningZh":"4ec2a4880321b0b1ce1c410696b7b55ddf4c9c31c53528f8e15c0e3bc6112a64","chapterMeaningsZh":"4ec2a4880321b0b1ce1c410696b7b55ddf4c9c31c53528f8e15c0e3bc6112a64","meaningSource":"4ec2a4880321b0b1ce1c410696b7b55ddf4c9c31c53528f8e15c0e3bc6112a64"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V084","key":"learningItemId","beforeHash":"3d75ac1059d388fe1f0700ed5a8c1ad23bba5d34f8d16b16979dacbe5ceee63c","afterHash":"ab1f7c20b283a7ffd3631a88356b5813ba059e6a3e3288915c893b73f5c590bc","starterIncluded":false,"fields":{"sensePos":"adv.","targetMeaningZh":"激烈地","chapterMeaningsZh":"激烈地","meaningSource":"textbook_source_review"},"sources":{"sensePos":"1d77e0500789db1df350a79744fe65073ddc2587140e93f397f7e3098d830620","targetMeaningZh":"1d77e0500789db1df350a79744fe65073ddc2587140e93f397f7e3098d830620","chapterMeaningsZh":"1d77e0500789db1df350a79744fe65073ddc2587140e93f397f7e3098d830620","meaningSource":"1d77e0500789db1df350a79744fe65073ddc2587140e93f397f7e3098d830620"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V085","key":"learningItemId","beforeHash":"5710c085213d6000222034ac33838d48fea137f6dfe4692971dd7052fa9f7767","afterHash":"1d885a8c929799a3dfedbdcc1b6a573f3e09dc24124cf0a42acdebee706867e0","starterIncluded":false,"fields":{"sensePos":"adv.","targetMeaningZh":"殘忍地","chapterMeaningsZh":"殘忍地","meaningSource":"textbook_source_review"},"sources":{"sensePos":"b6ba09c7a4b575a079538787122711d3ea3358068cdb4d0b510e1c1e3a1a252d","targetMeaningZh":"b6ba09c7a4b575a079538787122711d3ea3358068cdb4d0b510e1c1e3a1a252d","chapterMeaningsZh":"b6ba09c7a4b575a079538787122711d3ea3358068cdb4d0b510e1c1e3a1a252d","meaningSource":"b6ba09c7a4b575a079538787122711d3ea3358068cdb4d0b510e1c1e3a1a252d"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V086","key":"learningItemId","beforeHash":"ea601e80927a8d3cc483aefe6cca4dcfbc54a82310da82903ba6e807309094d4","afterHash":"00205a7b9f4959e571ce4f44a5d093667c3458e4ca45674ab73f82b41c021f2b","starterIncluded":false,"fields":{"sensePos":"adv.","targetMeaningZh":"粗暴地","chapterMeaningsZh":"粗暴地","meaningSource":"textbook_source_review"},"sources":{"sensePos":"9cf161b484befdac773efb6d44178e9326fc82cc49cde70fa54647b28f147cc8","targetMeaningZh":"9cf161b484befdac773efb6d44178e9326fc82cc49cde70fa54647b28f147cc8","chapterMeaningsZh":"9cf161b484befdac773efb6d44178e9326fc82cc49cde70fa54647b28f147cc8","meaningSource":"9cf161b484befdac773efb6d44178e9326fc82cc49cde70fa54647b28f147cc8"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V087","key":"learningItemId","beforeHash":"e5bcf29e99bfe9ac9180048eb271eb6b16bf8bfbf0a5b23ad9127eeb3c254935","afterHash":"c558b450ba9f98133bab1c69c627c75d48a05b8d31a74e147920091ed266c3a1","starterIncluded":false,"fields":{"sensePos":"vt.","targetMeaningZh":"顯露","chapterMeaningsZh":"顯露","meaningSource":"textbook_source_review"},"sources":{"sensePos":"68059bbfda6698b96ead563215601cea9f27e4c205d37e47e4883bf8e13f5ede","targetMeaningZh":"68059bbfda6698b96ead563215601cea9f27e4c205d37e47e4883bf8e13f5ede","chapterMeaningsZh":"68059bbfda6698b96ead563215601cea9f27e4c205d37e47e4883bf8e13f5ede","meaningSource":"68059bbfda6698b96ead563215601cea9f27e4c205d37e47e4883bf8e13f5ede"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V088","key":"learningItemId","beforeHash":"6b2ec2aa6fb4acb1e632e9ccaa98409db6a7199dafda2961dabeeb74a354b9c9","afterHash":"6eb7268611c80b28b0af73acb2e69b8a1cf025f52f2f010e1a1eebd239c43b23","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"調查員","chapterMeaningsZh":"調查員","meaningSource":"textbook_source_review"},"sources":{"sensePos":"b4c151fa94c1434ffe2dc45e708725ba93aaed8cac52bb0c99fa0277116c9abd","targetMeaningZh":"b4c151fa94c1434ffe2dc45e708725ba93aaed8cac52bb0c99fa0277116c9abd","chapterMeaningsZh":"b4c151fa94c1434ffe2dc45e708725ba93aaed8cac52bb0c99fa0277116c9abd","meaningSource":"b4c151fa94c1434ffe2dc45e708725ba93aaed8cac52bb0c99fa0277116c9abd"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V089","key":"learningItemId","beforeHash":"32aed7f61942c85abf2937524dc9745b848e7dabe0ece5c5b9b6d2e77d3a29ef","afterHash":"cd286e086df198c5c306880680b600c5b7759e4556271000976dec584ec6e836","starterIncluded":false,"fields":{"sensePos":"vi.","targetMeaningZh":"惡化","chapterMeaningsZh":"惡化","meaningSource":"textbook_source_review"},"sources":{"sensePos":"80f34a84e64e7d194b9b19c9cf0fea4c83cec08b65c18f211505cc6a78c4dd8e","targetMeaningZh":"80f34a84e64e7d194b9b19c9cf0fea4c83cec08b65c18f211505cc6a78c4dd8e","chapterMeaningsZh":"80f34a84e64e7d194b9b19c9cf0fea4c83cec08b65c18f211505cc6a78c4dd8e","meaningSource":"80f34a84e64e7d194b9b19c9cf0fea4c83cec08b65c18f211505cc6a78c4dd8e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V091","key":"learningItemId","beforeHash":"4324f45828606299525ea066116f5565ffdddeb7d756d369bfa054eb6a84559e","afterHash":"666fc539e024a868c7d4e4b239ff8c9ac54d831e3ebe037d4bb69c9b72b50623","starterIncluded":false,"fields":{"targetMeaningZh":"調查","chapterMeaningsZh":"調查","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"72ea4dcab96f7ec5b8cdf62033e889ef44a3c33a38165c3f9b98d52dac1379cc","chapterMeaningsZh":"72ea4dcab96f7ec5b8cdf62033e889ef44a3c33a38165c3f9b98d52dac1379cc","meaningSource":"72ea4dcab96f7ec5b8cdf62033e889ef44a3c33a38165c3f9b98d52dac1379cc"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V092","key":"learningItemId","beforeHash":"9be7174631d08f7f85c767f514d1800622b0e39270591712e3030862b267b988","afterHash":"e0424ad8f911ddd922f3f77a28bcd1127b7417ca4a6bb467285bb04db59bc358","starterIncluded":false,"fields":{"sensePos":"vt.","targetMeaningZh":"調查；探查","chapterMeaningsZh":"調查；探查","meaningSource":"textbook_source_review"},"sources":{"sensePos":"219356a6b27461987d209e0d0c0dac72ec46f452c4fb9c7a745ebb31dbc1337b","targetMeaningZh":"219356a6b27461987d209e0d0c0dac72ec46f452c4fb9c7a745ebb31dbc1337b","chapterMeaningsZh":"219356a6b27461987d209e0d0c0dac72ec46f452c4fb9c7a745ebb31dbc1337b","meaningSource":"219356a6b27461987d209e0d0c0dac72ec46f452c4fb9c7a745ebb31dbc1337b"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V093","key":"learningItemId","beforeHash":"32ed849cca7cb6891926f22c5d7d22fd758c14f9bad038b0d7f809fde4e49820","afterHash":"1c36a38f7ef90006f46614664bab87928bae525cbdf9724090cdd21ee6592792","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"自動化的","chapterMeaningsZh":"自動化的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"d9e9b888ff50c0a155f2455d13fdc62272e055cdb71576f3d5b63567122687e4","targetMeaningZh":"d9e9b888ff50c0a155f2455d13fdc62272e055cdb71576f3d5b63567122687e4","chapterMeaningsZh":"d9e9b888ff50c0a155f2455d13fdc62272e055cdb71576f3d5b63567122687e4","meaningSource":"d9e9b888ff50c0a155f2455d13fdc62272e055cdb71576f3d5b63567122687e4"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V094","key":"learningItemId","beforeHash":"68367756e1df816d1365582b0b4ee5156b610758176ccba07b4a0f1e49ea2911","afterHash":"fbd48901d4b7407d91bbdcfc36d4b91a62c6aa2bc8a1816b7ecc491915eff3af","starterIncluded":false,"fields":{"targetMeaningZh":"告示；公告；新聞快報","chapterMeaningsZh":"告示；公告；新聞快報","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"051fe1a295dd26dab79ac1ecdf7832204a3d4e9c79820d7f9bcb2b4893abfb6b","chapterMeaningsZh":"051fe1a295dd26dab79ac1ecdf7832204a3d4e9c79820d7f9bcb2b4893abfb6b","meaningSource":"051fe1a295dd26dab79ac1ecdf7832204a3d4e9c79820d7f9bcb2b4893abfb6b"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V095","key":"learningItemId","beforeHash":"92b8e48ce2fd69e8897e931639454d221c702c22510d48237b35af6165b22b1c","afterHash":"9d9894df3d9b009cb8a107e019474fdd724649914f35dc798dfbcb69c95aa6d2","starterIncluded":false,"fields":{"sensePos":"vt.","targetMeaningZh":"擁有","chapterMeaningsZh":"擁有","meaningSource":"textbook_source_review"},"sources":{"sensePos":"1f59edee608ccdbd301a43cdcb72a930f303ea0faadb70a5d4801a1521cb88d5","targetMeaningZh":"1f59edee608ccdbd301a43cdcb72a930f303ea0faadb70a5d4801a1521cb88d5","chapterMeaningsZh":"1f59edee608ccdbd301a43cdcb72a930f303ea0faadb70a5d4801a1521cb88d5","meaningSource":"1f59edee608ccdbd301a43cdcb72a930f303ea0faadb70a5d4801a1521cb88d5"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V096","key":"learningItemId","beforeHash":"a059895d84e5d49e86bf2a939e621f83017d775f0760d967bb73c5ea89bfc807","afterHash":"6c40e147132e77c7409c1db1b9571cbebb55b6624f59c70f525ce4becc191136","starterIncluded":false,"fields":{"targetMeaningZh":"擁有者；主人","chapterMeaningsZh":"擁有者；主人","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"8147abf229e5c29cd94d6d8a75eb4cf282970ce84c4c58cf76dea63becc1016e","chapterMeaningsZh":"8147abf229e5c29cd94d6d8a75eb4cf282970ce84c4c58cf76dea63becc1016e","meaningSource":"8147abf229e5c29cd94d6d8a75eb4cf282970ce84c4c58cf76dea63becc1016e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V097","key":"learningItemId","beforeHash":"2ccd1f555060af87411dc24cb2d97bc31d5fe95e7ece77ed5406f75855576827","afterHash":"51932db489592af78c1ae70536b0d7b59d73198113ff12ae6c4eca8204b3fbfe","starterIncluded":false,"fields":{"targetMeaningZh":"相似的","chapterMeaningsZh":"相似的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"93c2e24160e3847f86c759534457626845154a8e1dcfaaa2a362c5450dc13c48","chapterMeaningsZh":"93c2e24160e3847f86c759534457626845154a8e1dcfaaa2a362c5450dc13c48","meaningSource":"93c2e24160e3847f86c759534457626845154a8e1dcfaaa2a362c5450dc13c48"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V098","key":"learningItemId","beforeHash":"0b9149217288ce247e9d53add2134150888dac5cd0808841aefbe9782f39170e","afterHash":"7b91fb4818b360f80a3e75fda5815c1b5161aea813ee7275458a46514a3e5b93","starterIncluded":false,"fields":{"targetMeaningZh":"相似","chapterMeaningsZh":"相似","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"77133c60161a6033cc13fc779f71f742a223d9dc8a662dcc7238c7f43925cb1e","chapterMeaningsZh":"77133c60161a6033cc13fc779f71f742a223d9dc8a662dcc7238c7f43925cb1e","meaningSource":"77133c60161a6033cc13fc779f71f742a223d9dc8a662dcc7238c7f43925cb1e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V099","key":"learningItemId","beforeHash":"1d2078d18d7be2f20e083c95721c82665714d9535cb1399e2341d13108d64fc0","afterHash":"b33403b708461c7d6d3d1cd4a7e36e9ae0ef2e177f221a0e0aec28dc34182103","starterIncluded":false,"fields":{"targetMeaningZh":"差異；不同","chapterMeaningsZh":"差異；不同","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"2bff9538e6941ce8b2507540e3ac981c4f52336137fa7880e0c99635343889b0","chapterMeaningsZh":"2bff9538e6941ce8b2507540e3ac981c4f52336137fa7880e0c99635343889b0","meaningSource":"2bff9538e6941ce8b2507540e3ac981c4f52336137fa7880e0c99635343889b0"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V100","key":"learningItemId","beforeHash":"b9729d0c343d6ee0c0b31cd2c8e45f3d672f6bdb638d68a37bb1bddce7a1f02f","afterHash":"062536cabbb9d60c9d300ea90f2df38b235ea1f15a4fdbc924daa0889ae914a8","starterIncluded":false,"fields":{"targetMeaningZh":"放鬆；緩和","chapterMeaningsZh":"放鬆；緩和","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"1330546f57454c6f079e0f470fb2ceb0149da314a7ad811cba93d848ac02a6ea","chapterMeaningsZh":"1330546f57454c6f079e0f470fb2ceb0149da314a7ad811cba93d848ac02a6ea","meaningSource":"1330546f57454c6f079e0f470fb2ceb0149da314a7ad811cba93d848ac02a6ea"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V101","key":"learningItemId","beforeHash":"63748111ad8e5ec455789004b92a5a375f94cd28b028db5a4aa348393af48334","afterHash":"1058e8f72635669697e708a0c2fe9eccc27e85877fdaefd03798114e2ecaf6b8","starterIncluded":false,"fields":{"sensePos":"vt./vi.","targetMeaningZh":"（使）放鬆","chapterMeaningsZh":"（使）放鬆","meaningSource":"textbook_source_review"},"sources":{"sensePos":"f1040949b86048dca86a424dbb11c0acc6b250a540ff48cbdee505354763cb84","targetMeaningZh":"f1040949b86048dca86a424dbb11c0acc6b250a540ff48cbdee505354763cb84","chapterMeaningsZh":"f1040949b86048dca86a424dbb11c0acc6b250a540ff48cbdee505354763cb84","meaningSource":"f1040949b86048dca86a424dbb11c0acc6b250a540ff48cbdee505354763cb84"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V102","key":"learningItemId","beforeHash":"6f2c42ec03e1703a4053fbd974dc8fac09fcc9cdceafc6e54cba31d59b7d4429","afterHash":"6172f8f25a136b2e8a589d6922b74ba8ef75dc03b7a5a8e0dce37b5c3c3db705","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"令人放鬆的","chapterMeaningsZh":"令人放鬆的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"05384afeec098414e94ae60f0bc34da1f3d5c0edd0e6b2979fe0c45c2db83969","targetMeaningZh":"05384afeec098414e94ae60f0bc34da1f3d5c0edd0e6b2979fe0c45c2db83969","chapterMeaningsZh":"05384afeec098414e94ae60f0bc34da1f3d5c0edd0e6b2979fe0c45c2db83969","meaningSource":"05384afeec098414e94ae60f0bc34da1f3d5c0edd0e6b2979fe0c45c2db83969"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V103","key":"learningItemId","beforeHash":"afd35da776e5748ae3a7fa15469c370e656c908fbb9b26d9d12917bf411fda0f","afterHash":"b09d475db9f7fd25469c2eb89bb8908642a7309ce135cb92ac32fa9a034b76dc","starterIncluded":false,"fields":{"targetMeaningZh":"寬鬆的","chapterMeaningsZh":"寬鬆的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"6e9f1494310b258a83efaf386145c719f50201eb175ee65f7c4ce7f366d4d294","chapterMeaningsZh":"6e9f1494310b258a83efaf386145c719f50201eb175ee65f7c4ce7f366d4d294","meaningSource":"6e9f1494310b258a83efaf386145c719f50201eb175ee65f7c4ce7f366d4d294"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V104","key":"learningItemId","beforeHash":"5d503f028dd37582818b56a386fd6aebea223aa84f0fb580281668729b612099","afterHash":"11cde053b9244dfcfc52575635951bd682a877a24b15106ec1c06927bc5c0151","starterIncluded":false,"fields":{"targetMeaningZh":"無憂無慮的；輕鬆愉快的","chapterMeaningsZh":"無憂無慮的；輕鬆愉快的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"57363c7a9d68ab56a6df1ba18846f1f4ac5b64a44217ccb1d0fb86e7cf7d63ef","chapterMeaningsZh":"57363c7a9d68ab56a6df1ba18846f1f4ac5b64a44217ccb1d0fb86e7cf7d63ef","meaningSource":"57363c7a9d68ab56a6df1ba18846f1f4ac5b64a44217ccb1d0fb86e7cf7d63ef"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V105","key":"learningItemId","beforeHash":"6da08d8e04d1b8d29a156681608f9b46cf24941bb3c9ea3cd5209fca55dec9fc","afterHash":"84324af2b3e90f1ce10e2101ceef57f484d0e920a48c2c3ca8418db8bedffcef","starterIncluded":false,"fields":{"targetMeaningZh":"混和；混和物","chapterMeaningsZh":"混和；混和物","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"3e09faf9f2fb64d14081fec7b93b382d722ef9c952d4b02d964dfc955c8955dc","chapterMeaningsZh":"3e09faf9f2fb64d14081fec7b93b382d722ef9c952d4b02d964dfc955c8955dc","meaningSource":"3e09faf9f2fb64d14081fec7b93b382d722ef9c952d4b02d964dfc955c8955dc"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V106","key":"learningItemId","beforeHash":"c77d3781ea48fcb95c2ab7112cc4fbacee3fab75c06a22676e6eb51605dcfbe6","afterHash":"19e3a251d8049a45e8396ecd7556f33662424d96cd80609db7ffd7d9c615cdbc","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"領土的","chapterMeaningsZh":"領土的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"32044ebd2d1597e6f2fce45fc6534b27723cd214b0ad2135ae9f2f888605a151","targetMeaningZh":"32044ebd2d1597e6f2fce45fc6534b27723cd214b0ad2135ae9f2f888605a151","chapterMeaningsZh":"32044ebd2d1597e6f2fce45fc6534b27723cd214b0ad2135ae9f2f888605a151","meaningSource":"32044ebd2d1597e6f2fce45fc6534b27723cd214b0ad2135ae9f2f888605a151"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V107","key":"learningItemId","beforeHash":"a87767e83de2339a19ceb10703001cd80b69d948eb8a105575e5512f0b2156dd","afterHash":"98f0e683bc20f2653951495238b36d420ec3189d274586e4c85f875ce5bf498b","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"流氓的地盤","chapterMeaningsZh":"流氓的地盤","meaningSource":"textbook_source_review"},"sources":{"sensePos":"4c3043b06a12643c420142f975a2d73ebe6cbc115dc70cdc943a37f897161728","targetMeaningZh":"4c3043b06a12643c420142f975a2d73ebe6cbc115dc70cdc943a37f897161728","chapterMeaningsZh":"4c3043b06a12643c420142f975a2d73ebe6cbc115dc70cdc943a37f897161728","meaningSource":"4c3043b06a12643c420142f975a2d73ebe6cbc115dc70cdc943a37f897161728"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V108","key":"learningItemId","beforeHash":"afd11d36c82d3af4344c7ced6048f92c19c194d54c643dd5ec9d4fa7c652d8e1","afterHash":"fe732231fe832fa615c7fdc59af3854ba1fa16de755142692d98bb7a7e1947d5","starterIncluded":false,"fields":{"targetMeaningZh":"聰明的；有智慧的","chapterMeaningsZh":"聰明的；有智慧的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"cab6ef1dc2df731ba2c55ed0a808c3acd481bfbd438011a7f6096d09f28d5a3c","chapterMeaningsZh":"cab6ef1dc2df731ba2c55ed0a808c3acd481bfbd438011a7f6096d09f28d5a3c","meaningSource":"cab6ef1dc2df731ba2c55ed0a808c3acd481bfbd438011a7f6096d09f28d5a3c"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V109","key":"learningItemId","beforeHash":"af92b10d1b3595ef700ee6de171b8a2e844038f36a4471888a538011e48baba7","afterHash":"243d34877b606f749bcfdc12613f880e910f870d279194db308c65a8b24a56a5","starterIncluded":false,"fields":{"targetMeaningZh":"智能；智慧","chapterMeaningsZh":"智能；智慧","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"feb5b4b5956d3920b1996a960a91d83b8cbcf2330fed50ee56fdaedfdb870aff","chapterMeaningsZh":"feb5b4b5956d3920b1996a960a91d83b8cbcf2330fed50ee56fdaedfdb870aff","meaningSource":"feb5b4b5956d3920b1996a960a91d83b8cbcf2330fed50ee56fdaedfdb870aff"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V110","key":"learningItemId","beforeHash":"5eafe3a8e5f469355f58e77af08100ae91a0b98f20d6f60a963959bfe9345b85","afterHash":"862459c7fb3e40cc4bd18698d5c3aad6c6b209dc7548131dd960f6078ecd6a29","starterIncluded":false,"fields":{"sensePos":"adv./n.","targetMeaningZh":"同時","chapterMeaningsZh":"同時","meaningSource":"textbook_source_review"},"sources":{"sensePos":"3010201fd5c60ac8f36683c47b581dcc8db4cc45e5fd02372275e3a894cb1d96","targetMeaningZh":"3010201fd5c60ac8f36683c47b581dcc8db4cc45e5fd02372275e3a894cb1d96","chapterMeaningsZh":"3010201fd5c60ac8f36683c47b581dcc8db4cc45e5fd02372275e3a894cb1d96","meaningSource":"3010201fd5c60ac8f36683c47b581dcc8db4cc45e5fd02372275e3a894cb1d96"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V111","key":"learningItemId","beforeHash":"0b667203e9e628f86d748a4c461dacf8fcc97104f81c09d8d4add111d9f94039","afterHash":"839edab6f8cdee900d10283fb547ed10a8be9c9eb86fcb4f1c784e30ad3a44d8","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"燕麥","chapterMeaningsZh":"燕麥","meaningSource":"textbook_source_review"},"sources":{"sensePos":"1dbbcef6c960800e300925492dfa8176c45023f8f2d2e9a7379ef460b838bd3a","targetMeaningZh":"1dbbcef6c960800e300925492dfa8176c45023f8f2d2e9a7379ef460b838bd3a","chapterMeaningsZh":"1dbbcef6c960800e300925492dfa8176c45023f8f2d2e9a7379ef460b838bd3a","meaningSource":"1dbbcef6c960800e300925492dfa8176c45023f8f2d2e9a7379ef460b838bd3a"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V112","key":"learningItemId","beforeHash":"79468502b590fe72cdef89d7be028322d76cb38b733132c91b0ba9ebd0f01c10","afterHash":"360753ae03f15617c1ddd08662cd62df08064c582d4764e65c94eb559417266c","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"大麥","chapterMeaningsZh":"大麥","meaningSource":"textbook_source_review"},"sources":{"sensePos":"1f718f1b0a0172dc0197a4290d1d7e8098b8a5a3d3c26bbc0e5bb9ff3db2a76a","targetMeaningZh":"1f718f1b0a0172dc0197a4290d1d7e8098b8a5a3d3c26bbc0e5bb9ff3db2a76a","chapterMeaningsZh":"1f718f1b0a0172dc0197a4290d1d7e8098b8a5a3d3c26bbc0e5bb9ff3db2a76a","meaningSource":"1f718f1b0a0172dc0197a4290d1d7e8098b8a5a3d3c26bbc0e5bb9ff3db2a76a"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V113","key":"learningItemId","beforeHash":"86d01f982a19779aebb7b69f30a33b251ddb3ec243bbbd688b70c887a401d204","afterHash":"19aebbe385f36264a312cc3a01161215b9ef5317764a11ca257a452f26931115","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"黑麥；裸麥","chapterMeaningsZh":"黑麥；裸麥","meaningSource":"textbook_source_review"},"sources":{"sensePos":"113509c58973c4788fb357e0f2b17898a3d1e75e406287875b479917b2962d0d","targetMeaningZh":"113509c58973c4788fb357e0f2b17898a3d1e75e406287875b479917b2962d0d","chapterMeaningsZh":"113509c58973c4788fb357e0f2b17898a3d1e75e406287875b479917b2962d0d","meaningSource":"113509c58973c4788fb357e0f2b17898a3d1e75e406287875b479917b2962d0d"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V114","key":"learningItemId","beforeHash":"76e606507272e4f310a41396fea85037bc2a68465afbe251f40ea044f219037b","afterHash":"e0c8a386a6dcaa4190c70ebb2685082aa1940c2afd799a2cd48b3a12738b50cd","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"蕎麥","chapterMeaningsZh":"蕎麥","meaningSource":"textbook_source_review"},"sources":{"sensePos":"cd724b8086e85fc7ccfe479f1e05415c79a2c74c1c7965bf82ad035a8588ccb4","targetMeaningZh":"cd724b8086e85fc7ccfe479f1e05415c79a2c74c1c7965bf82ad035a8588ccb4","chapterMeaningsZh":"cd724b8086e85fc7ccfe479f1e05415c79a2c74c1c7965bf82ad035a8588ccb4","meaningSource":"cd724b8086e85fc7ccfe479f1e05415c79a2c74c1c7965bf82ad035a8588ccb4"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V115","key":"learningItemId","beforeHash":"8b406ab9a6fc6530c6ffc0e20c9daaefb4ad6ed0bff7973abec56e058430033c","afterHash":"b7b311459803e3ad331d58708cd2a654c1366e51756908412640ee2e62439918","starterIncluded":false,"fields":{"targetMeaningZh":"穀物","chapterMeaningsZh":"穀物","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"42e7356b63733113e4b00822b33206f820d781907839896891a6e9d1687735cf","chapterMeaningsZh":"42e7356b63733113e4b00822b33206f820d781907839896891a6e9d1687735cf","meaningSource":"42e7356b63733113e4b00822b33206f820d781907839896891a6e9d1687735cf"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V116","key":"learningItemId","beforeHash":"c2bbf4562e693188949723c08af202915a681c8e1ee862e163cd079b4677f510","afterHash":"7658a18c0fbbc69635e19692196c7929e77c1b57a7e822fe11fec0a324dfcb3c","starterIncluded":false,"fields":{"targetMeaningZh":"競爭","chapterMeaningsZh":"競爭","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"9ad1e0a35b365f3ac0d3784174617846cce88672fb4e559ce4e3ad884a4d88ff","chapterMeaningsZh":"9ad1e0a35b365f3ac0d3784174617846cce88672fb4e559ce4e3ad884a4d88ff","meaningSource":"9ad1e0a35b365f3ac0d3784174617846cce88672fb4e559ce4e3ad884a4d88ff"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V118","key":"learningItemId","beforeHash":"8a73f57b97f1f3956dfbf444d39a46ead524b5b7eb7ca045dc4a32c97d1a3d0d","afterHash":"dfc164aeac5d8fb0d9703d8ac6722b02c85817a37beec1890ac216c443286da4","starterIncluded":false,"fields":{"targetMeaningZh":"競爭者；參賽者","chapterMeaningsZh":"競爭者；參賽者","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"6ea26d20f757302fbaa210b97b3d7cf764c99b4eb3242a2f90b41d32d130b692","chapterMeaningsZh":"6ea26d20f757302fbaa210b97b3d7cf764c99b4eb3242a2f90b41d32d130b692","meaningSource":"6ea26d20f757302fbaa210b97b3d7cf764c99b4eb3242a2f90b41d32d130b692"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V119","key":"learningItemId","beforeHash":"fb28bf6378dfc286edc7feea3f00e14ca8877935837544f4bcc8fbb289a82736","afterHash":"fe96ae350a5e7bad87f6882299b035402586c2a7839238112fe585007fba2bb9","starterIncluded":false,"fields":{"targetMeaningZh":"有能力的；能勝任的","chapterMeaningsZh":"有能力的；能勝任的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"377777e129cf2ff745dc0f0b409c999311816c5908cdbbb05a366cf0dd6061cd","chapterMeaningsZh":"377777e129cf2ff745dc0f0b409c999311816c5908cdbbb05a366cf0dd6061cd","meaningSource":"377777e129cf2ff745dc0f0b409c999311816c5908cdbbb05a366cf0dd6061cd"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V120","key":"learningItemId","beforeHash":"6f191af28e3936553c63542c96f70afe3f574e3038e55deffdf98b7ff1bd5552","afterHash":"0395e1bf0f5d3afdf7eae48040db41df754ce8d9f2ce2bb7594db6175a27ad64","starterIncluded":false,"fields":{"targetMeaningZh":"能力；稱職","chapterMeaningsZh":"能力；稱職","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"9cc531a644e9b3dde953c771512cc655fe7825e4b56a9ba97270e7140b39293e","chapterMeaningsZh":"9cc531a644e9b3dde953c771512cc655fe7825e4b56a9ba97270e7140b39293e","meaningSource":"9cc531a644e9b3dde953c771512cc655fe7825e4b56a9ba97270e7140b39293e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V121","key":"learningItemId","beforeHash":"e2405e8f25174ff10aa6d04be6ca3eb2d5041d5d32c6228b4d061b3806edb56e","afterHash":"7e71717ef5bf0ddcbfef37259f6b11843b0ef4a0917a368c88ca43dafb179e0c","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"綠豆","chapterMeaningsZh":"綠豆","meaningSource":"textbook_source_review"},"sources":{"sensePos":"2679765587a5bdb0a5b8fc7e2b11da780b6c75b7f48c8e91170d7cbc4712691e","targetMeaningZh":"2679765587a5bdb0a5b8fc7e2b11da780b6c75b7f48c8e91170d7cbc4712691e","chapterMeaningsZh":"2679765587a5bdb0a5b8fc7e2b11da780b6c75b7f48c8e91170d7cbc4712691e","meaningSource":"2679765587a5bdb0a5b8fc7e2b11da780b6c75b7f48c8e91170d7cbc4712691e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V123","key":"learningItemId","beforeHash":"5845459500d90652e47bd2b2dbcfd9cadd2866c5ff63ca88d03895a4f34295d5","afterHash":"e1a9917feed9f5101858249fb1c9893c9612800c3fd266a574cb98a18a79eb7c","starterIncluded":false,"fields":{"sensePos":"n.","targetMeaningZh":"紅豆","chapterMeaningsZh":"紅豆","meaningSource":"textbook_source_review"},"sources":{"sensePos":"6abc950e1284d5c50c3a9a360ef0df8ab8e5242c41417e08a7e2c08cb09d8eb0","targetMeaningZh":"6abc950e1284d5c50c3a9a360ef0df8ab8e5242c41417e08a7e2c08cb09d8eb0","chapterMeaningsZh":"6abc950e1284d5c50c3a9a360ef0df8ab8e5242c41417e08a7e2c08cb09d8eb0","meaningSource":"6abc950e1284d5c50c3a9a360ef0df8ab8e5242c41417e08a7e2c08cb09d8eb0"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V124","key":"learningItemId","beforeHash":"0484d135674619f17fd751fa08b6110fd9c4aa279784473a300c35d5c07fb832","afterHash":"4510d16d64f782ae15f22378ceba65cf9a36a76f9a5708b94c4b7d9ae7a2b7ca","starterIncluded":false,"fields":{"targetMeaningZh":"省；州","chapterMeaningsZh":"省；州","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"bd923fdd34124122fffe44447bb12bd62e172bdea8b4cc882dcf0e70e8002749","chapterMeaningsZh":"bd923fdd34124122fffe44447bb12bd62e172bdea8b4cc882dcf0e70e8002749","meaningSource":"bd923fdd34124122fffe44447bb12bd62e172bdea8b4cc882dcf0e70e8002749"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V126","key":"learningItemId","beforeHash":"c80f165337ddd3b0f44cb451640e1f12e8c57578c9d5543975a7c11d3e790fea","afterHash":"f1d79eb4d4f43e066833d277439223e0265e1ac1dd30e3a6ee034a7d0e8aa346","starterIncluded":false,"fields":{"targetMeaningZh":"笨拙的","chapterMeaningsZh":"笨拙的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"ab004ecefb9e140e0ab7fe29b140e0f15cbe84acd067c93251bb684414750677","chapterMeaningsZh":"ab004ecefb9e140e0ab7fe29b140e0f15cbe84acd067c93251bb684414750677","meaningSource":"ab004ecefb9e140e0ab7fe29b140e0f15cbe84acd067c93251bb684414750677"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V128","key":"learningItemId","beforeHash":"182df981188af89f1ba27b7752e5f05630591a3a05d1e4b88951edeed552180d","afterHash":"c06fcce9429c44ac9dfe7d914c7ee92989fcd72173b0708c5ff4646c8de28e9f","starterIncluded":false,"fields":{"targetMeaningZh":"多才多藝的","chapterMeaningsZh":"多才多藝的","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"2a988f0c1659f023ea082f3ddf1003f131c195553b304dab8361c32b03931abb","chapterMeaningsZh":"2a988f0c1659f023ea082f3ddf1003f131c195553b304dab8361c32b03931abb","meaningSource":"2a988f0c1659f023ea082f3ddf1003f131c195553b304dab8361c32b03931abb"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V129","key":"learningItemId","beforeHash":"bb15f7091964c6f78e7b5f919e488e5bdc8dbda6d5d38d3fb9c25e28188bc898","afterHash":"6e2285c5b6685820787265fb95a12f5f52061f9d1982ed9a35a4280239ef058c","starterIncluded":false,"fields":{"sensePos":"adj.","targetMeaningZh":"有組織的","chapterMeaningsZh":"有組織的","meaningSource":"textbook_source_review"},"sources":{"sensePos":"30645f671eb0665b28927ccebf5e36a0ce374c0cc99bf5c94fe35a3266f737a6","targetMeaningZh":"30645f671eb0665b28927ccebf5e36a0ce374c0cc99bf5c94fe35a3266f737a6","chapterMeaningsZh":"30645f671eb0665b28927ccebf5e36a0ce374c0cc99bf5c94fe35a3266f737a6","meaningSource":"30645f671eb0665b28927ccebf5e36a0ce374c0cc99bf5c94fe35a3266f737a6"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V130","key":"learningItemId","beforeHash":"abf93f39581445cf6bad438694c0be55018cadd186de7caa82d8c6744fedcf4b","afterHash":"f5f9dd2d1f7c3bc50cc2fbaaa42b70bad2e2c2328fc1924d838c40db4a748a14","starterIncluded":false,"fields":{"targetMeaningZh":"組織者；主辦人","chapterMeaningsZh":"組織者；主辦人","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"6bd791517fa0da90ddd38fe25eabdeec461ef0081810bca3d56be7f742e68b8e","chapterMeaningsZh":"6bd791517fa0da90ddd38fe25eabdeec461ef0081810bca3d56be7f742e68b8e","meaningSource":"6bd791517fa0da90ddd38fe25eabdeec461ef0081810bca3d56be7f742e68b8e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-V132","key":"learningItemId","beforeHash":"7573c318cc88de0b506636d29b6d1b751a0d9716232c353ebdc2f828252cff87","afterHash":"46a78b160aed4f16ccd7b2c86e9bfc79d9cd43c0e4f6ba6186a18d225e1495c0","starterIncluded":false,"fields":{"targetMeaningZh":"假定","chapterMeaningsZh":"假定","meaningSource":"textbook_source_review"},"sources":{"targetMeaningZh":"1a122cca8f16deffdba409102c9e2ad8b4e791efb344dbc0695f301a49dece39","chapterMeaningsZh":"1a122cca8f16deffdba409102c9e2ad8b4e791efb344dbc0695f301a49dece39","meaningSource":"1a122cca8f16deffdba409102c9e2ad8b4e791efb344dbc0695f301a49dece39"}},
  {"dataset":"words","id":"W000650","key":"wordId","beforeHash":"f9bf6333db603e58b3932136f932061690f4036054b7c6ee5f4362d56d2540d8","afterHash":"9fda507e5c669ce0b950864d286c60a3996f026468ffe5627de327fdf490d796","starterIncluded":true,"fields":{"meaningZh":"地方；地點；位置；住所；（動詞）放置"},"sources":{"meaningZh":"a7f61831126990af391485212d56c4264e9067a178b7743392815e73ff7ea80b"}},
  {"dataset":"words","id":"W002050","key":"wordId","beforeHash":"bcbba6f7d100525ba51d2f6fff40018e8f9588b9f9400cc64c2f732be8d820ce","afterHash":"2aceb7bf6e2c8d17b199ec0f8d1824cdb830f7410213630f6fd82be2e3d3ae02","starterIncluded":true,"fields":{"pos":"adj./n.","posAll":["adj.","n."],"meaningEn":"operating with minimal human intervention; independent of external control; resembling the unthinking functioning of a machine; as a noun, an automatic firearm or machine."},"sources":{"pos":"ef8d09d80fac1fd4c95278a7dd4b401c2f7f38a90f54951f8821019874911c15","posAll":"ef8d09d80fac1fd4c95278a7dd4b401c2f7f38a90f54951f8821019874911c15","meaningEn":"ef8d09d80fac1fd4c95278a7dd4b401c2f7f38a90f54951f8821019874911c15"}},
  {"dataset":"words","id":"W002058","key":"wordId","beforeHash":"42585bbec5357346366fd3a80b5e172f37bb14fcd61e4b541b85e7a1ce5f02b4","afterHash":"67add494b0ffcbef7fc8734eaa87afbe36acb8bacdc246aee388024725cebc78","starterIncluded":true,"fields":{"meaningZh":"笨拙的；棘手的；不熟練的；令人尷尬的"},"sources":{"meaningZh":"20acf42ee3fb996102ab6b53d94173759aa74c0fde86f596180135f5c37b17a4"}},
  {"dataset":"words","id":"W002192","key":"wordId","beforeHash":"64bc940c065a921c8e714dce5832b10fdba953a7c1ed690a9bf34e3712a3d1ed","afterHash":"484a5cec2884a4f848350e94a539fec70530a61aa41c346eb5a030d3971ef570","starterIncluded":true,"fields":{"meaningEn":"someone who maintains and audits business accounts; a person who directs and restrains; a device used to control a machine."},"sources":{"meaningEn":"55356a70a22b2d6ffff01a20ff3b2042aa7fb321e36640c3020415599a2e7b8e"}},
  {"dataset":"words","id":"W002182","key":"wordId","beforeHash":"888ecb9a58f567685559d9dc063194632cf98f3cf1b71d4fb78e4043a287f13a","afterHash":"9952e2801104324b551105e0d845b8751a392e8577e46bfe3ad871021b9715f3","starterIncluded":true,"fields":{"meaningEn":"a performance of music given in public; agreement or coordinated action, especially in in concert with."},"sources":{"meaningEn":"e812ce9bc443b35fa4db5688a5b5a5488ed72c39a846525a2b6971e322252a61"}},
  {"dataset":"words","id":"W002684","key":"wordId","beforeHash":"4c3ee23e981e48670dadeef6ccef36b6d63ce7417dab6c595babf0b887833c06","afterHash":"852e539fa697716708c765f167aafa19efe1a38a34dca39bcaf321d388cd9a76","starterIncluded":true,"fields":{"pos":"n./adj.","posAll":["n.","adj."],"meaningZh":"證據；證明；試驗；檢驗；（形容詞）防……的；能抵抗……的","meaningEn":"facts, documents, or other information that show something is true; also a test of whether an article or substance meets the required quality. As an adjective, resistant to damage or effects, especially in proof against."},"sources":{"pos":"72ba373998fb4ff2826e5da3995230d47171dc6da352b141e749d6952fb41fc1","posAll":"72ba373998fb4ff2826e5da3995230d47171dc6da352b141e749d6952fb41fc1","meaningZh":"72ba373998fb4ff2826e5da3995230d47171dc6da352b141e749d6952fb41fc1","meaningEn":"72ba373998fb4ff2826e5da3995230d47171dc6da352b141e749d6952fb41fc1"}},
  {"dataset":"words","id":"W005708","key":"wordId","beforeHash":"15bcdecfd06f50dd62203f1b28f75bc50489def944bb3c90d30005bd2b071701","afterHash":"827ee3da069c15aaaebae039c2505271c16cf1cc46ea5f7bf98af40183c66c92","starterIncluded":true,"fields":{"pos":"n./v.","posAll":["n.","v."],"meaningZh":"探索；調查；探針；探測器；（動詞）調查；探查","meaningEn":"an inquiry into unfamiliar or questionable activities; a flexible slender surgical instrument with a blunt end that is used to explore wounds or body cavities; as a verb, investigate carefully or examine with a probe.","usagePattern":"a probe into N; probe into N; probe N","usagePatternZh":"對……的調查；深入調查……；探查……","verbForms":{"base":"probe","past":"probed","pastParticiple":"probed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/probe","status":"approved"}},"sources":{"pos":"a787dd690b4f0dba67b7c0a9dfb00b791d060ebac6f6c44240c63dac488e2069","posAll":"a787dd690b4f0dba67b7c0a9dfb00b791d060ebac6f6c44240c63dac488e2069","meaningZh":"a787dd690b4f0dba67b7c0a9dfb00b791d060ebac6f6c44240c63dac488e2069","meaningEn":"a787dd690b4f0dba67b7c0a9dfb00b791d060ebac6f6c44240c63dac488e2069","usagePattern":"a787dd690b4f0dba67b7c0a9dfb00b791d060ebac6f6c44240c63dac488e2069","usagePatternZh":"a787dd690b4f0dba67b7c0a9dfb00b791d060ebac6f6c44240c63dac488e2069","verbForms":"6b63fe9d513b76fb74e5177f0601024d860fccb70a807d021a6517ef292ef88f"}},
  {"dataset":"words","id":"W002850","key":"wordId","beforeHash":"54ae634e1c0c96e783f8260c1148d629fe5a7d447e54ef149e1fce92999247ab","afterHash":"38c128ab08061e3ef35c0d1b870d37feed07870b6fc11ccba6d022fd5132daf2","starterIncluded":true,"fields":{"meaningZh":"騷動；轟動；攪動；監獄；（動詞）攪拌；激起","meaningEn":"a prominent or sensational but short-lived news event; emotional agitation and excitement; as a verb, mix a liquid or other substance by moving it around, or cause trouble or emotion.","usagePattern":"stir N; stir up trouble; cause a stir","usagePatternZh":"攪拌……；惹麻煩；引起騷動","verbForms":{"base":"stir","past":"stirred","pastParticiple":"stirred","sourceRef":"https://www.collinsdictionary.com/conjugation/english/stir","status":"approved"}},"sources":{"meaningZh":"b8dea65768c8eb23d2e26a9a4e1ce47899c64d1a50b765f42c22718b481d31d6","meaningEn":"b8dea65768c8eb23d2e26a9a4e1ce47899c64d1a50b765f42c22718b481d31d6","usagePattern":"b8dea65768c8eb23d2e26a9a4e1ce47899c64d1a50b765f42c22718b481d31d6","usagePatternZh":"b8dea65768c8eb23d2e26a9a4e1ce47899c64d1a50b765f42c22718b481d31d6","verbForms":"954cba879b0a06b732e9fd45d3fe4afd3e90732781718603f72f8474c10f4ce0"}},
  {"dataset":"words","id":"W002803","key":"wordId","beforeHash":"4635267959116ceec8470bfa59aceae4c6038cffe85c95966210b15848b1b175","afterHash":"cd68dfa958de0e7d4113ebb685379655e48c28d6c2f9017cc717f465a18bc328","starterIncluded":true,"fields":{"usagePattern":"sip N; take a sip of N","usagePatternZh":"啜飲……；小喝一口……","verbForms":{"base":"sip","past":"sipped","pastParticiple":"sipped","sourceRef":"https://www.collinsdictionary.com/conjugation/english/sip","status":"approved"}},"sources":{"usagePattern":"a282999d6b5e54d5f0d2deed5c07b87b51d44b251ce09661c81d1718f0615e30","usagePatternZh":"a282999d6b5e54d5f0d2deed5c07b87b51d44b251ce09661c81d1718f0615e30","verbForms":"5d73c692032fb9f05bad18b130ed831df15b0f8c773052cbacb3bf5b33428e9b"}},
  {"dataset":"words","id":"W002657","key":"wordId","beforeHash":"2662a012be02781d66efbd739e4cd7513acc4a6c27d37a80e278604d414b10f5","afterHash":"382253df3f483c6b539497eb02c2f22eef83530ffe2c20ea834a4f674fd87dff","starterIncluded":true,"fields":{"meaningZh":"投票；民意測驗；選舉投票；投票數；（動詞）對……做問卷調查","meaningEn":"an inquiry into public opinion conducted by interviewing a random sample of people; the part of the head between the ears; as a verb, ask people questions to find out their opinions.","usagePattern":"conduct a poll; poll people about N","usagePatternZh":"進行民調；就……訪問民眾意見","verbForms":{"base":"poll","past":"polled","pastParticiple":"polled","sourceRef":"https://www.collinsdictionary.com/dictionary/english/poll","status":"approved"}},"sources":{"meaningZh":"1302bb1a325df5a8c1f69cd5bee884f716cfbf5ad097ce06bd573c7a8778ab8a","meaningEn":"1302bb1a325df5a8c1f69cd5bee884f716cfbf5ad097ce06bd573c7a8778ab8a","usagePattern":"1302bb1a325df5a8c1f69cd5bee884f716cfbf5ad097ce06bd573c7a8778ab8a","usagePatternZh":"1302bb1a325df5a8c1f69cd5bee884f716cfbf5ad097ce06bd573c7a8778ab8a","verbForms":"c196d5dd51f5f73b7cd59c86ddca63d3372989f6f734f9f2792ded1e9765dd86"}},
  {"dataset":"words","id":"W002683","key":"wordId","beforeHash":"fc29b6991ff77bec4fe70d7a5f6096d31efbf2a5243f095022a948b3b4ef09a1","afterHash":"d7296763c9a976dba1873562bf5ee2a651afd8620697faf8868fcc513a2ed883","starterIncluded":true,"fields":{"usagePattern":"pronounce a word/name; pronounce sb man and wife; pronounce judgment on N","usagePatternZh":"讀出單字／姓名的發音；宣布某人成為夫妻；對……作出判決","verbForms":{"base":"pronounce","past":"pronounced","pastParticiple":"pronounced","sourceRef":"https://www.collinsdictionary.com/conjugation/english/pronounce","status":"approved"}},"sources":{"usagePattern":"72a4da5e72d33a43bd7a98f520b353935bed70a79877a564fe935e872724e434","usagePatternZh":"72a4da5e72d33a43bd7a98f520b353935bed70a79877a564fe935e872724e434","verbForms":"bb2dadbceb160d8863717ee5ce72701226434ec836adc38e4c7062649f666ffa"}},
  {"dataset":"words","id":"W004537","key":"wordId","beforeHash":"4a86b2cb2edc6138e5ac45df0554e0afd834ab9e2b7155a16eef99c40ecae026","afterHash":"a4f1eb3ae5e06c13c7e9381b7d31dc8699b18ca002fdc4db28d48ddb6a03fc68","starterIncluded":true,"fields":{"usagePattern":"in the meantime; meantime, S + V","usagePatternZh":"在此期間／同時；同時，……"},"sources":{"usagePattern":"0a523b7e96ab515fa0320187da0b89464d1a8c7d2bb1c61a9b3df565aa8c3e17","usagePatternZh":"0a523b7e96ab515fa0320187da0b89464d1a8c7d2bb1c61a9b3df565aa8c3e17"}},
  {"dataset":"words","id":"W004731","key":"wordId","beforeHash":"0b65adc0a7fbfa761b5b2166d7bb85776fcd5e30dedbb2831b10065de5c718a0","afterHash":"a8ef569c92b22ac3a0c244ebb005a5d4cf8137a76a35036c4234512f04fb8375","starterIncluded":true,"fields":{"usagePattern":"bear a resemblance to N","usagePatternZh":"與……相似"},"sources":{"usagePattern":"8772c4c19a539854d0a12e447c529bfbe16ef638232d79d512a662f0f7c95826","usagePatternZh":"8772c4c19a539854d0a12e447c529bfbe16ef638232d79d512a662f0f7c95826"}},
  {"dataset":"words","id":"W003831","key":"wordId","beforeHash":"b0ac1e86a377c3546d5e8aa6991758b5fcc68597fc405caad42628a06104d881","afterHash":"e2bf7c70266edcc1f96597a9da1f0e8f65df7cbd3a8c19be7fe3e758b5fa9575","starterIncluded":true,"fields":{"meaningEn":"Rest or relief from tension; a reduction in strictness. (physiology) the gradual lengthening of inactive muscle or muscle fibers; (physics) the exponential return of a system to equilibrium after a disturbance","usagePattern":"relaxation; relaxation of rules","usagePatternZh":"放鬆休息；規則的放寬"},"sources":{"meaningEn":"f379e529781c0371ad5480b77232a1d3daef60d0c0e20c13b0645fb71f1018ca","usagePattern":"f379e529781c0371ad5480b77232a1d3daef60d0c0e20c13b0645fb71f1018ca","usagePatternZh":"f379e529781c0371ad5480b77232a1d3daef60d0c0e20c13b0645fb71f1018ca"}},
  {"dataset":"words","id":"W005971","key":"wordId","beforeHash":"d3a7216a1d818909b8cc8c3c2e813c0ac81ab9ee61c90ecca4383a5c722ff0f2","afterHash":"6e239110f7d2ed160708535566b830a11d431731bfbcc91a881088c062298945","starterIncluded":true,"fields":{"meaningEn":"Able to perform many kinds of tasks or serve many purposes; having great diversity or variety; changeable or inconstant"},"sources":{"meaningEn":"eed3d55b92e65070b6d3a41db052195cb8c9375c0746dab5129a838736016363"}},
  {"dataset":"words","id":"W004185","key":"wordId","beforeHash":"6d38cdaa52f2f87a76b97c9a7ed180dde5930bf8fe6808c245a455a9cfecca62","afterHash":"caf0c164b27f9ea7545740ef2b3b06bdaf88d8560279dd9a87f153209bb88167","starterIncluded":true,"fields":{"meaningZh":"勝任；稱職；能力；活性","usagePattern":"professional competence; competence as N","usagePatternZh":"專業能力；作為……的能力"},"sources":{"meaningZh":"a0d745dec6440e513202397a3e8049c69b6a57c5b636cfedda666e8616fd2226","usagePattern":"a0d745dec6440e513202397a3e8049c69b6a57c5b636cfedda666e8616fd2226","usagePatternZh":"a0d745dec6440e513202397a3e8049c69b6a57c5b636cfedda666e8616fd2226"}},
  {"dataset":"words","id":"W002919","key":"wordId","beforeHash":"7e573917cde42be8ae1ee575d02e7e7961720f18d2b27760d7a6c7df3f7954e0","afterHash":"8ec545abe0c88ac64d0ea832b83e40612e4bf6d0602922f067788bb9ccbf3976","starterIncluded":true,"fields":{"meaningZh":"噸；（非正式）許多","usagePatternZh":"許多……／好幾噸的……；重達一噸"},"sources":{"meaningZh":"b5d408e2d094dfb54510d91ca7c39b8d68d96b33a51670ec27ccd7f749108d4a","usagePatternZh":"b5d408e2d094dfb54510d91ca7c39b8d68d96b33a51670ec27ccd7f749108d4a"}},
  {"dataset":"examples","id":"EX62626e59","key":"exampleId","beforeHash":"29c3c44fefbd8c21832c9e68b0cfb542ee9d91f89b6952ced7b4ec131537a506","afterHash":"73e5b3f0a334271c91cf9c760334df0060dff67478b5ce11383bc988c21c90b8","starterIncluded":true,"fields":{"sensePos":"v.","meaningHint":"排名；名列（rank among）"},"sources":{"sensePos":"36c0723c2517145bf2ed0f01c4072f2822c11fd6c8a389be99693fa56de61f6a","meaningHint":"36c0723c2517145bf2ed0f01c4072f2822c11fd6c8a389be99693fa56de61f6a"}},
  {"dataset":"examples","id":"EX63465617","key":"exampleId","beforeHash":"14b320753d30db5c250ef050f56646095f94fd6a4b6befc79d175cfc1533dc56","afterHash":"14bd695f930ea10feb0726e831b09c4c8e5697fd2e870fc250b0e132879eb861","starterIncluded":true,"fields":{"sensePos":"n.","meaningHint":"軍階；等級"},"sources":{"sensePos":"86b3d15b6cc654f934e1ba5c14c56253392dd568feafbf8a009a7cac0d667edb","meaningHint":"86b3d15b6cc654f934e1ba5c14c56253392dd568feafbf8a009a7cac0d667edb"}},
  {"dataset":"examples","id":"EXa6eb5ff7","key":"exampleId","beforeHash":"8ece54401757b661ece069b62146e4b8b2d64c6651ab84dc95d9a0d56b463452","afterHash":"299f43db1549edd915ad7627ede3b62763592aaba7a24a7c584e6ad82a5dabaa","starterIncluded":true,"fields":{"sensePos":"v.","meaningHint":"下訂單（place an order）"},"sources":{"sensePos":"036a8c24ad761319559c42302cee3e4bdc9008f1dc20bbf67e2d48c5c8faa971","meaningHint":"036a8c24ad761319559c42302cee3e4bdc9008f1dc20bbf67e2d48c5c8faa971"}},
  {"dataset":"examples","id":"EXb0f8ed50","key":"exampleId","beforeHash":"9cafbeac06ea1fd2db75061410c88e9eb48d48fd158a66d032a256f0c2ecc784","afterHash":"99b7e4c7dfa0d9563926b8dda039bdba79ab04b8f0247bbd2e3778ff163919b5","starterIncluded":true,"fields":{"sensePos":"n.","meaningHint":"發生；舉行（take place）"},"sources":{"sensePos":"44ee595f3f269ec4ea7850060683fd92eb0abb25eb66a401f4115efe1e6559b6","meaningHint":"44ee595f3f269ec4ea7850060683fd92eb0abb25eb66a401f4115efe1e6559b6"}},
  {"dataset":"examples","id":"EXb21fe1db","key":"exampleId","beforeHash":"308754b6306bdb9ea86d73efe5670baef5ef8fc3e47f90eb345b0bfb47b0d22b","afterHash":"f564b6867c8b3e7343c9846a7ac6bd6201a7ab6ccf6fd7d9de97febb280a0330","starterIncluded":true,"fields":{"sensePos":"v.","meaningHint":"放置"},"sources":{"sensePos":"7332466181c09a5f656657078b84cfc267c262d6fc677a703db2c08e5f647a67","meaningHint":"7332466181c09a5f656657078b84cfc267c262d6fc677a703db2c08e5f647a67"}},
  {"dataset":"examples","id":"EXbdaf4695","key":"exampleId","beforeHash":"46f5f4ae1de71ed3dca84227161fb13fc550f4b1b1da6599f2cbf425f136b9be","afterHash":"a5e64217f5f3bf7445364e759aa8bd5cebdf9b07aafd26ce525435460ed83eb8","starterIncluded":true,"fields":{"sensePos":"n.","meaningHint":"地方；居住地"},"sources":{"sensePos":"c81283bbcbe58aa175f16d23f87278e5397f25e4d17cbc9e34ac32bf81792534","meaningHint":"c81283bbcbe58aa175f16d23f87278e5397f25e4d17cbc9e34ac32bf81792534"}},
  {"dataset":"examples","id":"EXc487aac6","key":"exampleId","beforeHash":"e79fa77589cc2f8b5975d91febaff20b3c33158147716673995ef4acf2bae79c","afterHash":"8f7a43ea1c2abe99afc31947fd80348afe88b9084bb37ae2f6ecbf415d841a71","starterIncluded":true,"fields":{"sensePos":"v.","meaningHint":"重視（place importance on）"},"sources":{"sensePos":"b466b4a8931d2832f37fc619c29277f431f3c9f56b75d33c9f8278696c78c5c6","meaningHint":"b466b4a8931d2832f37fc619c29277f431f3c9f56b75d33c9f8278696c78c5c6"}},
  {"dataset":"examples","id":"EXf6773d2c","key":"exampleId","beforeHash":"f54b85a1efb937818e65360b2bc189cbd2ce5279cbabb301cc7b6fdb41ea516f","afterHash":"2b83195091cc838177d198ccf662b1debf63fd07b2a2da1044fffaa4944047c4","starterIncluded":true,"fields":{"sensePos":"v.","meaningHint":"調查；向顧客詢問"},"sources":{"sensePos":"de6ebb87d41251342ecfb706b3149df478dbf498f3663cfb44154a6ced2b777b","meaningHint":"de6ebb87d41251342ecfb706b3149df478dbf498f3663cfb44154a6ced2b777b"}},
  {"dataset":"examples","id":"EXf8a60d1a","key":"exampleId","beforeHash":"9ee8eee62a2ce57952dad60fa673184fcac517537027f8c241023b3282c7c1ba","afterHash":"56ca12a16272e619b730cdf4c6b593d09ae7d388745f4f0de0028074282cbd98","starterIncluded":true,"fields":{"sensePos":"n.","meaningHint":"某人的家（someone's place）"},"sources":{"sensePos":"b8f22cd93c300d0947442e53c7c477d30ccf7a5121cf327bac698bbee413aaf0","meaningHint":"b8f22cd93c300d0947442e53c7c477d30ccf7a5121cf327bac698bbee413aaf0"}},
  {"dataset":"examples","id":"EXfcb935f2","key":"exampleId","beforeHash":"649a3706ce94f7956058e5a65d09f635f69e5914c7621f8c24220c32faf3410a","afterHash":"47132089fa0e150ab5b82738820839c269c10a9814f4eb810d3332c7ab596a67","starterIncluded":true,"fields":{"sensePos":"n.","meaningHint":"名次（second place：第二名）"},"sources":{"sensePos":"fa78dc19641a4fb4d801fc5e5c3c871f47b84aca98d99a27d2f498479ee85a31","meaningHint":"fa78dc19641a4fb4d801fc5e5c3c871f47b84aca98d99a27d2f498479ee85a31"}},
  {"dataset":"words","id":"W001787","key":"wordId","beforeHash":"2e8ddf4d8661e9177da42b53bd688469244495cbd626d5eb36e5723c75559010","afterHash":"ce880bf1dbf54e5f23d230716c329a35ba44a406a81af31037d4bf36a271d2b3","starterIncluded":true,"fields":{"verbForms":{"base":"shine","past":"shone / shined","pastParticiple":"shone / shined","sourceRef":"https://www.collinsdictionary.com/dictionary/english/shine","status":"approved"},"usagePatternZh":"太陽照耀；擦亮鞋子；有光澤。三態義別：照耀／發光通常用 shone－shone，美式英語也用 shined－shined；擦亮／磨光通常用 shined－shined。"},"sources":{"verbForms":"30390ac72ab8d10abea885f74545025baec96da027b95a44a38931f4e1573a86","usagePatternZh":"863741d59e6004d49d47abb5ff43e9a296da30bcda01860badc6381465807dbe"}},
  {"dataset":"words","id":"W002044","key":"wordId","beforeHash":"23a7a1717bf0d56b04535015c324de58b1885cd344c68eb8102c41d3ce96e2a3","afterHash":"877bf3f74010ee3759074ad2bf297355969698da6457bac25a24c5c53c262676","starterIncluded":true,"fields":{"verbForms":{"base":"assume","past":"assumed","pastParticiple":"assumed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/assume","status":"approved"},"meaningEn":"to think that something is true although you have no definite proof; also to take on a responsibility or role."},"sources":{"verbForms":"fc25356064971bb9e28457157a4eefe11da864c65e343edc69795d68c2db1964","meaningEn":"f082f7657bf39edbd0826e1c4bfd067b5e7f51edf58c73c9f18c93b219caa933"}},
  {"dataset":"words","id":"W002179","key":"wordId","beforeHash":"78cf810b3cf255a86e5c310db7eb6dd46ecc7108edd98eca95ce70a96b1d4b8a","afterHash":"32863a2ab16ab1e97164ac417560e3cfb5e838a518b35e0e90e97525bb8fa7ff","starterIncluded":true,"fields":{"verbForms":{"base":"compete","past":"competed","pastParticiple":"competed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/compete","status":"approved"}},"sources":{"verbForms":"cc0f1be8e30fdfcd3bf329b8a902e292c473d278f05308961f8194027d4c55d5"}},
  {"dataset":"words","id":"W002603","key":"wordId","beforeHash":"ede79bd118165cff52dcf3d6d61a22b06818a5523b2b3f86276af3009af0e16c","afterHash":"913ac098bbc7ae781aef490d7635c4ca2cabf99d2168c3aea579162703954edd","starterIncluded":true,"fields":{"verbForms":{"base":"owe","past":"owed","pastParticiple":"owed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/owe","status":"approved"}},"sources":{"verbForms":"314f2528e2ef1a6e2224cdd1d201ce4a9d88034ba33567db57230cab41c8c737"}},
  {"dataset":"words","id":"W002698","key":"wordId","beforeHash":"cd1d6a727bf3fc78bab2e8241cfab65b5c49c50cdf1c677230a09e65db11de10","afterHash":"e0327925e121ecaa0966be7ffcfb3524b302005581a60d5be058eb38aabba718","starterIncluded":true,"fields":{"verbForms":{"base":"rank","past":"ranked","pastParticiple":"ranked","sourceRef":"https://www.collinsdictionary.com/conjugation/english/rank","status":"approved"},"meaningZh":"等級；排；橫列；隊伍；（動詞）排名"},"sources":{"verbForms":"b3f88a81891b5d55e3d519a2911965aec7607f77a9d6fa73a6657a8d0624566b","meaningZh":"9c8b524e0abd7e4655a8b81c95cac1498dca4a258e10a682b03828305e7ec336"}},
  {"dataset":"words","id":"W002714","key":"wordId","beforeHash":"66fb9a0b3b99baa9f251ca2bc2109c337113154510044b4acf026923a0a11bfc","afterHash":"14c14e5937c9103df6592a1ca411ccbf5570d75b1f0aa8bb2693c76076f0329c","starterIncluded":true,"fields":{"verbForms":{"base":"relax","past":"relaxed","pastParticiple":"relaxed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/relax","status":"approved"}},"sources":{"verbForms":"ed754b305eb648afde215156f52d358f50b28517cb2a75d0c24a87c00c909bff"}},
  {"dataset":"words","id":"W002876","key":"wordId","beforeHash":"f30f7fad6ec951a81a97fc07f02362545530395200a54cd530f06a7ac0aaebe1","afterHash":"19c1b9f55028b2b3cdf24033ba0ed38931231527e6fc62fd95ae663fe64a7661","starterIncluded":true,"fields":{"verbForms":{"base":"survey","past":"surveyed","pastParticiple":"surveyed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/survey","status":"approved"},"meaningZh":"縱覽；視察；測量；俯瞰；調查；勘察"},"sources":{"verbForms":"48d522d5abe126dac033a5bcef2400796590190b663bb45b09570bba23788140","meaningZh":"ebb5dbc0568688816b15044f3697f3e58b93aa1216e826aca182945d585ce020"}},
  {"dataset":"words","id":"W003372","key":"wordId","beforeHash":"d792be550d31fc2e1d9c1ccef20adf6a1b87acc20b7b4004c7cada64cb87e216","afterHash":"aa59318f7a7608bc6df75db17d96b3b80f97b029053b32bed5c7f6792ca76155","starterIncluded":true,"fields":{"verbForms":{"base":"evidence","past":"evidenced","pastParticiple":"evidenced","sourceRef":"https://www.collinsdictionary.com/conjugation/english/evidence","status":"approved"},"meaningEn":"facts, signs, or objects that make you believe something is true; as a verb, show or provide evidence of something."},"sources":{"verbForms":"59f3b1e0cd62581ef919a0a71e22a78e0327729016a076c69df602395e4506d3","meaningEn":"59f3b1e0cd62581ef919a0a71e22a78e0327729016a076c69df602395e4506d3"}},
  {"dataset":"words","id":"W002965","key":"wordId","beforeHash":"90aa4462181f7789dd3195a45145627a5acb7878de27d1b442a54ab5fa617ce2","afterHash":"882008c96e5137276cc2cd4719d405c98377772710e3fcdf7f659bc7d71afb89","starterIncluded":true,"fields":{"meaningEn":"physical force that is used to hurt, damage, or kill; also great intensity or force, as of a storm."},"sources":{"meaningEn":"af61035194e1704d311830a7a0e7a664c44aa7a969436f695766bd11801b265a"}},
  {"dataset":"examples","id":"EXc01eb112","key":"exampleId","beforeHash":"b438386d06cf15f52e7805fa103e4c6a8f2312a7d544e3ae46d2331bbed54343","afterHash":"2a25130a35277e3ed71284be5dc6c003e46193cec5ca91d1c95c052b5510fe18","starterIncluded":true,"fields":{"sensePos":"adj.","meaningHint":"相互競爭的；相互抗衡的（competing 作形容詞，修飾 theories）"},"sources":{"sensePos":"6f42b3548f06fed8feb20ed48a77bc53371ce3f2f98734aad3feb703b55c48ee","meaningHint":"6f42b3548f06fed8feb20ed48a77bc53371ce3f2f98734aad3feb703b55c48ee"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G001","key":"learningItemId","beforeHash":"65727b126c3396e79e7fb782c293454e1d56915f02262d9788a2b216fda85f5c","afterHash":"791bb5cc1d7123c1a876b9efa38a5b45e68f5b1a87791f56b60bccc926acda11","starterIncluded":false,"fields":{"explanationZh":"an electric appliance 指一件家用電器，如冰箱或電視機。"},"sources":{"explanationZh":"39511a5aadab1a0fe28a4c4cd3d441fdc90b9bb8d9fd3071d5975d56ce001ac0"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G002","key":"learningItemId","beforeHash":"2e055b1d77b78837ccd7a9e8ed945f31bea1ecb89eb7c7ed0eb9754bbe9108c1","afterHash":"77d82970aa168379413f12056608d22e4cf59df177b24298f5951405f4cfff91","starterIncluded":false,"fields":{"explanationZh":"the rank and file 指機構或部隊的基層成員。"},"sources":{"explanationZh":"dffdb861c4d4d0894d3d12a92fed9f6d9ae1436a9b6aa5c11800c2de753fb721"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G003","key":"learningItemId","beforeHash":"4c74b46477ec21b42b6c773571bcc8d819f900c961943d1c8e60b2a40b429e1f","afterHash":"ee26e98536e13318dde5db7d3d96df12ba53a7015c2638b9d3307e99f49bd634","starterIncluded":false,"fields":{"explanationZh":"have a rough idea of sth 表示對某事略知一二、大致了解。"},"sources":{"explanationZh":"51a8d6b41d7afec3c81cc1610461582bfa4cd3edd8abb217e2a5bb27d0d1b0ec"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G004","key":"learningItemId","beforeHash":"9c0cddc6d306e03d9354255e210062a0b4bfb9ff048a686a083b9e317558762c","afterHash":"00328a983790163c7ead41cefeea4c8d90564d7601cc76dc802818673c57c596","starterIncluded":false,"fields":{"explanationZh":"be rough on sb 表示對某人很兇，可與 be hard on sb 對照學習。"},"sources":{"explanationZh":"89ba709f3fb95f425c0dfb13098ae09ced1cdbee98913a95a8180a4f7b4f9bf2"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G005","key":"learningItemId","beforeHash":"53f07b59f054010d96c710ae7417ea510d6d2f16f84bafb49314e7c83bd37914","afterHash":"4b7e5f1e3454ab7e862c93e5a93afbd6b80b331d7f6a04891ae6663796b7e669","starterIncluded":false,"fields":{"explanationZh":"be hard on sb 在本課表示對某人很兇、嚴厲對待某人。"},"sources":{"explanationZh":"89ba709f3fb95f425c0dfb13098ae09ced1cdbee98913a95a8180a4f7b4f9bf2"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G006","key":"learningItemId","beforeHash":"ed22c3e24ead239f86145eb2d800a7d9934e00ac951d378b701e20c21fe8ebe4","afterHash":"cb646510eb4d570e67483339becd44c1cfd6799f16f84ceb14479997134ba93f","starterIncluded":false,"fields":{"explanationZh":"roughly 可修飾數字，表示「大約」，如 roughly ten days（大約十天）。"},"sources":{"explanationZh":"7a506672285befc6516bbab3d99212a126a0aeb302b8319c76c7dd1d72cb1e59"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G007","key":"learningItemId","beforeHash":"3bb417872a8e03ce98b79e9c0d2312b906b89d4370ac5dc20e4f243c23e39ab1","afterHash":"582cdf8f943ef24b3ca6069dc9f2227c88ed7335d299059b967a6f66a3fa38b8","starterIncluded":false,"fields":{"explanationZh":"entrance 表「入口」時可接 to，指出通往的建築或地點。"},"sources":{"explanationZh":"ecb791a7cc72bb5b2470fa19b03bf0863283d126da7bbc7d354f26530bd4ea97"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G008","key":"learningItemId","beforeHash":"b438941c07405712f6644c32938f445da2e390ec2708828e27f2fa753187a1c6","afterHash":"ee7f90fa9289e62bb8c3d6392a6b2cab318d3410c15d930ae503b0b4aea39724","starterIncluded":false,"fields":{"explanationZh":"exit 表「出口」時可接 from，指出離開的建築或地點。"},"sources":{"explanationZh":"21e1410e9faeb3d5cb3e19b42e400a69af8d7d8ba949eb6afa3ba1e815fd64f7"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G009","key":"learningItemId","beforeHash":"dc68c411326a74cc1a18e3c31495617a6100fa557d38d29fc192e9f7c1e93c0e","afterHash":"f37bb0f096ac01e0cf2f74b746626029f9d5bb8e218b2e49ace0f930b235625b","starterIncluded":false,"fields":{"explanationZh":"owe sb sth 表示欠某人某物；sb 是對方，sth 是所欠的事物。"},"sources":{"explanationZh":"992d300d1607676467f074ab53b470763f9f94fc8428f01234918a701cdf2c38"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G010","key":"learningItemId","beforeHash":"5e27a76badae1070ce71b79bdc7094dce0e227edaf945df522c55f03387393e1","afterHash":"621fe280316d9b6c05a7a464154902086fae5321f0e0c6c2a3fbfb7fa97c41ab","starterIncluded":false,"fields":{"explanationZh":"owe A to B 在本課表示將 A 歸功於 B。"},"sources":{"explanationZh":"7ebc971ef37e26e31803a21060489ccfd4ded01ce8bb2b37b893596773edb9e5"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G011","key":"learningItemId","beforeHash":"a29e1f31a41daa0e3876477f172c431043eb476bf374f3f7d484a72308c76ed2","afterHash":"187d9fbbf3c515f80a0de6bf5b5b21a71f83de2998b497bbc6a801645a80ac5a","starterIncluded":false,"fields":{"explanationZh":"attribute A to B 在本課表示將 A 歸功於 B，可與 owe A to B 對照。"},"sources":{"explanationZh":"7ebc971ef37e26e31803a21060489ccfd4ded01ce8bb2b37b893596773edb9e5"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G012","key":"learningItemId","beforeHash":"b432383d371b10a679f8d76776a170ac5fb1b29359ba60b0aabb12a00a6d3805","afterHash":"53f00e35ab21a4bfebe38bbb46a608cd81c3f850e2c9d201a246114cf61e1697","starterIncluded":false,"fields":{"explanationZh":"owing to 表示「由於」，用來引出原因。"},"sources":{"explanationZh":"af8c011c0f4f4ad8bcf8b120ad7090d67608004c9d293ae0feb42ce753d62772"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G013","key":"learningItemId","beforeHash":"86115f7030126fe45f604fde1a4b98f364af766d6bdf48d2e449f6f95941221d","afterHash":"10716aa52651f62801802cc9c05f1686ef8ca7c2da337ce6f4cbb088092af9ba","starterIncluded":false,"fields":{"explanationZh":"owing to 後接名詞作受詞，表示「由於……」。"},"sources":{"explanationZh":"d04518d9ea273b042560c937595478380781bf4a7a54a34af33ebeec89a9b71c"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G014","key":"learningItemId","beforeHash":"6b0c78115b09008620e149f3de910119382ad99c405de9f43f51be17e3d59b77","afterHash":"aa42efe2d0720ebddd40b565e9853dcc0393d58e366bccdbf0943640114a61a0","starterIncluded":false,"fields":{"explanationZh":"because of 表示「因為、由於」，本課與 owing to 對照。"},"sources":{"explanationZh":"24253ccb73e72bfb7c426d1b7a6184c3994d04a767054d1c745a2efb4c2fdae5"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G015","key":"learningItemId","beforeHash":"c9f4c32fdf8d22cb8830e2b398404903953c12d1e0036a3d1d352ea96bf7798f","afterHash":"99ad747e892d503e37e3d9ed6e0aae0c8afdcea7de6088cc1b71c3cd5bc3c2af","starterIncluded":false,"fields":{"explanationZh":"due to 表示「由於」，本課與 owing to 對照。"},"sources":{"explanationZh":"24253ccb73e72bfb7c426d1b7a6184c3994d04a767054d1c745a2efb4c2fdae5"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G016","key":"learningItemId","beforeHash":"a2390f5c82a66be4870b40b8fab88bb6ec5ba73ccb4f8fbdc06a87f0b198bc49","afterHash":"4425e67800c568e317306b9905dfd33e2192d91e3f64f033f39ef6e92e09e410","starterIncluded":false,"fields":{"explanationZh":"on account of 表示「因為、由於」，本課與 owing to 對照。"},"sources":{"explanationZh":"24253ccb73e72bfb7c426d1b7a6184c3994d04a767054d1c745a2efb4c2fdae5"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G017","key":"learningItemId","beforeHash":"ac43ea2c84c1916e92943d354657b68745907b017585962f6137bf6f0dc58123","afterHash":"c5f2e6878c8efb8526dafdfde701517305898433ffd0459b192c17e396461241","starterIncluded":false,"fields":{"explanationZh":"as a result of 表示「由於……的結果」，本課與 owing to 對照。"},"sources":{"explanationZh":"24253ccb73e72bfb7c426d1b7a6184c3994d04a767054d1c745a2efb4c2fdae5"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G018","key":"learningItemId","beforeHash":"bb106e3b1f8df9d82727b6f30d53c36fccaf6b9ca308b7e3adf30318dd89be55","afterHash":"77557c7d8f1465ab9c04f2e1fa1ab3fcf4d1b5436f796aca918dd04d0018bb02","starterIncluded":false,"fields":{"explanationZh":"原書列 sin 的三態為 sin、sinned、sinned。"},"sources":{"explanationZh":"a1c4090483d4dd8a1a5c762b37d2135bc24954aaa8b9e39af45efc3d98b9e889"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G019","key":"learningItemId","beforeHash":"d4e62a64e25068d511e36bd1ee861591eccd7e80bfaae22022f964f552db2725","afterHash":"29e6a0f6296f5686c684a74118dd29f511abbd9a2a97dc7fe2fbde372cdaed94","starterIncluded":false,"fields":{"explanationZh":"本課比較 crime 與 sin：crime 指與刑法有關的罪；sin 指良心或道德上的罪。"},"sources":{"explanationZh":"97f4086661609df52368e607b4c3c619ba521161e396b1b8a1a91efab95b37e2"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G020","key":"learningItemId","beforeHash":"069801cd839e9f42ba12577f5b5409bef55c57a7286ba23f2637510e37dde087","afterHash":"db8c298a05707e10f9a45f4470d19dc55e4e9cfb1c8dfb67ea2b7860240d7df0","starterIncluded":false,"fields":{"explanationZh":"原書提醒 corps 與 corpse 發音不同：單數 corps 的字尾 ps 不發音；corpse 的 p、s 要發音，意思是人的屍體。此提醒不概括複數 corps 的字音。"},"sources":{"explanationZh":"7bf9acb6439df438c20ba8b4c89fe36668c1db74cae7e73aa8a74c0fcd704143"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G021","key":"learningItemId","beforeHash":"86b7d23ef062646b468e602b806a2cb7a22fcfbf5bc3c2ef1b40eea6abc72e69","afterHash":"4f77cb268d56c6b35a2950931ea8db7bbaa4ae1a69b8e819f14c8937b7dd9059","starterIncluded":false,"fields":{"explanationZh":"not...just because... 在本課表示不要只是因為某個原因就做某事。"},"sources":{"explanationZh":"472e3858f9d2d4eedd405b8fa2808ac6b03ca60c7d853f9e9411e77a1c3a8686"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G022","key":"learningItemId","beforeHash":"ed7243edaa88cc405c22100907620f93ba26b8109c21f4d8833c6a4e558ed99d","afterHash":"99e7825706fee3d5dbcbb590f7213d65f1e011360b9b08510960b10443bfb460","starterIncluded":false,"fields":{"explanationZh":"resort to 表示「訴諸……」，本課例句用 resort to violence 表示訴諸暴力。"},"sources":{"explanationZh":"914508eb25e398faf369059955a7f9b8d40ac72d8c9e7df0abf5679f6bb9715e"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G023","key":"learningItemId","beforeHash":"d29aec2c77c49f03bb15e83facc81bc983f229cc597e62cbacd415436383ab5a","afterHash":"9640201a7dd017d3b21daecb5ea0b1dae211cc08b8fb90f51742e38c125df4ce","starterIncluded":false,"fields":{"explanationZh":"work in concert with 表示與……同心協力。"},"sources":{"explanationZh":"e22ece5b1840a73ed9240a83d9fc38f74629b0bf73fd1749c724d74ac1ae9d7a"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G024","key":"learningItemId","beforeHash":"806a6e2be834fcf5870b59ffdbc32d17789c62151717e9113aa470f310b1e66b","afterHash":"858b2d2273996106af1b990d9973d1ad9a1d026b31025e578bec38b69cdd9012","starterIncluded":false,"fields":{"explanationZh":"put on a concert 表示舉辦演唱會，可與 hold a concert 對照。"},"sources":{"explanationZh":"cf3dd7168d0b5b1dd73b1be2121fba0136f4d8960f71ef7b2395d325ca6562bb"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G025","key":"learningItemId","beforeHash":"5959980c0f74b79e7ad4a9a40606118c41cde5787edd430ef54b2e7187062dd3","afterHash":"cc3687a6b1280ebec3686997dcfe24cc2f51097e0b7e1597d7e11375c6eb9edd","starterIncluded":false,"fields":{"explanationZh":"hold a concert 表示舉辦演唱會，可與 put on a concert 對照。"},"sources":{"explanationZh":"cf3dd7168d0b5b1dd73b1be2121fba0136f4d8960f71ef7b2395d325ca6562bb"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G026","key":"learningItemId","beforeHash":"a8b39df1dc59323aee5c72e51dc6dc4f761fba4e33e82363792d93025b2fd222","afterHash":"a442ad4626c5cdf22acca0337978e30108a4943922c7d4465bce0245b16434c8","starterIncluded":false,"fields":{"explanationZh":"investigate a case 表示調查案件。"},"sources":{"explanationZh":"fb9b9a7b4e36f2a611f9c10c248b15e8f83950323f74f895fee31b44cff2f18c"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G027","key":"learningItemId","beforeHash":"e669729521b2cca07912e800eda5c064d360b922db7158925165784c034434d1","afterHash":"d6e7712784380bf45316823a3bcff55ad139709dfbdfaaea3b89861f22bb3ea4","starterIncluded":false,"fields":{"explanationZh":"look into a case 表示調查案件，與 investigate a case 同義。"},"sources":{"explanationZh":"fb9b9a7b4e36f2a611f9c10c248b15e8f83950323f74f895fee31b44cff2f18c"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G028","key":"learningItemId","beforeHash":"4ab8fab4c740b34fe6a145a6e7340637812027aa0806de2519522a296d0cc4cd","afterHash":"3a20fe3813e9ff4992e3c4593993ac613fcc67e0d533e08666fe67d6e50cc1d0","starterIncluded":false,"fields":{"explanationZh":"on one's own 表示靠自己；本課洗碗機例句中的 on its own 表示自行停止，可與 automatically 對照。"},"sources":{"explanationZh":"3ff65fbe87aced191857fa9d4363c386b4d92e42e4880a1c2d51c73eb79d7258"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G029","key":"learningItemId","beforeHash":"bb3caf16e4bd96867baefc98dc4ef79f03bcc6fa7b75d6c9afe8b031a3269ee1","afterHash":"fb21d5d2dec9388991218601bf019876f89697054382ae4578a1ead093318abb","starterIncluded":false,"fields":{"explanationZh":"fire a bullet at 表示朝……開一槍；at 後接射擊目標。"},"sources":{"explanationZh":"cefc694d277cc32ba101e5f3c22aa6140bcbf2f0a021037705a7c9b4ba1f18c0"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G030","key":"learningItemId","beforeHash":"9ab15828aeac901978b9fd859af32c161e59edcc5a2e844838c7a2555f4a8401","afterHash":"737e69d97e92d5f443190fe644e04016313177f0e8822b1c47bb439cf64557be","starterIncluded":false,"fields":{"explanationZh":"the bullet train 指子彈列車，即高速火車。"},"sources":{"explanationZh":"77b4fe4957bea6634e2df37ba484d0e57f6908e96c8e632d54384195993f0e62"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G031","key":"learningItemId","beforeHash":"1138930e668be852a2155e51a02f6ccbeb68bcf4e9ea63506fcc5720063ea053","afterHash":"e916cae851305a9df300cde5b6896321a447d8b40abd5e23f08f18c5c76f00d8","starterIncluded":false,"fields":{"explanationZh":"a bullet hole 指子彈造成的彈孔。"},"sources":{"explanationZh":"5480360aabcf7f739df384e10438afe55c543dfb2281b966a7d0c9f0dbd90288"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G032","key":"learningItemId","beforeHash":"1d4f878e1914aceccc3acd0c91cdc2b37d563b52929d0da2e91d98593389b686","afterHash":"fcdc734a1e9a8ef4f1f1a37afe88a9d0330ba31ea5b9cbbf0047d0fc93d31194","starterIncluded":false,"fields":{"explanationZh":"bear (a) similarity to 表示與……相似；原書括號表示 a 可省略。"},"sources":{"explanationZh":"ccda928781fbc2fe847c32e10ec62f8bcf6c77a7e34dd8611b2019335ebda798"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G033","key":"learningItemId","beforeHash":"bdec1c0eb3ebc8a1f6fbf0b5e6ccf6fcbb4ac5fc3130af7cee8377c086db6b15","afterHash":"cd86dc2d94ef69ae9f640ab56723d203cff0d56b2c118dd6e297cb38716d5b1d","starterIncluded":false,"fields":{"explanationZh":"bear a resemblance to 表示與……相似，可與 bear (a) similarity to 對照。"},"sources":{"explanationZh":"ccda928781fbc2fe847c32e10ec62f8bcf6c77a7e34dd8611b2019335ebda798"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G034","key":"learningItemId","beforeHash":"dece32dce990de616f02d974a1b96ca1ced577c4f70864ec9d6813c5c90b2e8a","afterHash":"a748dc62a648c76f2ea83f7f5a95112ff29f7e99c21bd568e2dc334ef9f6d9f5","starterIncluded":false,"fields":{"explanationZh":"原書列 unwind 的三態為 unwind、unwound、unwound。"},"sources":{"explanationZh":"1e21d81289fc5bcc725ffa292e7fa8fb749febad4a5b3242328364e559810fef"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G035","key":"learningItemId","beforeHash":"57ba50e923df721dc6848c8cd45aa410346db331e7487a36ee6b416a376babaf","afterHash":"604b530131dfcc697b53e58b3285ee411755941113504874b06fe0a498c518ed","starterIncluded":false,"fields":{"explanationZh":"原書列 stir 的三態為 stir、stirred、stirred。"},"sources":{"explanationZh":"5f6bff39009c2db7e14a9975a4aeaf538832186f6437ecbf13d3a151e71dac40"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G036","key":"learningItemId","beforeHash":"594c6ea6664d0d4f75de8b673ed998a2232ba46154bf5a883eba682d0b5280ee","afterHash":"9e8198f7bd32acc6858850164e2cdbdc4f9b6979dc9cca30d1216372cdf1091f","starterIncluded":false,"fields":{"explanationZh":"stir up 表示「激起……」。"},"sources":{"explanationZh":"0698313309a104bde4fc40657bc5d1ba9c30accef22b93aed73c8bc7b4e1bd59"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G037","key":"learningItemId","beforeHash":"cd23f9f7ca96b0636a97f91265bec145291c89675ab76e1bb249644f29933d2f","afterHash":"2a32edce171a7439ecc03a101aeed348b968f3934655f1d2e40cd9a18648b623","starterIncluded":false,"fields":{"explanationZh":"stir up trouble 表示鬧事、惹麻煩。"},"sources":{"explanationZh":"2b1549f90d15aea1b1b0a9923f29d94febe5efb3e115796a26c4a5b48d0be5ff"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G038","key":"learningItemId","beforeHash":"5afc858eb7cfedabaa4b49a3e982100ac71d4f6a62641037b9d1869ae6f27d04","afterHash":"eef71cbe1abf78f3f261ea39430724787cbd5fc05e1bb520b03a67ecd6dd9931","starterIncluded":false,"fields":{"explanationZh":"cause a stir 表示引起騷動或混亂。"},"sources":{"explanationZh":"851c6f4a3059b5950e0456ee4f28089b276a274d9b23bc9b8cc86626aeafdc32"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G039","key":"learningItemId","beforeHash":"0480fc1eb89d44f8dc4b22361c3a57af0cfc8250a7641db41cac5f08b1602f6b","afterHash":"c02143a1e5c52b08db7de719fd11d61fa65c29e434c26394f48547cab48de2bc","starterIncluded":false,"fields":{"explanationZh":"原書列 sip 的三態為 sip、sipped、sipped。"},"sources":{"explanationZh":"2aab31ec8dbfa98779491b7253498a9bb4aeda19989cb4a067bc80e89908f394"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G040","key":"learningItemId","beforeHash":"c1b9fa16add8593f91d9ea199b60da8eff2dfe9bafde4a7c2d7ed694a784d442","afterHash":"14a7d33f34ae3b9ddfe3bb8f5c97c8a9302275a5636e48fd006e2604c039a263","starterIncluded":false,"fields":{"explanationZh":"take a sip of 表示小喝一口……。"},"sources":{"explanationZh":"755df14a8b7a38d5254479f01403bd168761c6120d37658bef5f5d06ce1838b9"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G041","key":"learningItemId","beforeHash":"6de1efb4ad27261820193c5a06a87d7c060360920eafbfe32de2330d36a0d3fc","afterHash":"ee65a23989cbaf391668b6873e7e09cbd370b72e89ba05d335b4fdf3f7aeeb30","starterIncluded":false,"fields":{"explanationZh":"本課以生活經驗與課業、學術作比較：wisdom 著重生活經驗中的智慧，intelligence 著重智力。這是本課的對照提示，不是兩詞所有用法的排他定義。"},"sources":{"explanationZh":"2ef905b87ae759b537829be6b5130466c767a1870b6a4ff9e84f4eb8b4dc8e7a"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G042","key":"learningItemId","beforeHash":"29a2a690f20b9cd2a614c01d29719b881b7ba578e8a9059e93ded9509694ba07","afterHash":"f9ebc3b8234850673b0d445d7c2545b0da7d524b50cf168270cd4b2f4cb58486","starterIncluded":false,"fields":{"explanationZh":"in the meanwhile 表示「在此同時」；本課將 meanwhile 在此片語中的用法列為名詞。"},"sources":{"explanationZh":"ffb610250b9b4aa2642026aa9ce1d5986d7eac0ebe8444c79992535ef0caaa61"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G043","key":"learningItemId","beforeHash":"e8da88c02b3ec3c8fd0504b378ff62f5b5693cab36eb82fe15a0c7c0d15f54fd","afterHash":"6c27388eb496c3e7ab506a82d0e62340bd8e5549a174d8132734843d4c6ce1e3","starterIncluded":false,"fields":{"explanationZh":"in the meantime 表示「在此同時」，可與 in the meanwhile 對照。"},"sources":{"explanationZh":"42506632f2cc0177294677cfd37c2063cddb166a1086da98e4b5e46e7ef69fdc"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G044","key":"learningItemId","beforeHash":"eeb58bb0555ef8826e7bee1d06b1839090f10eff92408713d0287a55adacb2e8","afterHash":"d083698595fadcf8b377aaa3579419037a92d85015f9f4de62340e0a51ca4a24","starterIncluded":false,"fields":{"explanationZh":"meanwhile、meantime 可作副詞，表示「在此同時」，不必加 in the。"},"sources":{"explanationZh":"42506632f2cc0177294677cfd37c2063cddb166a1086da98e4b5e46e7ef69fdc"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G045","key":"learningItemId","beforeHash":"f0d497706e331e750e15f0dbac0a47bc6d2c460432e746a7382ab00733bf1d3c","afterHash":"e50a1d6dbb7ffc938931fc961d6f9141fe5890cd514ee141addf1b4c3cacafef","starterIncluded":false,"fields":{"explanationZh":"compete with sb for sth 表示與某人競爭某物；with 後接競爭對象，for 後接爭取的事物。"},"sources":{"explanationZh":"9103d873f8e3f5b11e06d725a498b296fc0cb177e1e6e1d48b69147afac6cdc0"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G046","key":"learningItemId","beforeHash":"6426338109dbb16bb327ab22422cd4972f2e15baea1c917eb6a7664515472168","afterHash":"6657627f668bcdb7a312c76ee63bc38dd009cf031d36f3798dc9897c2e3e6d75","starterIncluded":false,"fields":{"explanationZh":"tons of work 表示許多工作，這裡的 tons 表示數量很多，並非重量。"},"sources":{"explanationZh":"46f60f8ef2a7dac179b05464f0244e00ffca3d9a56a598b192437af1c9062e40"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G047","key":"learningItemId","beforeHash":"07ae1face432d15eece9b530dffa525c6e95606286fe164140d6f4157d26f4a6","afterHash":"44f1b97da917c22958b55927e47333656de2865ebbb30f8402abe0fb24095a6e","starterIncluded":false,"fields":{"explanationZh":"a lot of work 表示許多工作，與本課 tons of work 的意思相同。"},"sources":{"explanationZh":"46f60f8ef2a7dac179b05464f0244e00ffca3d9a56a598b192437af1c9062e40"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G048","key":"learningItemId","beforeHash":"93b4ca163d05ece75ad0eadba88beb87f0fa2a3ba0a21ba02a92b9e1e85b5853","afterHash":"f2b803482b43d764e6f99bc2991fc43be71db47baf4f9a3fa953c38125d4a16b","starterIncluded":false,"fields":{"explanationZh":"have a talent for 表示在……方面有才能；本課以 drawing（繪畫）說明。"},"sources":{"explanationZh":"3e8f78f34198408e002f758edd6dbc69f187c07bb83803d1efaa44e7eeb31def"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G049","key":"learningItemId","beforeHash":"de9aa462bc0c19781903aa4c2d1b9442cf82922f82bb43214a6bb10ce90e08c1","afterHash":"28cbd60616b78cdb81f6f65df8922661d5d1b21089f129913352f8ea93949beb","starterIncluded":false,"fields":{"explanationZh":"be talented in 表示在……方面有才能，可與 have a talent for 對照。"},"sources":{"explanationZh":"685fb4f319cdcb1c59b78db85083ec0a94c43d2190ce52fbb4344017230e92db"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G050","key":"learningItemId","beforeHash":"31d807312aec8ae43f124aeada5fb21dbda038036cf8a9be85157ff582d7790a","afterHash":"166d5eb20e31d3ca7abdc8792c968da389803a53c7cb75b06e721e4569d57ac5","starterIncluded":false,"fields":{"explanationZh":"shortly after 表示在……之後不久；shortly before 表示在……之前不久。"},"sources":{"explanationZh":"7f92741e00df9b95fee3bee0fe6a4a7f8a8fc40cbd4afb8ec15af039f4b2c739"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G051","key":"learningItemId","beforeHash":"f83c241edef8f31d3e43094e20091b3beae64b5581aa2abf8d44b9a8359e4192","afterHash":"13fc04b3f67f3ab708d5adc2600d75576bb89b3a3ee948655ec67614c8a8010b","starterIncluded":false,"fields":{"explanationZh":"immediately after 表示緊接在……之後；immediately before 表示緊接在……之前。原書將它們與 shortly after / before 並列，但 immediately 更強調時間緊接。"},"sources":{"explanationZh":"322f02f9a377813f1457fd1b96786ec469791ff513953a0e1ea74de65c988c95"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G052","key":"learningItemId","beforeHash":"6b1dfba443a1f1e26ee8d3e20d2e727620a789cd617d62387e8c2b38e4db6c12","afterHash":"5e3277f3cc689fcf09726e8c50c7f32d1dfed1c5393205dbae7582a7caeed113","starterIncluded":false,"fields":{"explanationZh":"assume the burden of 表示挑起……的重擔、承擔……的責任。"},"sources":{"explanationZh":"eba2a1ee038c0141642d63cba5e18ae78083bbbde7337889d3ef2f81f7b6832f"}},
  {"dataset":"curriculum","id":"LI-LV3U10-G053","key":"learningItemId","beforeHash":"cf8df1cb845033d865515c4cec0d802380fad6f4363886b46893d5445657c09b","afterHash":"829b0424ce87c5452b2cf3abaccf71dc0d06281d5e8b7686db7c26e710ef7d36","starterIncluded":false,"fields":{"explanationZh":"shoulder the burden of 表示挑起……的重擔、承擔……的責任，可與 assume the burden of 對照。"},"sources":{"explanationZh":"eba2a1ee038c0141642d63cba5e18ae78083bbbde7337889d3ef2f81f7b6832f"}}
];
const u10Forms = [
  {"id":"W001787","status":"draft","forms":{"base":"shine","past":"shone / shined","pastParticiple":"shone / shined","sourceRef":"https://www.collinsdictionary.com/dictionary/english/shine","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/shine","quote":"Past Participle\nshone\nPast\nI shone","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nshone\nPast\nI shone"},{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins COBUILD Advanced Learner’s Dictionary","url":"https://www.collinsdictionary.com/dictionary/english/shine","quote":"past tense, past participle shined , past tense, past participle shone","locator":"COBUILD Word forms line 222; language note and sense 5; British section sense 4 lines 336–340.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","meaningDistinction":"The entry assigns shined to the polishing sense; shone is used for the other listed verb senses. Existing word row includes both emitting light and polishing shoes.","excerpt":"past tense, past participle shined , past tense, past participle shone"}]},
  {"id":"W002044","status":"reviewed","forms":{"base":"assume","past":"assumed","pastParticiple":"assumed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/assume","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/assume","quote":"Past Participle\nassumed\nPast\nI assumed","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nassumed\nPast\nI assumed"}]},
  {"id":"W002179","status":"reviewed","forms":{"base":"compete","past":"competed","pastParticiple":"competed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/compete","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/compete","quote":"Past Participle\ncompeted\nPast\nI competed","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\ncompeted\nPast\nI competed"}]},
  {"id":"W002603","status":"reviewed","forms":{"base":"owe","past":"owed","pastParticiple":"owed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/owe","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/owe","quote":"Past Participle\nowed\nPast\nI owed","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nowed\nPast\nI owed"}]},
  {"id":"W002657","status":"draft","forms":{"base":"poll","past":"polled","pastParticiple":"polled","sourceRef":"https://www.collinsdictionary.com/dictionary/english/poll","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/dictionary/english/poll","quote":"past tense, past participle polled","locator":"COBUILD entry, Word forms, line 222.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"past tense, past participle polled"}]},
  {"id":"W002683","status":"draft","forms":{"base":"pronounce","past":"pronounced","pastParticiple":"pronounced","sourceRef":"https://www.collinsdictionary.com/conjugation/english/pronounce","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/pronounce","quote":"Past Participle\npronounced\nPast\nI pronounced","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\npronounced\nPast\nI pronounced"}]},
  {"id":"W002698","status":"reviewed","forms":{"base":"rank","past":"ranked","pastParticiple":"ranked","sourceRef":"https://www.collinsdictionary.com/conjugation/english/rank","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/rank","quote":"Past Participle\nranked\nPast\nI ranked","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nranked\nPast\nI ranked"}]},
  {"id":"W002714","status":"reviewed","forms":{"base":"relax","past":"relaxed","pastParticiple":"relaxed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/relax","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/relax","quote":"Past Participle\nrelaxed\nPast\nI relaxed","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nrelaxed\nPast\nI relaxed"}]},
  {"id":"W002803","status":"draft","forms":{"base":"sip","past":"sipped","pastParticiple":"sipped","sourceRef":"https://www.collinsdictionary.com/conjugation/english/sip","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/sip","quote":"Past Participle\nsipped\nPast\nI sipped","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nsipped\nPast\nI sipped"}]},
  {"id":"W002850","status":"draft","forms":{"base":"stir","past":"stirred","pastParticiple":"stirred","sourceRef":"https://www.collinsdictionary.com/conjugation/english/stir","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/stir","quote":"Past Participle\nstirred\nPast\nI stirred","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nstirred\nPast\nI stirred"}]},
  {"id":"W002876","status":"reviewed","forms":{"base":"survey","past":"surveyed","pastParticiple":"surveyed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/survey","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/survey","quote":"Past Participle\nsurveyed\nPast\nI surveyed","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nsurveyed\nPast\nI surveyed"}]},
  {"id":"W003372","status":"reviewed","forms":{"base":"evidence","past":"evidenced","pastParticiple":"evidenced","sourceRef":"https://www.collinsdictionary.com/conjugation/english/evidence","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/evidence","quote":"Past Participle\nevidenced\nPast\nI evidenced","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nevidenced\nPast\nI evidenced"},{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins English Dictionary","url":"https://www.collinsdictionary.com/dictionary/english/evidence","quote":"verb (transitive)\nto make evident; show clearly","locator":"British English section, verb (transitive), sense 6 lines 331–335","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","excerpt":"verb (transitive)\nto make evident; show clearly"}]},
  {"id":"W005708","status":"draft","forms":{"base":"probe","past":"probed","pastParticiple":"probed","sourceRef":"https://www.collinsdictionary.com/conjugation/english/probe","status":"approved"},"sources":[{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins Dictionary","url":"https://www.collinsdictionary.com/conjugation/english/probe","quote":"Past Participle\nprobed\nPast\nI probed","locator":"Conjugation table: Past Participle (lines 221–223) and Past (lines 244–246), directly opened and searched; line positions may shift.","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","method":"Web tool open publisher page then find relevant labeled sections; not a search snippet; short verbatim excerpts.","excerpt":"Past Participle\nprobed\nPast\nI probed"},{"type":"independent_dictionary_verification","publisher":"HarperCollins Publishers / Collins English Dictionary","url":"https://www.collinsdictionary.com/dictionary/english/probe","quote":"verb\nto search into or question closely","locator":"British English section, verb sense 1 (transitive), lines 325–329","accessedAt":"2026-11-08T07:26:05.636016+00:00","verification":"direct_dictionary_entry_read","excerpt":"verb\nto search into or question closely"}]}
];
const u10Siege: [string, string][] = [
  ["ELECTRONIC","電子的"],
  ["ELECTRICITY","電；電力"],
  ["SHINY","發亮的；有光澤的"],
  ["PALACE","皇宮"],
  ["RANK","等級；排名"],
  ["ROUGH","粗糙的；粗略的；粗暴的；草圖；粗魯地"],
  ["ROUGHLY","約略地；大致上"],
  ["ENTRY","入口"],
  ["PROOF","證明（集合名詞，不可數）；防……的（多用於名詞-proof複合字）"],
  ["OWE","欠（債）；歸功"],
  ["OWING","欠著的；未付清的"],
  ["SIN","罪惡；犯罪"],
  ["NAVY","海軍"],
  ["VIOLENCE","暴力；猛烈"],
  ["VIOLENT","粗暴的"],
  ["VIOLENTLY","激烈地；粗暴地"],
  ["CONCERT","一致；協調（不可數）；音樂會（可數）；演唱會"],
  ["POLL","民意測驗；做問卷調查"],
  ["SURVEY","調查；勘察"],
  ["INVESTIGATE","調查（案件）"],
  ["AUTOMATIC","自動的"],
  ["AUTOMATICALLY","自動地"],
  ["BULLET","子彈"],
  ["OWNERSHIP","所有權"],
  ["SIMILARITY","相似（不可數）；相似之處（可數）"],
  ["RELAX","使放鬆；使寬鬆；放鬆；休息"],
  ["RELAXED","寬鬆的；覺得放鬆的"],
  ["STIR","攪拌；騷動"],
  ["TERRITORY","地盤；區域；領土；屬地"],
  ["SIP","啜飲"],
  ["WISDOM","智慧"],
  ["MEANWHILE","同時"],
  ["WHEAT","小麥"],
  ["COMPETE","競爭"],
  ["TON","噸；許多"],
  ["PEA","豌豆"],
  ["CONTROLLER","控制器；控制人員"],
  ["COUNTY","縣；郡"],
  ["AWKWARD","笨拙的；不熟練的；令人尷尬的"],
  ["TALENT","天分；天才"],
  ["TALENTED","有天分的"],
  ["SHORTLY","不久；立刻"],
  ["ORGANIZE","組織"],
  ["PRONOUNCE","發音；宣布"],
  ["ASSUME","假定；認為（以that...作受詞）；負起（責任）"],
  ["ELECTRIC","電的；電動的"],
  ["ELECTRICAL","電的；有關電的"],
  ["ELECTRICIAN","技工；電工"],
  ["GLOSSY","有光澤的；光滑的"],
  ["SHINE","擦亮；發亮；照耀；光亮"],
  ["PLACE","地方；放置"],
  ["GRADE","等級"],
  ["CLASS","級別"],
  ["UNEVEN","不平坦的"],
  ["COARSE","粗糙的"],
  ["BRUTAL","粗野的"],
  ["BRIEFLY","簡略地"],
  ["ENTRANCE","入口"],
  ["EXIT","出口"],
  ["PROVE","證明；結果顯示"],
  ["EVIDENCE","證據；證明（集合名詞，不可數）"],
  ["WATERPROOF","防水的"],
  ["SOUNDPROOF","隔音的"],
  ["BULLETPROOF","防彈的"],
  ["DEFENDANT","被告"],
  ["SINFUL","有（違背良心）罪的"],
  ["NAVAL","海軍的"],
  ["ARMY","陸軍"],
  ["CORPSE","屍體"],
  ["BRIBERY","賄賂"],
  ["CORRUPTION","貪汙；腐敗"],
  ["CRUELTY","殘酷；野蠻；殘酷行爲；殘忍"],
  ["BRUTALITY","殘酷；殘暴行為"],
  ["CRUEL","殘忍的"],
  ["FIERCELY","強烈地"],
  ["VEHEMENTLY","激烈地"],
  ["CRUELLY","殘忍地"],
  ["BRUTALLY","粗暴地"],
  ["REVEAL","顯露"],
  ["SURVEYOR","調查員"],
  ["DETERIORATE","惡化"],
  ["BURGLAR","竊賊；夜盜；盜竊者"],
  ["INVESTIGATION","調查"],
  ["PROBE","調查；探查"],
  ["AUTOMATED","自動化的"],
  ["BULLETIN","告示；公告；新聞快報"],
  ["OWN","擁有"],
  ["OWNER","擁有者；主人"],
  ["SIMILAR","相似的"],
  ["RESEMBLANCE","相似"],
  ["DIFFERENCE","差異；不同"],
  ["RELAXATION","放鬆；緩和"],
  ["UNWIND","（使）放鬆"],
  ["RELAXING","令人放鬆的"],
  ["LOOSE","寬鬆的"],
  ["CAREFREE","無憂無慮的；輕鬆愉快的"],
  ["MIXTURE","混和；混和物"],
  ["TERRITORIAL","領土的"],
  ["TURF","流氓的地盤"],
  ["WISE","聰明的；有智慧的"],
  ["INTELLIGENCE","智能；智慧"],
  ["MEANTIME","同時"],
  ["OAT","燕麥"],
  ["BARLEY","大麥"],
  ["RYE","黑麥；裸麥"],
  ["BUCKWHEAT","蕎麥"],
  ["GRAIN","穀物"],
  ["COMPETITION","競爭"],
  ["COMPETITIVE","競爭的"],
  ["COMPETITOR","競爭者；參賽者"],
  ["COMPETENT","有能力的；能勝任的"],
  ["COMPETENCE","能力；稱職"],
  ["SOYBEAN","大豆"],
  ["PROVINCE","省；州"],
  ["CITY","城市；市；都市"],
  ["CLUMSY","笨拙的"],
  ["GIFTED","有天才的"],
  ["VERSATILE","多才多藝的"],
  ["ORGANIZED","有組織的"],
  ["ORGANIZER","組織者；主辦人"],
  ["PRONUNCIATION","發音；讀法"],
  ["ASSUMPTION","假定"]
];

function u10Step() {
  const steps = loadLV3Chain().filter(isAuditUnitStep).filter(step => step.entry.unit === 'LV3-U10');
  expect(steps).toHaveLength(1);
  expect(steps[0].entry.status).toBe('committed');
  return steps[0];
}

// Shared dictionaries can receive later audited changes. Every call authenticates
// the complete current document and all intervening inverse steps, then binds U10.
function u10CheckpointWords() {
  return lv3AfterUnitFile('LV3-U10', 'public/data/v1/words.json', words10);
}

// Authenticate actual complete published bytes, including all collections and
// metadata, before obtaining the historical U10 pack. No subset/allowMissing API.
function u10CheckpointPack() {
  const path = 'public/data/v1/sa-pack.json';
  const currentText = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  expect(JSON.parse(currentText), 'Imported current pack matches the entire published document').toEqual(pack);
  return JSON.parse(lv3AfterUnitPublishedText('LV3-U10', path, currentText)) as typeof pack;
}

const u10SplitPaths: Record<string,string> = {curriculum:'src/features/direct/curriculumLV3Unit10.json',words:'public/data/v1/words.json',examples:'public/data/v1/examples.json'};
it('authenticates all U10 source documents, all 166 reviewed rows and all 407 fields against independent expectations', () => {
  const delivered = { ...curriculum10, learningItems: findUnit(10, 'LV3')!.items };
  const currentDocuments: Record<string, unknown> = {
    'src/features/direct/curriculumLV3Unit10.json': delivered,
    'public/data/v1/words.json': words10,
    'public/data/v1/examples.json': examples10,
  };
  const {manifest} = u10Step();
  expect(Object.keys(manifest.files!).sort()).toEqual(Object.keys(u10ExpectedDocuments).sort());
  expect(delivered.learningItems).toHaveLength(185);
  expect(delivered.learningItems.filter(item => item.kind === 'vocabulary')).toHaveLength(132);
  expect(delivered.learningItems.filter(item => item.kind === 'grammar')).toHaveLength(53);
  expect(delivered.learningItems.filter(item => item.kind === 'vocabulary' && item.officialWordId === null)).toHaveLength(37);
  expect(new Set(delivered.learningItems.filter(item => item.kind === 'vocabulary' && item.officialWordId).map(item => item.officialWordId)).size).toBe(93);
  expect(manifest.patches.map(patch => patch.dataset + ':' + patch.id).sort())
    .toEqual(u10ExpectedRows.map(row => row.dataset + ':' + row.id).sort());
  expect(manifest.patches).toHaveLength(166);
  expect(manifest.patches.reduce((total, patch) => total + Object.keys(patch.after).length, 0)).toBe(407);
  expect(Object.values(u10SplitPaths).sort()).toEqual(Object.keys(u10ExpectedDocuments).sort());
  expect(Object.keys(currentDocuments).sort()).toEqual(Object.keys(u10ExpectedDocuments).sort());
  const assigned=Object.keys(u10SplitPaths).flatMap(dataset=>u10ExpectedRows.filter(row=>row.dataset===dataset));
  expect(assigned.map(row=>row.dataset+':'+row.id).sort()).toEqual(u10ExpectedRows.map(row=>row.dataset+':'+row.id).sort());
  for(const patch of manifest.patches) expect(patch.path).toBe(u10SplitPaths[patch.dataset]);
});

it.each(Object.entries(u10SplitPaths))('authenticates complete U10 document: %s',(dataset,path)=>{
  const delivered = { ...curriculum10, learningItems: findUnit(10, 'LV3')!.items };
  const currentDocuments: Record<string, unknown> = {
    'src/features/direct/curriculumLV3Unit10.json': delivered,
    'public/data/v1/words.json': words10,
    'public/data/v1/examples.json': examples10,
  };
  const currentSnapshot = structuredClone(currentDocuments);
  const documents: Record<string,unknown> = {[path]:lv3AfterUnitFile('LV3-U10',path,currentDocuments[path])};
  const {manifest} = u10Step();
  const digest=u10ExpectedDocuments[path];
    expect(auditHash(documents[path]), path).toBe(digest);
    expect(manifest.files![path].afterHash, path).toBe(digest);
    expect(currentDocuments[path], path + ' projection does not mutate current data').toEqual(currentSnapshot[path]);
    expect(auditHash(lv3AfterUnitFile('LV3-U09', path, currentDocuments[path])), path + ' independent complete before')
      .toBe(u10BeforeDocuments[path]);
  expect(currentDocuments).toEqual(currentSnapshot);
  const value=documents[path];
  const datasetRows: Record<string,U10Row[]> = {[dataset]:(Array.isArray(value)?value:(value as {learningItems:U10Row[]}).learningItems) as U10Row[]};
  for (const row of u10ExpectedRows.filter(row=>row.dataset===dataset)) {
    const patch = manifest.patches.find(patch => patch.dataset === row.dataset && patch.id === row.id)!;
    expect(auditHash(patch.before), row.id + ' complete before').toBe(row.beforeHash);
    expect(patch.after, row.id + ' exact fields').toEqual(row.fields);
    expect(auditHash({...patch.before, ...patch.after}), row.id + ' complete after').toBe(row.afterHash);
    expect(Object.keys(patch.fieldEvidence!).sort(), row.id + ' source field set').toEqual(Object.keys(row.fields).sort());
    for (const [field, digest] of Object.entries(row.sources)) {
      const sources = patch.fieldEvidence![field].flatMap(record => (record as {sources: unknown[]}).sources);
      expect(auditHash(sources), row.id + '.' + field + ' exact independent sources').toBe(digest);
    }
    const actual = datasetRows[row.dataset].filter(value => value[row.key] === row.id);
    expect(actual, row.id + ' unique U10 checkpoint row').toHaveLength(1);
    expect(auditHash(actual[0]), row.id + ' all U10 checkpoint fields').toBe(row.afterHash);
  }
});

it('rejects U10 reviewed-field, untouched-field, identity, order and metadata drift without mutating input', () => {
  const path = 'src/features/direct/curriculumLV3Unit10.json';
  const delivered = { ...curriculum10, learningItems: findUnit(10, 'LV3')!.items };
  const mutations: ((value: typeof delivered) => void)[] = [
    value => { value.learningItems.find(item => item.learningItemId === 'LI-LV3U10-V047')!.targetMeaningZh += ' unrecorded'; },
    value => { value.learningItems.find(item => item.learningItemId === 'LI-LV3U10-V047')!.meaningSource = 'existing_dictionary'; },
    value => { value.learningItems.find(item => item.kind === 'grammar')!.explanationZh += ' unrecorded'; },
    value => { value.learningItems[0].sourcePage = 999; },
    value => { value.learningItems[1].learningItemId = value.learningItems[0].learningItemId; },
    value => { value.learningItems.reverse(); },
    value => { value.learningItems.pop(); },
    value => { Object.assign(value.template, {unrecorded: true}); },
  ];
  for (const mutate of mutations) {
    const unknown = structuredClone(delivered);
    mutate(unknown);
    const snapshot = structuredClone(unknown);
    expect(() => lv3AfterUnitFile('LV3-U09', path, unknown)).toThrow(/drift/);
    expect(unknown).toEqual(snapshot);
  }
  expect(auditHash(delivered)).toBe(u10ExpectedDocuments[path]);
});

it('uses every independently expected U10 siege clue after restoring the historical runtime object', () => {
  const unit = findUnit(10, 'LV3')!;
  const currentItems = unit.items;
  const document = structuredClone({...curriculum10, learningItems: currentItems});
  withOriginalU10Items(() => { expect(siegeUnitWords('LV3', 10, [])).toHaveLength(98); });
  expect(findUnit(10, 'LV3')).toBe(unit);
  expect(unit.items).toBe(currentItems);
  expect({...curriculum10, learningItems: unit.items}).toEqual(document);
  const words = siegeUnitWords('LV3', 10, []);
  expect(words).toEqual(u10Siege);
  expect(words).toHaveLength(122);
  expect(auditHash(words)).toBe('232b5710df4c730716a5847075a5d947c7dd3dd3129c6b199169a7072c94717e');
  expect(words.some(([, meaning]) => meaning.includes('義項待核對'))).toBe(false);
});

it('retains all 13 independently sourced U10 verb forms and original word statuses', () => {
  const {manifest} = u10Step();
  const checkpointWords = u10CheckpointWords();
  const checkpointPack = u10CheckpointPack();
  expect(u10Forms).toHaveLength(13);
  expect(manifest.patches.filter(patch => Object.hasOwn(patch.after, 'verbForms')).map(patch => patch.id).sort())
    .toEqual(u10Forms.map(row => row.id).sort());
  for (const expected of u10Forms) {
    const word = checkpointWords.find(word => word.wordId === expected.id)!;
    expect(word.status).toBe(expected.status);
    expect(trustedVerbForms(word)).toEqual(expected.forms);
    const patch = manifest.patches.find(patch => patch.dataset === 'words' && patch.id === expected.id)!;
    const sources = patch.fieldEvidence!.verbForms.flatMap(record => (record as {sources: unknown[]}).sources);
    expect(sources, expected.id + ' exact direct-source records').toEqual(expected.sources);
    const direct = expected.sources.filter(source => source.url === expected.forms.sourceRef
      && source.verification === 'direct_dictionary_entry_read');
    expect(direct.length, expected.id + ' matching direct source').toBeGreaterThan(0);
    expect(direct.some(source => /past participle/i.test(source.quote)
      && (/past tense/i.test(source.quote) || /(?:^|\n)Past\n/.test(source.quote))),
      expected.id + ' explicit separate tense labels').toBe(true);
    const starterWord = checkpointPack.words.find(word => word.wordId === expected.id);
    if (starterWord) {
      expect(starterWord).toEqual(word);
      expect(trustedVerbForms(starterWord)).toEqual(expected.forms);
    }
  }
});

it('keeps every included U10 starter word and example exactly synchronized without promoting status or changing original sentences', () => {
  const {manifest} = u10Step();
  const checkpointPack = u10CheckpointPack();
  for (const row of u10ExpectedRows.filter(row => row.dataset !== 'curriculum')) {
    const patch = manifest.patches.find(patch => patch.dataset === row.dataset && patch.id === row.id)!;
    const collection = row.dataset === 'words' ? checkpointPack.words : checkpointPack.examples;
    const current = collection.find(value => (value as unknown as U10Row)[row.key] === row.id);
    expect(Boolean(current), row.id + ' original starter membership').toBe(row.starterIncluded);
    if (row.starterIncluded) expect(auditHash(current), row.id + ' complete starter row').toBe(row.afterHash);
    expect(Object.hasOwn(patch.after, 'status')).toBe(false);
    expect(Object.hasOwn(patch.after, 'sentenceEn')).toBe(false);
    expect(Object.hasOwn(patch.after, 'sentenceZh')).toBe(false);
    expect(Object.hasOwn(patch.after, 'blankSentence')).toBe(false);
    expect(Object.hasOwn(patch.after, row.key)).toBe(false);
  }
});

it.each([
  {path: 'public/data/v1/words.json', kind: 'changed'},
  {path: 'public/data/v1/words.json', kind: 'untouched'},
  {path: 'public/data/v1/words.json', kind: 'reordered'},
  {path: 'public/data/v1/words.json', kind: 'missing'},
  {path: 'public/data/v1/examples.json', kind: 'changed'},
  {path: 'public/data/v1/examples.json', kind: 'untouched'},
  {path: 'public/data/v1/examples.json', kind: 'reordered'},
  {path: 'public/data/v1/examples.json', kind: 'missing'},
])('rejects complete U10 $path document drift: $kind', ({path, kind}) => {
  const words = path.endsWith('/words.json');
  const key = words ? 'wordId' : 'exampleId';
  const dataset = words ? 'words' : 'examples';
  const current = (words ? words10 : examples10) as unknown as U10Row[];
  const unknown = structuredClone(current);
  const reviewed = new Set(u10ExpectedRows.filter(row => row.dataset === dataset).map(row => row.id));
  if (kind === 'changed') unknown.find(row => reviewed.has(String(row[key])))!.unrecorded = true;
  else if (kind === 'untouched') unknown.find(row => !reviewed.has(String(row[key])))!.unrecorded = true;
  else if (kind === 'reordered') unknown.reverse();
  else unknown.pop();
  const snapshot = structuredClone(unknown);
  expect(() => lv3AfterUnitFile('LV3-U09', path, unknown)).toThrow(/drift/);
  expect(unknown).toEqual(snapshot);
  expect(auditHash(lv3AfterUnitFile('LV3-U10', path, current))).toBe(u10ExpectedDocuments[path]);
});

// Current runtime consumers remain current: U10 curriculum/siege expectations
// intentionally require later unit audits not to alter this unit's document.
// Shared words/examples/pack assertions above instead target the sealed U10 state.
it.each(['metadata', 'untouched-collection', 'changed-row', 'order', 'missing-row'])(
  'rejects unknown complete current starter drift before U10 projection: %s', kind => {
    const path = 'public/data/v1/sa-pack.json';
    const unknown = structuredClone(pack);
    if (kind === 'metadata') Object.assign(unknown.meta, {unrecorded: true});
    else if (kind === 'untouched-collection') Object.assign(unknown.media[0], {unrecorded: true});
    else if (kind === 'changed-row') Object.assign(unknown.words.find(word => word.wordId === 'W001787')!, {unrecorded: true});
    else if (kind === 'order') unknown.words.reverse();
    else unknown.words.pop();
    const snapshot = structuredClone(unknown);
    expect(() => lv3AfterUnitFile('LV3-U10', path, unknown)).toThrow(/drift/);
    expect(unknown).toEqual(snapshot);
  },
);

it('rejects unknown current starter raw bytes before historical U10 projection', () => {
  const path = 'public/data/v1/sa-pack.json';
  const currentText = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  expect(() => lv3AfterUnitPublishedText('LV3-U10', path, currentText + ' ')).toThrow(/drift/);
});
