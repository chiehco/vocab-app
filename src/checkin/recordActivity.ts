import { progressDb } from "../db/progressDb";
import type { CardState, Grade, ReviewMode } from "../db/types";
import { applyGrade, newCardState } from "../srs/sm2";
import { todayStr } from "../lib/dates";

async function upsertCheckIn(isNewWord: boolean, isNewSession: boolean): Promise<void> {
  const today = todayStr();
  const existing = await progressDb.checkIns.get(today);
  await progressDb.checkIns.put({
    date: today,
    reviewCount: (existing?.reviewCount ?? 0) + 1,
    newWordsCount: (existing?.newWordsCount ?? 0) + (isNewWord ? 1 : 0),
    sessionsCount: (existing?.sessionsCount ?? 0) + (isNewSession ? 1 : 0),
  });
}

/** 單字卡評分：更新 SM-2 狀態 + 寫入歷史 + 打卡，同一交易完成。 */
export async function gradeFlashcard(
  word: string,
  grade: Grade,
  sessionId: string,
  isNewSession: boolean,
  mode: ReviewMode = "flashcard",
): Promise<CardState> {
  const today = todayStr();
  return progressDb.transaction(
    "rw",
    [progressDb.cardStates, progressDb.reviewLogs, progressDb.checkIns],
    async () => {
      const existing = await progressDb.cardStates.get(word);
      const isNewWord = !existing;
      const before = existing ?? newCardState(word, today);
      const after = applyGrade(before, grade, today);

      await progressDb.cardStates.put(after);
      await progressDb.reviewLogs.add({
        word,
        reviewedAt: new Date().toISOString(),
        sessionId,
        grade,
        intervalBefore: before.intervalDays,
        intervalAfter: after.intervalDays,
        easeFactorBefore: before.easeFactor,
        easeFactorAfter: after.easeFactor,
        mode,
      });
      await upsertCheckIn(isNewWord, isNewSession);
      return after;
    },
  );
}

/** 記錄同日回顧，但不推進 SRS 間隔或到期日。 */
export async function recordReviewWithoutScheduling(
  word: string,
  grade: Grade,
  sessionId: string,
  isNewSession: boolean,
): Promise<void> {
  await progressDb.transaction(
    "rw",
    [progressDb.cardStates, progressDb.reviewLogs, progressDb.checkIns],
    async () => {
      const card = await progressDb.cardStates.get(word);
      if (!card) return;
      await progressDb.reviewLogs.add({
        word,
        reviewedAt: new Date().toISOString(),
        sessionId,
        grade,
        intervalBefore: card.intervalDays,
        intervalAfter: card.intervalDays,
        easeFactorBefore: card.easeFactor,
        easeFactorAfter: card.easeFactor,
        mode: "same-day-recap",
      });
      await upsertCheckIn(false, isNewSession);
    },
  );
}

/** 測驗作答：記 quizStats + 歷史 + 打卡。MVP 不回寫 SM-2 卡片狀態。 */
export async function recordQuizAnswer(
  word: string,
  correct: boolean,
  mode: ReviewMode,
  sessionId: string,
  isNewSession: boolean,
): Promise<void> {
  await progressDb.transaction(
    "rw",
    [progressDb.quizStats, progressDb.reviewLogs, progressDb.checkIns],
    async () => {
      const stat = await progressDb.quizStats.get(word);
      await progressDb.quizStats.put({
        word,
        timesAsked: (stat?.timesAsked ?? 0) + 1,
        timesCorrect: (stat?.timesCorrect ?? 0) + (correct ? 1 : 0),
        lastAskedAt: new Date().toISOString(),
      });
      await progressDb.reviewLogs.add({
        word,
        reviewedAt: new Date().toISOString(),
        sessionId,
        grade: correct ? 2 : 0,
        intervalBefore: 0,
        intervalAfter: 0,
        easeFactorBefore: 0,
        easeFactorAfter: 0,
        mode,
      });
      await upsertCheckIn(false, isNewSession);
    },
  );
}
