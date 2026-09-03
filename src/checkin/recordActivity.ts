import { getSetting, progressDb } from "../db/progressDb";
import { findProgressCard, getProgressKeys } from "../db/progressIdentity";
import type { CardState, Grade, ReviewMode } from "../db/types";
import { scheduleRecall, newCardState } from "../srs/sm2";
import { todayStr } from "../lib/dates";
import { format } from "date-fns";

async function upsertCheckIn(today: string, isNewWord: boolean, sessionId: string): Promise<void> {
  const existing = await progressDb.checkIns.get(today);
  // 本次 log 已在同一交易寫入；以實際紀錄計算，跨午夜或重試也不漏計局數。
  const sessionAnswers = await progressDb.reviewLogs.where("sessionId").equals(sessionId)
    .filter((log) => format(new Date(log.reviewedAt), "yyyy-MM-dd") === today).count();
  await progressDb.checkIns.put({
    date: today,
    reviewCount: (existing?.reviewCount ?? 0) + 1,
    newWordsCount: (existing?.newWordsCount ?? 0) + (isNewWord ? 1 : 0),
    sessionsCount: (existing?.sessionsCount ?? 0) + (sessionAnswers === 1 ? 1 : 0),
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
  // 捕捉與小遊戲只提供辨認證據，不能冒充正式回想而升級卡片。
  if (mode !== "flashcard") return recordQuizAnswer(word, grade > 0, mode, sessionId, isNewSession);
  const keys = await getProgressKeys(word);
  const today = todayStr();
  const examDate = await getSetting<string>("examDate");
  return progressDb.transaction(
    "rw",
    [progressDb.cardStates, progressDb.reviewLogs, progressDb.checkIns],
    async () => {
      const existing = await findProgressCard(keys);
      const isNewWord = !existing;
      const before = existing ?? newCardState(word, today);
      const scheduled = scheduleRecall(before, grade, today, examDate);
      const after = { ...scheduled, practicePending: false };

      await progressDb.cardStates.put(after);
      await progressDb.reviewLogs.add({
        word: after.word,
        reviewedAt: new Date().toISOString(),
        sessionId,
        grade,
        intervalBefore: before.intervalDays,
        intervalAfter: after.intervalDays,
        easeFactorBefore: before.easeFactor,
        easeFactorAfter: after.easeFactor,
        mode,
        schedulingApplied: scheduled !== before,
      });
      await upsertCheckIn(today, isNewWord, sessionId);
      return after;
    },
  );
}

/** 記錄同日回顧，但不推進 SRS 間隔或到期日。 */
export async function recordReviewWithoutScheduling(
  word: string,
  grade: Grade,
  sessionId: string,
  _isNewSession: boolean,
): Promise<void> {
  const keys = await getProgressKeys(word);
  const today = todayStr();
  await progressDb.transaction(
    "rw",
    [progressDb.cardStates, progressDb.reviewLogs, progressDb.checkIns],
    async () => {
      const card = await findProgressCard(keys);
      if (!card) return;
      await progressDb.reviewLogs.add({
        word: card.word,
        reviewedAt: new Date().toISOString(),
        sessionId,
        grade,
        intervalBefore: card.intervalDays,
        intervalAfter: card.intervalDays,
        easeFactorBefore: card.easeFactor,
        easeFactorAfter: card.easeFactor,
        mode: "same-day-recap",
        schedulingApplied: false,
      });
      // 回顧發現忘記，不假裝記憶無誤；交給正式回想確認，這裡不改間隔。
      if (grade === 0) await progressDb.cardStates.put({ ...card, practicePending: true });
      await upsertCheckIn(today, false, sessionId);
    },
  );
}

/** 練習只記對應題型證據，新字／錯題加入待回想，不直接升降 SM-2。 */
export async function recordQuizAnswer(
  word: string,
  correct: boolean,
  mode: ReviewMode,
  sessionId: string,
  _isNewSession: boolean,
): Promise<CardState> {
  const keys = await getProgressKeys(word);
  const today = todayStr();
  return progressDb.transaction(
    "rw",
    [progressDb.cardStates, progressDb.quizStats, progressDb.reviewLogs, progressDb.checkIns],
    async () => {
      const existing = await findProgressCard(keys);
      const before = existing ?? newCardState(word, today);
      const after = { ...before, practicePending: before.practicePending || !existing || !correct };
      await progressDb.cardStates.put(after);
      // Keep quiz evidence under its existing key even if a backup contains stats alone.
      const stats = await progressDb.quizStats.bulkGet([after.word, ...keys.filter((key) => key !== after.word)]);
      const stat = stats.find((row) => row !== undefined);
      await progressDb.quizStats.put({
        word: stat?.word ?? after.word,
        timesAsked: (stat?.timesAsked ?? 0) + 1,
        timesCorrect: (stat?.timesCorrect ?? 0) + (correct ? 1 : 0),
        lastAskedAt: new Date().toISOString(),
      });
      await progressDb.reviewLogs.add({
        word: after.word,
        reviewedAt: new Date().toISOString(),
        sessionId,
        grade: correct ? 2 : 0,
        intervalBefore: before.intervalDays,
        intervalAfter: after.intervalDays,
        easeFactorBefore: before.easeFactor,
        easeFactorAfter: after.easeFactor,
        mode,
        schedulingApplied: false,
      });
      await upsertCheckIn(today, !existing, sessionId);
      return after;
    },
  );
}
