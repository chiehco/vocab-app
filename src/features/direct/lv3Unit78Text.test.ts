import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import source7 from '../../../scripts/sources/LV3Unit7.json';
import source8 from '../../../scripts/sources/LV3Unit8.json';
import curriculum7 from './curriculumLV3Unit7.json';
import curriculum8 from './curriculumLV3Unit8.json';
import { lv3AfterUnitFile } from './lv3Audit.testSupport';
import pack from '../../../public/data/v1/sa-pack.json';
import { allQuestions, findUnit, REVISION, templateGroup, validGroup } from './model';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { getOrCreateTemplateGroup, saveGroup } from './store';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds, reviewedExample } from '../vocabulary/model';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { ensureContentAvailable, refreshInstalledContent } from '../../db/seed';
import { gradeFlashcard } from '../../checkin/recordActivity';
import { trustedVerbForms } from '../browser/meaningRecords';

beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
});
afterEach(() => vi.unstubAllGlobals());

// Authenticate the complete current runtime document before restoring U07's
// original printed text/provenance. Install and progress tests use current data.
function originalU7Items() {
  return lv3AfterUnitFile('LV3-U06', 'src/features/direct/curriculumLV3Unit7.json',
    { ...curriculum7, learningItems: findUnit(7, 'LV3')!.items }).learningItems;
}


// Authenticate all current U08 rows and template metadata before restoring the
// original source checkpoint. Current data still drives installs and updates.
function originalU8Items() {
  return lv3AfterUnitFile('LV3-U07', 'src/features/direct/curriculumLV3Unit8.json',
    { ...curriculum8, learningItems: findUnit(8, 'LV3')!.items }).learningItems;
}

