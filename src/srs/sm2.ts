import type { CardState, Grade } from "../db/types";
import { addDaysStr } from "../lib/dates";
import { format } from "date-fns";

/** 四鍵評分對應 SM-2 quality：Again=0, Hard=3, Good=4, Easy=5 */
const GRADE_TO_QUALITY: Record<Grade, number> = { 0: 0, 1: 3, 2: 4, 3: 5 };

export const GRADE_LABELS: Record<Grade, string> = {
  0: "忘記了",
  1: "有點難",
  2: "普通",
  3: "很簡單",
};

export function newCardState(word: string, today: string): CardState {
  return {
    word,
    state: "new",
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueDate: today,
    lastReviewedAt: null,
    lapses: 0,
    createdAt: new Date().toISOString(),
  };
}

// Exam deadlines affect study planning, not the evidence-based state of an individual card.
// Keep the optional date argument for callers; do not compress mature cards near the exam.
/** 純函式：套用一次評分，回傳新的卡片狀態（不觸碰資料庫）。 */
export function applyGrade(card: CardState, grade: Grade, today: string, _examDate?: string): CardState {
  const q = GRADE_TO_QUALITY[grade];
  let { easeFactor, intervalDays, repetitions, lapses } = card;
  let state = card.state;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
    lapses += 1;
    state = card.state === "new" || card.state === "learning" ? "learning" : "relearning";
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
    state = "review";
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return {
    ...card,
    state,
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    dueDate: addDaysStr(today, intervalDays),
    lastReviewedAt: new Date().toISOString(),
  };
}

/** 正式回想的排程入口：提早／同日答對不延長間隔，忘記才提前召回。 */
export function scheduleRecall(card: CardState, grade: Grade, today: string, examDate?: string): CardState {
  if (card.lastReviewedAt && card.dueDate > today) {
    if (grade > 0) return card;
    const alreadyFailedToday = card.repetitions === 0
      && format(new Date(card.lastReviewedAt), "yyyy-MM-dd") === today;
    if (alreadyFailedToday) return card;
  }
  return applyGrade(card, grade, today, examDate);
}

/** 使用者宣告已知時直接排到的間隔：跳過 1→6 天的學習梯子，考前 28 天仍能再確認一次。 */
export const KNOWN_INTERVAL_DAYS = 21;

/** 純函式：使用者答對後宣告「我已經會了」，把卡片直接排成三週後的成熟卡。 */
export function markKnown(card: CardState, today: string): CardState {
  return {
    ...card,
    state: "review",
    repetitions: Math.max(card.repetitions, 2),
    intervalDays: KNOWN_INTERVAL_DAYS,
    dueDate: addDaysStr(today, KNOWN_INTERVAL_DAYS),
    lastReviewedAt: new Date().toISOString(),
    practicePending: false,
  };
}
