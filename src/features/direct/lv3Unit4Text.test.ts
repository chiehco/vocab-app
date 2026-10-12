import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import source from '../../../scripts/sources/LV3Unit4.json';
import pack from '../../../public/data/v1/sa-pack.json';
import { curriculumUnits, findUnit, templateGroup, validGroup, allQuestions, REVISION } from './model';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { getOrCreateTemplateGroup, saveGroup } from './store';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { ensureContentAvailable, refreshInstalledContent } from '../../db/seed';
import { gradeFlashcard } from '../../checkin/recordActivity';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds, reviewedExample } from '../vocabulary/model';
import type { WordRecord } from '../../db/types';

const unit = findUnit(4, 'LV3')!;
const vocabulary = unit.items.filter(i => i.kind === 'vocabulary');
const mapped = groupWordIds(templateGroup(unit.templateId));

beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
});
afterEach(() => vi.unstubAllGlobals());

describe('LV3 U4 checked text delivery', () => {
  it('registers exactly one new unit and preserves printed headword, supplement and usage order', () => {
    expect(curriculumUnits.filter(u => u.level === 'LV3').map(u => u.unit)).toEqual([1, 2, 4]);
    expect(unit.deliveryMode).toBe('text_only');
    expect(textbookUnits.find(u => u.level === 'LV3' && u.unit === 4)).toMatchObject({count: 122, usageCount: 61, partial: false});
    expect(vocabulary.slice(0, 45).map(i => i.displayWord)).toEqual(source.headwordOrder);
    expect(vocabulary.slice(45).map(i => [i.displayWord, i.sourcePage, i.printedLabel]))
      .toEqual(source.related.map(i => [i.word, i.sourcePage, i.printedLabel]));
    expect(unit.items.filter(i => i.kind === 'grammar').map(i => [i.pattern, i.sourcePage]))
      .toEqual(source.usage.map(i => [i.label, i.sourcePage]));
    expect(new Set(unit.items.map(i => i.learningItemId)).size).toBe(183);
    expect(vocabulary.filter(i => !i.officialWordId).map(i => i.displayWord)).toEqual([
      'awareness', 'elective', 'occasionally', 'experimentation', 'unaware', 'consciousness',
      'replaceable', 'info', 'vulgar', 'civilized', 'editor-in-chief', 'unfamiliar',
      'explorer', 'top-notch', 'spoken', 'prawn',
    ]);
  });

  it('does not adopt pending pictures, captions, senses or textbook questions', () => {
    expect(unit.items.every(i => !i.illustration && !i.originalExample && !i.officialSenseId)).toBe(true);
    expect(unit.questions).toEqual([]);
    expect(practiceIds(unit.items)).toEqual([]);
    expect(unit.items.every(i => !reviewedExample(i))).toBe(true);
    expect(allQuestions.some(q => unit.items.some(i => i.learningItemId === q.learningItemId))).toBe(false);
    expect(vocabulary.find(i => i.displayWord === 'oral')).toMatchObject({chapterMeaningsZh: '口語的'});
    expect(vocabulary.find(i => i.displayWord === 'experiment')).toMatchObject({sensePos: 'n./vi.', chapterMeaningsZh: '實驗；試驗'});
    expect(vocabulary.find(i => i.displayWord === 'faith')?.originalExample).toBeUndefined();
    expect(REVISION).toBe('20260912-1'); // Existing saved sessions retain their revision.
  });

  it('fresh install resolves every existing mapping and keeps unmapped supplements in the full group', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(pack))));
    await ensureContentAvailable();
    const group = templateGroup(unit.templateId);
    expect(validGroup(group)).toBe(true);
    expect(group.itemIds).toHaveLength(183);
    expect(mapped).toHaveLength(106);
    expect((await contentDb.words.bulkGet(mapped)).every(Boolean)).toBe(true);
    expect(resolveGroupWords(group, await contentDb.words.toArray())).toHaveLength(106);
    for (const item of vocabulary.filter(i => i.officialWordId)) {
      expect((await contentDb.words.get(item.officialWordId!))?.word).toBe(item.displayWord);
    }
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
  });

  it('lightweight content update preserves all progress, sessions and edited template groups', async () => {
    const oldWords = pack.words.filter(w => !mapped.includes(w.wordId));
    const oldPack = {...pack, words: oldWords, meta: {...pack.meta,
      contentHash: 'sa:before-U4', counts: {...pack.meta.counts, words: oldWords.length}}};
    let incoming = oldPack;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(incoming))));
    await ensureContentAvailable();
    const oldWord = oldWords[0] as WordRecord;
    await gradeFlashcard(oldWord.word, 2, 'update-proof', true);
    const {group} = await getOrCreateTemplateGroup(unit.templateId);
    await saveGroup({...group, name: '保留個人名稱', itemIds: [...group.itemIds].reverse()});
    await progressDb.settings.put({key: 'fontScale', value: 1.15});
    const before = await Promise.all(progressDb.tables.map(table => table.toArray()));
    incoming = pack;
    await refreshInstalledContent();
    expect((await contentDb.words.bulkGet(mapped)).every(Boolean)).toBe(true);
    expect(await Promise.all(progressDb.tables.map(table => table.toArray()))).toEqual(before);
    const resumed = await getOrCreateTemplateGroup(unit.templateId);
    expect(resumed.added).toBe(false);
    expect(resumed.group.name).toBe('保留個人名稱');
    expect(resumed.group.itemIds).toEqual([...group.itemIds].reverse());
  });
});
