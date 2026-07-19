import { contentDb } from "../db/contentDb";
import { getSetting, progressDb } from "../db/progressDb";
import type { CardState, WordRecord } from "../db/types";
import { todayStr } from "../lib/dates";
import { format } from "date-fns";

export interface QueueItem {
  wordRecord: WordRecord;
  isNew: boolean;
  isRecap?: boolean;
}

export function wasCardCreatedOn(card: CardState, date: string): boolean {
  return !!card.lastReviewedAt && format(new Date(card.createdAt), "yyyy-MM-dd") === date;
}

/** 新字平均穿插進到期複習中，不排在最後。 */
export function interleave(due: WordRecord[], fresh: WordRecord[]): QueueItem[] {
  const result: QueueItem[] = due.map((w) => ({ wordRecord: w, isNew: false }));
  if (fresh.length === 0) return result;
  const step = Math.max(1, Math.floor((due.length + fresh.length) / (fresh.length + 1)));
  fresh.forEach((w, i) => {
    const pos = Math.min(result.length, (i + 1) * step + i);
    result.splice(pos, 0, { wordRecord: w, isNew: true });
  });
  return result;
}

/**
 * 建立今日學習隊列：
 * 1. 所有到期複習卡（不設上限，複習優先）
 * 2. 新字依 wordId 順序補到每日上限，
 *    以 checkIns.newWordsCount 把關——同一天多次開 App 不會多發新字。
 * @param sessionLevels 本次限定的等級（不給則複習全收、新字照學習範圍設定）
 */
export async function buildTodayQueue(sessionLevels?: string[]): Promise<QueueItem[]> {
  const today = todayStr();

  const dueStates = await progressDb.cardStates
    .where("dueDate")
    .belowOrEqual(today)
    .toArray();
  const dueWords = (
    await contentDb.words.where("word").anyOf(dueStates.map((c) => c.word)).toArray()
  )
    .filter((w) => !sessionLevels || sessionLevels.includes(w.level))
    .sort((a, b) => a.wordId.localeCompare(b.wordId));

  const cap = await getSetting<number>("dailyNewWordCap");
  const checkIn = await progressDb.checkIns.get(today);
  const remainingNew = Math.max(0, cap - (checkIn?.newWordsCount ?? 0));

  let freshWords: WordRecord[] = [];
  if (remainingNew > 0) {
    const settingLevels = await getSetting<string[]>("learningLevels");
    const levels = sessionLevels
      ? settingLevels.filter((l) => sessionLevels.includes(l))
      : settingLevels;
    const known = new Set(await progressDb.cardStates.toCollection().primaryKeys());
    freshWords = await contentDb.words
      .orderBy("wordId")
      .filter((w) => levels.includes(w.level) && !known.has(w.word))
      .limit(remainingNew)
      .toArray();
  }

  return interleave(dueWords, freshWords);
}

/** 今日沒有到期卡時，提供剛收服字獸的同日回顧；不應用來推進 SRS。 */
export async function buildTodayRecapQueue(sessionLevels?: string[]): Promise<QueueItem[]> {
  const today = todayStr();
  const todayStates = (await progressDb.cardStates.toArray())
    .filter((card) => wasCardCreatedOn(card, today));
  if (todayStates.length === 0) return [];

  const words = await contentDb.words
    .where("word")
    .anyOf(todayStates.map((card) => card.word))
    .toArray();

  return words
    .filter((word) => !sessionLevels || sessionLevels.includes(word.level))
    .sort((a, b) => a.wordId.localeCompare(b.wordId))
    .map((wordRecord) => ({ wordRecord, isNew: false, isRecap: true }));
}
