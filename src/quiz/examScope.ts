import type { ExamPriorityRecord, WordRecord } from "../db/types";

export const TOP_EXAM_FILTER = "S+A";
export const DEFAULT_TRIAL_LEVELS = ["LV3", "LV4"];

export function buildTopExamWordSet(priorities: ExamPriorityRecord[]): Set<string> {
  return new Set(
    priorities
      .filter((row) => row.priorityTier === "S" || row.priorityTier === "A")
      .map((row) => row.word),
  );
}

export function filterTopExamWords(words: WordRecord[], topExamWordSet: Set<string>): WordRecord[] {
  return words.filter((word) => topExamWordSet.has(word.word));
}

export function sortExamWordsByPriority(
  words: WordRecord[],
  priorities: ExamPriorityRecord[],
): WordRecord[] {
  const rankByWord = new Map(
    priorities
      .filter((row) => row.priorityTier === "S" || row.priorityTier === "A")
      .map((row) => [row.word, row.rank]),
  );
  return words
    .filter((word) => rankByWord.has(word.word))
    .sort((a, b) => (rankByWord.get(a.word) ?? Infinity) - (rankByWord.get(b.word) ?? Infinity));
}

export function filterWordsByLevels(words: WordRecord[], levels: string[]): WordRecord[] {
  if (levels.length === 0) return words;
  const allowed = new Set(levels);
  return words.filter((word) => allowed.has(word.level));
}
