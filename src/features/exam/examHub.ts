import type { CardState, ExamPriorityRecord } from "../../db/types";
import { standaloneStudyPriorities } from '../../quiz/examScope';

export interface ExamTierProgress {
  total: number;
  learned: number;
}

export interface ExamHubProgress {
  total: number;
  learned: number;
  due: number;
  s: ExamTierProgress;
  a: ExamTierProgress;
}

export function buildExamHubProgress(
  priorities: ExamPriorityRecord[],
  cards: CardState[],
  today: string,
): ExamHubProgress {
  const topPriorities = standaloneStudyPriorities(priorities);
  const tierByWord = new Map(topPriorities.map((row) => [row.word, row.priorityTier]));
  const knownWords = new Set(cards.map((card) => card.word));
  const learnedByTier = (tier: "S" | "A") => topPriorities.filter((row) => row.priorityTier === tier && knownWords.has(row.word)).length;

  return {
    total: topPriorities.length,
    learned: topPriorities.filter((row) => knownWords.has(row.word)).length,
    due: cards.filter((card) => tierByWord.has(card.word) && (card.dueDate <= today || !!card.practicePending)).length,
    s: { total: topPriorities.filter((row) => row.priorityTier === "S").length, learned: learnedByTier("S") },
    a: { total: topPriorities.filter((row) => row.priorityTier === "A").length, learned: learnedByTier("A") },
  };
}
