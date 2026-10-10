import type { ReviewLogEntry, ReviewMode, WordRecord } from '../../db/types';
import reviewedCards from '../vocabulary/lv1ReviewedImages.json';

export const LV1_TOWN_SOURCE_CARDS = reviewedCards.filter(card => card.unit === 1);
export const LV1_TOWN_BATCH_SIZE = 5;

export interface LV1TownItem {
  id: string;
  wordId: string;
  word: string;
  meaningZh: string;
  pos: string;
  illustration: { path: string; captionEn: string; captionZh: string };
}

export interface LV1TownWordProgress {
  item: LV1TownItem;
  attempted: boolean;
  firstCorrect: boolean;
  latestCorrect: boolean;
  attempts: number;
}

/** The textbook's Unit 1 membership wins over dictionary level; woman is filed under LV2. */
export function getLV1TownItems(words: readonly WordRecord[]): LV1TownItem[] {
  const byId = new Map(words.map(word => [word.wordId, word]));
  const seen = new Set<string>();
  return LV1_TOWN_SOURCE_CARDS.flatMap(card => {
    const word = card.officialWordId ? byId.get(card.officialWordId) : undefined;
    if (!word?.meaningZh?.trim() || seen.has(word.wordId)) return [];
    seen.add(word.wordId);
    return [{
      id: card.id,
      wordId: word.wordId,
      word: word.word,
      // Keep the official meaning intact: its first fragment is not necessarily the image's sense.
      meaningZh: word.meaningZh,
      pos: word.pos ?? '',
      illustration: card.illustration,
    }];
  });
}

const PRACTICE_MODES = new Set<ReviewMode>(['quiz-w2m', 'quiz-m2w', 'quiz-image', 'fill-blank']);

/** ReviewLogEntry.word stores the canonical spelling, not a wordId. Unit 1 has no legacy renamed words. */
export function getLV1TownProgress(items: readonly LV1TownItem[], logs: readonly ReviewLogEntry[]): LV1TownWordProgress[] {
  const words = new Set(items.map(item => item.word));
  const seenIds = new Set<number>();
  const historyByWord = new Map<string, ReviewLogEntry[]>();
  const eligible = logs.filter(log => PRACTICE_MODES.has(log.mode) && words.has(log.word))
    .sort((a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt) || (a.id ?? 0) - (b.id ?? 0));
  for (const log of eligible) {
    if (log.id !== undefined && seenIds.has(log.id)) continue;
    if (log.id !== undefined) seenIds.add(log.id);
    const history = historyByWord.get(log.word) ?? [];
    history.push(log);
    historyByWord.set(log.word, history);
  }
  return items.map(item => {
    const history = historyByWord.get(item.word) ?? [];
    return {
      item,
      attempted: history.length > 0,
      firstCorrect: (history[0]?.grade ?? 0) > 0,
      latestCorrect: (history.at(-1)?.grade ?? 0) > 0,
      attempts: history.length,
    };
  });
}

function batchSize(limit: number): number {
  return Number.isFinite(limit) ? Math.max(0, Math.min(LV1_TOWN_BATCH_SIZE, Math.floor(limit))) : LV1_TOWN_BATCH_SIZE;
}

export function getLV1TownNewBatch(items: readonly LV1TownItem[], logs: readonly ReviewLogEntry[], limit = LV1_TOWN_BATCH_SIZE): LV1TownItem[] {
  return getLV1TownProgress(items, logs).filter(row => !row.attempted).slice(0, batchSize(limit)).map(row => row.item);
}

/** Free practice, not a due queue: mistakes first, then the least-practiced words in each group. */
export function getLV1TownOldBatch(items: readonly LV1TownItem[], logs: readonly ReviewLogEntry[], limit = LV1_TOWN_BATCH_SIZE): LV1TownItem[] {
  return getLV1TownProgress(items, logs).filter(row => row.attempted)
    .sort((a, b) => Number(a.latestCorrect) - Number(b.latestCorrect) || a.attempts - b.attempts)
    .slice(0, batchSize(limit)).map(row => row.item);
}
