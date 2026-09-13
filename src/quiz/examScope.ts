import type { ExampleRecord, ExamPriorityRecord, WordRecord } from "../db/types";
import sixYearData from './gsatSixYear.json';

type Frequency = {yearCount:number;score:number;answerCount:number;optionCount:number;rank:number};
const sixYear = sixYearData as Record<string,Frequency>;

export function compareSixYearFrequency(a: string, b: string): number {
  return (sixYear[b]?.score ?? 0) - (sixYear[a]?.score ?? 0)
    || (sixYear[b]?.yearCount ?? 0) - (sixYear[a]?.yearCount ?? 0)
    || a.localeCompare(b, 'en', { sensitivity: 'base' });
}

/** Keep the installed archive intact. Only standalone study eligibility/order changes. */
export function standaloneStudyPriorities(priorities: ExamPriorityRecord[]): ExamPriorityRecord[] {
  return priorities.filter(row => !row.isFunctionWord && (row.priorityTier === 'S' || row.priorityTier === 'A'))
    .slice().sort((a,b) => {
      const left=sixYear[a.word],right=sixYear[b.word];
      return (right?.score ?? 0)-(left?.score ?? 0)
        || (right?.yearCount ?? 0)-(left?.yearCount ?? 0)
        || a.word.localeCompare(b.word);
    });
}

export function sortStandaloneStudyWords(words: WordRecord[], priorities: ExamPriorityRecord[]): WordRecord[] {
  const rank = new Map(standaloneStudyPriorities(priorities).map((p,i)=>[p.word,i]));
  return words.filter(w=>rank.has(w.word)).slice().sort((a,b)=>rank.get(a.word)!-rank.get(b.word)!);
}

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
