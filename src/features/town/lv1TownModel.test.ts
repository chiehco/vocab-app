import { describe, expect, it } from 'vitest';
import words from '../../../public/data/v1/words.json';
import type { ReviewLogEntry, WordRecord } from '../../db/types';
import { PROGRESS_RENAMES } from '../../db/progressRenames';
import {
  getLV1TownItems, getLV1TownNewBatch, getLV1TownOldBatch, getLV1TownProgress,
  LV1_TOWN_BATCH_SIZE, LV1_TOWN_SOURCE_CARDS,
} from './lv1TownModel';

const items = getLV1TownItems(words as WordRecord[]);
function log(word: string, id: number, changes: Partial<ReviewLogEntry> = {}): ReviewLogEntry {
  return {
    id, word, reviewedAt: new Date(Date.UTC(2026, 9, 9, 0, 0, id)).toISOString(),
    sessionId: `session-${id}`, grade: 2, mode: 'quiz-w2m', schedulingApplied: false,
    intervalBefore: 0, intervalAfter: 0, easeFactorBefore: 2.5, easeFactorAfter: 2.5,
    ...changes,
  };
}

describe('LV1 Unit 1 town', () => {
  it('joins all 38 reviewed cards by official ID, including woman despite its dictionary level', () => {
    expect(LV1_TOWN_SOURCE_CARDS).toHaveLength(38);
    expect(items).toHaveLength(38);
    expect(new Set(items.map(item => item.wordId)).size).toBe(38);
    expect(items.map(item => item.id)).toEqual(LV1_TOWN_SOURCE_CARDS.map(card => card.id));
    const woman = items.find(item => item.word === 'woman')!;
    expect(words.find(word => word.wordId === woman.wordId)?.level).toBe('LV2');
    expect(PROGRESS_RENAMES.some(rename => items.some(item => item.wordId === rename.wordId))).toBe(false);
    for (const item of items) {
      const official = words.find(word => word.wordId === item.wordId)!;
      expect(item.meaningZh).toBe(official.meaningZh);
      expect(item.word).toBe(official.word);
    }
  });

  it('does not fabricate missing dictionary records, infer IDs from spellings, or shorten polysemous meanings', () => {
    expect(getLV1TownItems([])).toEqual([]);
    const boy = words.find(word => word.wordId === items[0].wordId)!;
    expect(getLV1TownItems([{ ...boy, wordId: 'W999999' } as WordRecord])).toEqual([]);
    expect(getLV1TownItems([{ ...boy, meaningZh: null } as WordRecord])).toEqual([]);
    const kid = items.find(item => item.word === 'kid')!;
    expect(kid.meaningZh).toBe(words.find(word => word.wordId === kid.wordId)!.meaningZh);
    expect(kid.meaningZh).toContain('；');
  });

  it('starts empty and offers five new words without filling the final batch with old words', () => {
    expect(LV1_TOWN_BATCH_SIZE).toBe(5);
    expect(getLV1TownProgress(items, []).every(row => !row.attempted && !row.firstCorrect && !row.latestCorrect && row.attempts === 0)).toBe(true);
    expect(getLV1TownNewBatch(items, [])).toEqual(items.slice(0, 5));
    expect(getLV1TownNewBatch(items, [], 20)).toHaveLength(5);
    expect(getLV1TownNewBatch(items, [], -1)).toEqual([]);
    const logs = items.slice(0, 36).map((item, index) => log(item.word, index));
    expect(getLV1TownNewBatch(items, logs)).toEqual(items.slice(36));
    expect(getLV1TownNewBatch(items, items.map((item, index) => log(item.word, index)))).toEqual([]);
  });

  it('counts only saved quiz evidence and matches log words rather than mistaking word IDs for spellings', () => {
    const ignored: ReviewLogEntry[] = [
      log(items[0].word, 1, { mode: 'flashcard' }),
      log(items[0].word, 2, { mode: 'known' }),
      log(items[0].word, 3, { mode: 'same-day-recap' }),
      log(items[0].word, 4, { mode: 'slash' }),
      log(items[0].wordId, 5), log('not-in-this-unit', 6),
    ];
    expect(getLV1TownProgress(items, ignored).every(row => !row.attempted)).toBe(true);
    const modes = ['quiz-w2m', 'quiz-m2w', 'quiz-image', 'fill-blank'] as const;
    const included = modes.map((mode, index) => log(items[index].word, 10 + index, { mode }));
    expect(getLV1TownProgress(items, [...ignored, ...included]).filter(row => row.attempted)).toHaveLength(4);
  });

  it('retains the first mistake, applies the latest answer, and keeps a house after a later failure', () => {
    const wrong = log(items[0].word, 1, { grade: 0 });
    const right = log(items[0].word, 2);
    expect(getLV1TownProgress(items, [right, wrong])[0]).toMatchObject({ attempted: true, firstCorrect: false, latestCorrect: true, attempts: 2 });
    const laterWrong = log(items[0].word, 3, { grade: 0 });
    expect(getLV1TownProgress(items, [right, laterWrong, wrong])[0]).toMatchObject({ attempted: true, firstCorrect: false, latestCorrect: false, attempts: 3 });
  });

  it('deduplicates repeated log IDs without merging distinct answers made at the same time', () => {
    const first = log(items[0].word, 1, { grade: 0 });
    const second = log(items[0].word, 2, { reviewedAt: first.reviewedAt });
    const logs = [second, first, first, second];
    const before = structuredClone(logs);
    const progress = getLV1TownProgress(items, logs);
    expect(progress[0]).toMatchObject({ attempts: 2, firstCorrect: false, latestCorrect: true });
    expect(progress.filter(row => row.attempted)).toHaveLength(1);
    expect(logs).toEqual(before);
  });

  it('retains separate optional-ID evidence instead of treating every missing ID as one answer', () => {
    const logs = [log(items[0].word, 1, { id: undefined }), log(items[0].word, 2, { id: undefined, grade: 0 })];
    expect(getLV1TownProgress(items, logs)[0]).toMatchObject({ attempts: 2, latestCorrect: false });
  });

  it('prioritizes mistakes and rotates correct old words fairly by practice count', () => {
    const initial = items.slice(0, 10).map((item, index) => log(item.word, index + 1));
    const firstBatch = getLV1TownOldBatch(items, initial);
    expect(firstBatch).toEqual(items.slice(0, 5));
    const afterRound = [...initial, ...firstBatch.map((item, index) => log(item.word, 20 + index))];
    expect(getLV1TownOldBatch(items, afterRound)).toEqual(items.slice(5, 10));
    const afterMistake = [...afterRound, log(items[0].word, 30, { grade: 0 })];
    expect(getLV1TownOldBatch(items, afterMistake)[0]).toEqual(items[0]);
    expect(getLV1TownOldBatch(items, [])).toEqual([]);
  });
});
