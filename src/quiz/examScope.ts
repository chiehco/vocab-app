import type { ExampleRecord, ExamPriorityRecord, WordRecord } from "../db/types";

export const TOP_EXAM_FILTER = "S+A";

export function buildTopExamWordSet(priorities: ExamPriorityRecord[]): Set<string> {
  return new Set(
    priorities
      .filter((row) => row.priorityTier === "S" || row.priorityTier === "A")
      .map((row) => row.word),
  );
}

export function buildFunctionWordSet(priorities: ExamPriorityRecord[]): Set<string> {
  return new Set(
    priorities
      .filter((row) => row.isFunctionWord)
      .map((row) => row.word),
  );
}

export function filterExactFillExamples(
  examples: ExampleRecord[],
  allowedWords: Set<string>,
  functionWords: Set<string>,
): ExampleRecord[] {
  return examples.filter(
    (example) => allowedWords.has(example.word) && !functionWords.has(example.word),
  );
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
