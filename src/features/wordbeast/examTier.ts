import type { ExamPriorityRecord } from "../../db/types";

export type ExamTier = ExamPriorityRecord["priorityTier"];

export const EXAM_TIER_LABELS: Record<ExamTier, string> = {
  S: "歷屆高頻",
  A: "重要常見",
  B: "一般考頻",
  C: "低頻補充",
  Z: "延伸詞彙",
};

const TIER_STARS: Record<ExamTier, number> = { S: 5, A: 4, B: 3, C: 2, Z: 1 };

export function getExamStarCount(tier: ExamTier): number {
  return TIER_STARS[tier];
}

export function getExamStarText(tier: ExamTier): string {
  const count = getExamStarCount(tier);
  return `${"★".repeat(count)}${"☆".repeat(5 - count)}`;
}
