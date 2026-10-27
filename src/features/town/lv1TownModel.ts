import type { ReviewLogEntry, WordRecord } from '../../db/types';
import type { TownBinding } from './townStudy';
import { houseGrowth, type HouseStage } from './houseGrowth';
import { learningHistory, learningLabel, ORDINARY_TOWN_MODES } from './townLearningEvidence';
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
  houseStage: HouseStage;
  legacyHouse: boolean;
  item: LV1TownItem;
  attempted: boolean;
  firstCorrect: boolean;
  latestCorrect: boolean;
  attempts: number;
  latestLearningLabel?: string;
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

/** ReviewLogEntry.word stores the canonical spelling, not a wordId. Unit 1 has no legacy renamed words. */
export function getLV1TownProgress(items: readonly LV1TownItem[], logs: readonly ReviewLogEntry[], bindings:readonly TownBinding[] = items.map(item=>({id:item.id,wordId:item.wordId,word:item.word,keys:[item.word]}))): LV1TownWordProgress[] {
  const historyByItem = learningHistory(bindings, logs);
  return items.map(item => {
    const history = historyByItem.get(item.id) ?? [];
    const firstQuiz = history.find(log=>!ORDINARY_TOWN_MODES.has(log.mode));
    const latest = history.at(-1);
    const growth=houseGrowth(history.map(log=>({id:`review:${log.id ?? `${log.sessionId}:${log.reviewedAt}`}`,at:Date.parse(log.reviewedAt),evidence:log.houseGrowth})));
    return {
      houseStage:growth.stage, legacyHouse:growth.legacy,
      item,
      attempted: history.length > 0,
      firstCorrect: (firstQuiz?.grade ?? 0) > 0,
      latestCorrect: (latest?.grade ?? 0) > 0,
      attempts: history.length,
      latestLearningLabel: latest ? learningLabel(latest) : undefined,
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