for (const [source, count, usageCount, mappedCount] of [
  [source7, 100, 53, 84], [source8, 98, 49, 81],
] as const) {
  const unit = findUnit(source.unit, 'LV3')!;
  const vocabulary = unit.items.filter(i => i.kind === 'vocabulary');
  const rows = [...source.headwords, ...source.related];
  describe(`LV3 U${source.unit} checked text delivery`, () => {
    it('keeps the complete printed headword, supplement and usage scope in book order', () => {
      expect(unit.deliveryMode).toBe('text_only');
      expect(textbookUnits.find(u => u.level === 'LV3' && u.unit === source.unit))
        .toMatchObject({ count, usageCount, partial: false });
      expect(vocabulary.slice(0, 45).map(i => i.displayWord)).toEqual(source.headwordOrder);
      expect(vocabulary.slice(45).map(i => [i.displayWord, i.sourcePage, i.printedLabel]))
        .toEqual(source.related.map(i => [i.word, i.sourcePage, i.printedLabel]));
      const originalItems = source.unit === 7 ? originalU7Items() : originalU8Items();
      expect(originalItems.filter(i => i.kind === 'grammar').map(i => [i.pattern, i.sourcePage]))
        .toEqual(source.usage.map(i => [i.label, i.sourcePage]));
      expect(new Set(unit.items.map(i => i.learningItemId)).size).toBe(count + usageCount);
      expect(vocabulary.filter(i => !i.officialWordId).map(i => i.displayWord))
        .toEqual(rows.filter(i => !i.officialWordId).map(i => i.word));
    });

    it('keeps original dictionary identity, explicit variants and meaning provenance', () => {
      const originalVocabulary = (source.unit === 7 ? originalU7Items() : originalU8Items())
        .filter(i => i.kind === 'vocabulary');
      for (const [index, row] of rows.entries()) {
        const item = vocabulary[index];
        expect(item.officialWordId).toBe(row.officialWordId);
        if (!row.officialWordId) continue;
        const official = pack.words.find(w => w.wordId === row.officialWordId)!;
        expect(official.word).toBe(row.officialWord);
        expect(official.word === row.word || official.wordVariants.includes(row.word)).toBe(true);
        expect(originalVocabulary[index].meaningSource).toBe(index < 45 ? 'textbook_transcription' : 'existing_dictionary');
      }
      const originalUnmapped = originalVocabulary.filter(i => i.meaningSource === 'unmapped_supplement');
      const sourceUnmapped = source.related.filter(i => !i.officialWordId);
      expect(sourceUnmapped.length).toBeGreaterThan(0);
      expect(originalUnmapped.map(i => i.displayWord)).toEqual(sourceUnmapped.map(i => i.word));
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

it('retains omitted heads, printed pages and the two distinct suspect blocks', () => {
  const u7 = originalU7Items();
  const u8 = originalU8Items();
  expect(u7.find(i => i.displayWord === 'historian')).toMatchObject({sourceRole:'unnumbered_headword',sourcePage:64});
  expect(u7.find(i => i.displayWord === 'vacant')).toMatchObject({sourceRole:'unnumbered_headword',sourcePage:66});
  expect(u7.find(i => i.displayWord === 'copilot')?.sourceRole).toBe('printed_related_word');
  expect(u7.find(i => i.displayWord === 'steal')).toMatchObject({printedNumber:31,sourcePage:72});
  expect(u7.find(i => i.kind === 'grammar' && i.pattern?.includes('crop, copped, cropped'))?.pattern).toContain('待裁決');
  const suspect = u8.filter(i => i.displayWord === 'suspect');
  expect(suspect).toHaveLength(2);
  expect(suspect[0]).toMatchObject({printedNumber:11,sensePos:'vt.',chapterMeaningsZh:'懷疑；猜想'});
  expect(suspect[1]).toMatchObject({printedNumber:null,sensePos:'n./adj.',chapterMeaningsZh:'嫌疑犯；可疑的'});
  expect(new Set(suspect.map(i=>i.learningItemId)).size).toBe(2);
  expect(new Set(suspect.map(i=>i.officialWordId)).size).toBe(1);
  expect(suspect.every(i=>i.sourcePage===76 && !i.officialSenseId)).toBe(true);
  expect(u8.find(i => i.displayWord === 'advertiser')).toMatchObject({sourceRole:'unnumbered_headword',officialWordId:null});
  expect(u8.find(i => i.displayWord === 'advertising')?.sourceRole).toBe('printed_related_word');
  expect(u8.find(i => i.displayWord === 'conscience')?.printedLabel).toBe('衍');
  expect(u8.find(i => i.displayWord === 'element')).toMatchObject({sourcePage:82,printedNumber:36,chapterMeaningsZh:'要素'});
});

it('keeps the current reviewed crop correction and provenance while rejecting unknown drift', () => {
  const delivered = { ...curriculum7, learningItems: findUnit(7, 'LV3')!.items };
  expect(delivered.learningItems.find(i => i.learningItemId === 'LI-LV3U07-G036'))
    .toMatchObject({
      pattern: 'crop, cropped, cropped（三態；原書第二態 copped 為誤植）',
      sourcePage: 69, review: 'source_checked_text_only', practiceMode: 'read_only',
    });
  expect(delivered.learningItems.find(i => i.displayWord === 'rally')).toMatchObject({
    officialWordId: 'W004703', meaningSource: 'textbook_and_dictionary_review',
    review: 'source_checked_text_only', practiceMode: 'read_only',
  });
  const unknownPattern = structuredClone(delivered);
  unknownPattern.learningItems.find(i => i.learningItemId === 'LI-LV3U07-G036')!.pattern += ' unrecorded';
  expect(() => lv3AfterUnitFile('LV3-U06', 'src/features/direct/curriculumLV3Unit7.json', unknownPattern))
    .toThrow(/drift/);
  const unknownProvenance = structuredClone(delivered);
  unknownProvenance.learningItems.find(i => i.displayWord === 'rally')!.meaningSource = 'existing_dictionary';
  expect(() => lv3AfterUnitFile('LV3-U06', 'src/features/direct/curriculumLV3Unit7.json', unknownProvenance))
    .toThrow(/drift/);
  const unknownUnpatched = structuredClone(delivered);
  unknownUnpatched.learningItems.find(i => i.displayWord === 'historian')!.sourcePage = 999;
  expect(() => lv3AfterUnitFile('LV3-U06', 'src/features/direct/curriculumLV3Unit7.json', unknownUnpatched))
    .toThrow(/drift/);
});


it('keeps current U08 source corrections and rejects unknown full-document drift', () => {
  const path = 'src/features/direct/curriculumLV3Unit8.json';
  const delivered = { ...curriculum8, learningItems: findUnit(8, 'LV3')!.items };
  expect(lv3AfterUnitFile('LV3-U08', path, delivered)).toEqual(delivered);
  expect(delivered.learningItems.find(i => i.learningItemId === 'LI-LV3U08-V039'))
    .toMatchObject({
      targetMeaningZh: '燃料；添加燃料；激起（憤怒等）',
      chapterMeaningsZh: '燃料；添加燃料；激起（憤怒等）',
      sourcePage: 81, review: 'source_checked_text_only', practiceMode: 'read_only',
    });
  expect(delivered.learningItems.find(i => i.displayWord === 'protect')).toMatchObject({
    officialWordId: 'W001685', sensePos: 'vt.', targetMeaningZh: '保護；防護',
    meaningSource: 'textbook_source_review',
  });
  const originalUnmappedWords = source8.related.filter(i => !i.officialWordId).map(i => i.word);
  expect(originalUnmappedWords).toHaveLength(14);
  const reviewedSupplements = delivered.learningItems.filter(i => originalUnmappedWords.includes(i.displayWord ?? ''));
  expect(reviewedSupplements.map(i => i.displayWord)).toEqual(originalUnmappedWords);
  expect(reviewedSupplements.every(i => i.officialWordId === null
    && i.meaningSource === 'textbook_source_review' && i.targetMeaningZh
    && i.targetMeaningZh !== '教材補充詞；義項待核對。' && i.practiceMode === 'read_only')).toBe(true);
  for (const [id, pattern, clarification] of [
    ['LI-LV3U08-G007', 'be native to + 地方', '並不表示只在該地存在'],
    ['LI-LV3U08-G008', 'be unique to + 地方', '三者不可一概互換'],
    ['LI-LV3U08-G009', 'be indigenous to + 地方', '原生不必然是該地所獨有'],
  ]) {
    const item = delivered.learningItems.find(i => i.learningItemId === id)!;
    expect(item).toMatchObject({ pattern, sourcePage: 73, practiceMode: 'read_only' });
    expect(item.explanationZh).toContain(clarification);
  }
  const unknownMeaning = structuredClone(delivered);
  unknownMeaning.learningItems.find(i => i.learningItemId === 'LI-LV3U08-V039')!.targetMeaningZh += ' unrecorded';
  const unknownProvenance = structuredClone(delivered);
  unknownProvenance.learningItems.find(i => i.displayWord === 'protect')!.meaningSource = 'existing_dictionary';
  const unknownExplanation = structuredClone(delivered);
  unknownExplanation.learningItems.find(i => i.learningItemId === 'LI-LV3U08-G007')!.explanationZh += ' unrecorded';
  const unknownUnpatched = structuredClone(delivered);
  unknownUnpatched.learningItems.find(i => i.displayWord === 'protection')!.sourcePage = 999;
  const unknownTemplate = { ...delivered, template: { ...delivered.template, unrecorded: true } };
  for (const unknown of [unknownMeaning, unknownProvenance, unknownExplanation, unknownUnpatched, unknownTemplate]) {
    expect(() => lv3AfterUnitFile('LV3-U07', path, unknown)).toThrow(/drift/);
  }
});

it('retains U08 ordinary-card rare meanings, verified forms and corrected example POS', () => {
  const morale = pack.words.find(w => w.wordId === 'W005581')!;
  expect(morale).toMatchObject({ word: 'morale', meaningZh: '士氣；道德' });
  expect(findUnit(8, 'LV3')!.items.find(i => i.displayWord === 'morale')?.targetMeaningZh).toBe('士氣');
  const fuel = pack.words.find(w => w.wordId === 'W002350')!;
  expect(trustedVerbForms(fuel)).toEqual({
    base: 'fuel', past: 'fueled / fuelled', pastParticiple: 'fueled / fuelled',
    sourceRef: 'https://www.collinsdictionary.com/dictionary/english/fuel', status: 'approved',
  });
  const discomfort = pack.words.find(w => w.wordId === 'W005269')!;
  expect(trustedVerbForms(discomfort)).toEqual({
    base: 'discomfort', past: 'discomforted', pastParticiple: 'discomforted',
    sourceRef: 'https://www.oxfordlearnersdictionaries.com/definition/english/discomfort_2', status: 'approved',
  });
  expect(pack.words.find(w => w.wordId === 'W002136')?.usagePattern).toBe('the cattle; two/many cattle; cattle of N');
  expect(pack.examples.find(e => e.exampleId === 'EXc280e310')).toMatchObject({
    word: 'ad', sensePos: 'n.',
    sentenceEn: 'I saw an ad for a used bicycle in the local newspaper yesterday.',
    blankSentence: 'I saw an _____ for a used bicycle in the local newspaper yesterday.',
    answer: 'ad', status: 'reviewed',
  });
});

it('updating the starter resolves both new units and retains progress and personal groups', async () => {
  const units = [findUnit(7, 'LV3')!, findUnit(8, 'LV3')!];
  const ids = [...new Set(units.flatMap(u => groupWordIds(templateGroup(u.templateId))))];
  const oldWords = pack.words.filter(w => !ids.includes(w.wordId));
  let incoming = { ...pack, words: oldWords, meta: { ...pack.meta, contentHash: 'sa:before-U7-U8',
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
