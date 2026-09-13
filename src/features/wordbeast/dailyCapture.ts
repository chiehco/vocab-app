import type { ExamPriorityRecord, ExampleRecord, MediaRecord, RelationRecord, WordRecord } from "../../db/types";
import { sortStandaloneStudyWords } from "../../quiz/examScope";
import { hasWordBeastAsset } from "./wordBeastAssets";

export const DAILY_CAPTURE_SIZE = 15;

export interface CaptureData {
  words: WordRecord[];
  priorities: ExamPriorityRecord[];
  examples: ExampleRecord[];
  media?: MediaRecord[];
  relations: RelationRecord[];
  known: Set<string>;
  remaining: number;
}

export function selectDailyWords(data: CaptureData): WordRecord[] {
  const wanted = Number.isFinite(data.remaining) ? Math.min(DAILY_CAPTURE_SIZE, Math.max(0, Math.floor(data.remaining))) : 0;
  return sortStandaloneStudyWords(data.words, data.priorities)
    .filter(word => !data.known.has(word.word) && !!word.meaningZh && hasWordBeastAsset(word.wordId, word.word, word.imageWordId))
    .slice(0, wanted);
}
