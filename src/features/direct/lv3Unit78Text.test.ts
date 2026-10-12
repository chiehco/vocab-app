import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import source7 from '../../../scripts/sources/LV3Unit7.json';
import source8 from '../../../scripts/sources/LV3Unit8.json';
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

beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
});
afterEach(() => vi.unstubAllGlobals());

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
      expect(unit.items.filter(i => i.kind === 'grammar').map(i => [i.pattern, i.sourcePage]))
        .toEqual(source.usage.map(i => [i.label, i.sourcePage]));
      expect(new Set(unit.items.map(i => i.learningItemId)).size).toBe(count + usageCount);
      expect(vocabulary.filter(i => !i.officialWordId).map(i => i.displayWord))
        .toEqual(rows.filter(i => !i.officialWordId).map(i => i.word));
    });

    it('keeps original dictionary identity, explicit variants and meaning provenance', () => {
      for (const [index, row] of rows.entries()) {
        const item = vocabulary[index];
        expect(item.officialWordId).toBe(row.officialWordId);
        if (!row.officialWordId) continue;
        const official = pack.words.find(w => w.wordId === row.officialWordId)!;
        expect(official.word).toBe(row.officialWord);
        expect(official.word === row.word || official.wordVariants.includes(row.word)).toBe(true);
        expect(item.meaningSource).toBe(index < 45 ? 'textbook_transcription' : 'existing_dictionary');
      }
      expect(vocabulary.filter(i => i.meaningSource === 'unmapped_supplement')
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
  const u7 = findUnit(7, 'LV3')!.items;
  const u8 = findUnit(8, 'LV3')!.items;
  expect(u7.find(i => i.displayWord === 'historian')).toMatchObject({sourceRole:'unnumbered_headword',sourcePage:64});
  expect(u7.find(i => i.displayWord === 'vacant')).toMatchObject({sourceRole:'unnumbered_headword',sourcePage:66});
  expect(u7.find(i => i.displayWord === 'copilot')?.sourceRole).toBe('printed_related_word');
  expect(u7.find(i => i.displayWord === 'steal')).toMatchObject({printedNumber:31,sourcePage:72});
  expect(u7.find(i => i.kind === 'grammar' && i.pattern?.includes('crop, copped, cropped'))?.pattern).toContain('待裁決');
  const suspect = u8.filter(i => i.displayWord === 'suspect');
  expect(suspect).toHaveLength(2);
  expect(suspect.map(i => [i.printedNumber, i.sensePos, i.chapterMeaningsZh]))
    .toEqual([[11,'vt.','懷疑；猜想'],[null,'n./adj.','嫌疑犯；可疑的']]);
  expect(new Set(suspect.map(i=>i.learningItemId)).size).toBe(2);
  expect(new Set(suspect.map(i=>i.officialWordId)).size).toBe(1);
  expect(suspect.every(i=>i.sourcePage===76 && !i.officialSenseId)).toBe(true);
  expect(u8.find(i => i.displayWord === 'advertiser')).toMatchObject({sourceRole:'unnumbered_headword',officialWordId:null});
  expect(u8.find(i => i.displayWord === 'advertising')?.sourceRole).toBe('printed_related_word');
  expect(u8.find(i => i.displayWord === 'conscience')?.printedLabel).toBe('衍');
  expect(u8.find(i => i.displayWord === 'element')).toMatchObject({sourcePage:82,printedNumber:36,chapterMeaningsZh:'要素'});
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
