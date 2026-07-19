import type { ExamPriorityRecord, ExampleRecord, RelationRecord, WordRecord } from "../../db/types";
import { todayStr } from "../../lib/dates";
import type { ExamTier } from "./ExamTierBadge";
import { hasWordBeastAsset } from "./wordBeastAssets";

export const DAILY_CAPTURE_SIZE = 15;

const TIER_PATTERN: ExamTier[] = ["S", "A", "S", "B", "S", "A", "C", "S", "A", "B", "S", "A", "C", "S", "Z"];

export interface CaptureData {
  words: WordRecord[];
  priorities: ExamPriorityRecord[];
  examples: ExampleRecord[];
  relations: RelationRecord[];
  known: Set<string>;
  remaining: number;
}

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function selectDailyWords(data: CaptureData): WordRecord[] {
  const tierByWord = new Map(data.priorities.filter((row) => !row.isFunctionWord).map((row) => [row.word, row.priorityTier]));
  const groups = new Map<ExamTier, WordRecord[]>();
  for (const tier of ["S", "A", "B", "C", "Z"] as ExamTier[]) groups.set(tier, []);
  const unranked: WordRecord[] = [];
  for (const word of data.words) {
    if (data.known.has(word.word) || !word.meaningZh || !hasWordBeastAsset(word.wordId, word.word)) continue;
    const tier = tierByWord.get(word.word);
    (tier ? groups.get(tier)! : unranked).push(word);
  }
  const seed = todayStr();
  for (const words of groups.values()) words.sort((a, b) => stableNumber(`${seed}:${a.wordId}`) - stableNumber(`${seed}:${b.wordId}`));
  unranked.sort((a, b) => stableNumber(`${seed}:${a.wordId}`) - stableNumber(`${seed}:${b.wordId}`));

  const selected: WordRecord[] = [];
  const wanted = Math.min(DAILY_CAPTURE_SIZE, data.remaining);
  for (const tier of TIER_PATTERN) {
    const next = groups.get(tier)?.shift();
    if (next) selected.push(next);
    if (selected.length >= wanted) return selected;
  }
  const rest = [...groups.values()].flat().concat(unranked).sort((a, b) => stableNumber(`${seed}:rest:${a.wordId}`) - stableNumber(`${seed}:rest:${b.wordId}`));
  return selected.concat(rest.slice(0, Math.max(0, wanted - selected.length)));
}
