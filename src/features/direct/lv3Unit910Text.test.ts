import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import source9 from '../../../scripts/sources/LV3Unit9.json';
import source10 from '../../../scripts/sources/LV3Unit10.json';
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

beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
});
afterEach(() => vi.unstubAllGlobals());

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
        expect(item.meaningSource).toBe(index < headCount ? 'textbook_transcription' : 'existing_dictionary');
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
  const words=siegeUnitWords('LV3',unit,[]);
  expect(words).toHaveLength(count);
  expect(words.some(([,meaning])=>meaning.includes('義項待核對'))).toBe(false);
  for(const word of kept) {
    const item=findUnit(unit,'LV3')!.items.find(i=>i.displayWord===word)!;
    expect(item.officialWordId).toBeNull();
    expect(words).toContainEqual([word.toUpperCase(),item.chapterMeaningsZh]);
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
