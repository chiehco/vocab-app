import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { lv3AfterUnitFile } from '../direct/lv3Audit.testSupport';
import { eligibleWords, scriptJson, siegeUnitWords } from './model';
import { curriculumUnits, type LearningItem } from '../direct/model';
import { lv1ReviewedGroups } from '../direct/lv1ReviewedGroups';
import type { WordRecord } from '../../db/types';

describe('siege unit scope', () => {
  it('keeps exact spellings and excludes unsupported forms instead of changing answers', () => {
    expect(eligibleWords([['apple', '蘋果'], ['APPLE', '重複'], ['shoe(s)', '鞋'], ['ice cream', '冰淇淋'], ['long-term', '長期'], ['cat', ''], ['A', '一'], ['abcdefghijklmnopq', '過長']])).toEqual([['APPLE', '蘋果']]);
  });
  it('only uses the selected textbook unit and its meanings', () => {
    const words = siegeUnitWords('LV4', 20, []);
    expect(words.length).toBeGreaterThan(3);
    const source = curriculumUnits.find(u => u.level === 'LV4' && u.unit === 20)!;
    for (const [word, meaning] of words) expect(source.items.some(i => i.kind === 'vocabulary' && i.displayWord?.toUpperCase() === word && i.targetMeaningZh === meaning)).toBe(true);
    expect(siegeUnitWords('LV4', 99, [])).toEqual([]);
    expect(siegeUnitWords('LV1', 1, [])).toEqual([]);
  });
  it.each([
    { unit: 4, reading: 122, pending: 14, before: 120, playable: 108, excluded: ['OCCASIONALLY', 'CONSCIOUSNESS'], retained: ['awareness', 'elective'] },
    { unit: 5, reading: 112, pending: 20, before: 109, playable: 90, excluded: ['CONSOLIDATE', 'WINNER'], retained: [] },
    { unit: 6, reading: 105, pending: 20, before: 103, playable: 85, excluded: ['LOST', 'CHEETAH'], retained: ['practically', 'warning'] },
  ])('excludes pending supplement clues from LV3 Unit $unit while retaining textbook reading', ({ unit, reading, pending, before, playable, excluded, retained }) => {
    // Keep the historical pending-supplement fixture, authenticated by the sealed audit chain.
    const path = `src/features/direct/curriculumLV3Unit${unit}.json`;
    const historical = lv3AfterUnitFile('LV3-U02', path, JSON.parse(readFileSync(path, 'utf8')));
    const source = { ...curriculumUnits.find(u => u.level === 'LV3' && u.unit === unit)!, items: historical.learningItems as LearningItem[] };
    const vocabulary = source.items.filter(i => i.kind === 'vocabulary');
    expect(vocabulary).toHaveLength(reading);
    expect(vocabulary.filter(i => i.meaningSource === 'unmapped_supplement')).toHaveLength(pending);
    expect(eligibleWords(vocabulary.map(i => [i.displayWord ?? '', i.targetMeaningZh ?? '']))).toHaveLength(before);

    // Exercise the real siege selector with only its unit lookup replaced for this historical case.
    const historicalUnits = curriculumUnits.map(u => u.level === 'LV3' && u.unit === unit ? source : u);
    const lookup = vi.spyOn(curriculumUnits, 'find').mockImplementation((predicate, thisArg) => historicalUnits.find(predicate, thisArg));
    let words: ReturnType<typeof siegeUnitWords>;
    try {
      words = siegeUnitWords('LV3', unit, []);
    } finally {
      lookup.mockRestore();
    }
    expect(words).toHaveLength(playable);
    expect(words.some(([, meaning]) => meaning === '教材補充詞；義項待核對。')).toBe(false);
    for (const spelling of excluded) expect(words.some(([word]) => word === spelling)).toBe(false);
    for (const spelling of retained) {
      const item = vocabulary.find(i => i.displayWord === spelling)!;
      expect(item.officialWordId).toBeNull();
      expect(item.meaningSource).toBe('textbook_transcription');
      expect(words).toContainEqual([spelling.toUpperCase(), item.targetMeaningZh]);
    }
    // Excluding a game clue must not remove its read-only textbook item.
    expect(source.items.filter(i => i.meaningSource === 'unmapped_supplement')).toHaveLength(pending);
  });
  it('escapes script terminators while retaining the original JSON values', () => {
    const input = [['</script><script>alert(1)</script>', '中文']];
    const encoded = scriptJson(input);
    expect(encoded).not.toContain('<');
    expect(JSON.parse(encoded)).toEqual(input);
  });
});

it('uses LV1 text units and preserves existing reviewed-image groups', () => {
  const source = curriculumUnits.find(u => u.level === 'LV1' && u.unit === 16)!;
  const rows = source.items.filter(i => i.kind === 'vocabulary' && i.meaningSource !== 'unmapped_supplement');
  expect(siegeUnitWords('LV1', 16, [])).toEqual(eligibleWords(rows.map(i => [i.displayWord ?? '', i.targetMeaningZh ?? ''])));
  const group = lv1ReviewedGroups.find(g => g.unit === 1)!;
  const dictionary = [{wordId: group.wordIds[0], word: 'apple', meaningZh: '蘋果'}, {wordId:'unrelated',word:'banana',meaningZh:'香蕉'}] as WordRecord[];
  expect(siegeUnitWords('LV1', 1, dictionary)).toEqual([['APPLE','蘋果']]);
  expect(siegeUnitWords('LV1', 99, dictionary)).toEqual([]);
});
