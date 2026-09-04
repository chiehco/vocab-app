import type { ExamPriorityRecord, ExampleRecord, MediaRecord, RelationRecord, WordRecord } from "../../db/types";
import { todayStr } from "../../lib/dates";
import type { ExamTier } from "./examTier";
import { hasWordBeastAsset } from "./wordBeastAssets";

export const DAILY_CAPTURE_SIZE = 15;

const TIER_PATTERN: ExamTier[] = ["S", "A", "S", "S", "A", "S", "S", "A", "S", "S", "A", "S", "S", "A", "S"];

export interface CaptureData {
  words: WordRecord[];
  priorities: ExamPriorityRecord[];
  examples: ExampleRecord[];
  media?: MediaRecord[];
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
  const wanted = Number.isFinite(data.remaining) ? Math.min(DAILY_CAPTURE_SIZE, Math.max(0, Math.floor(data.remaining))) : 0;
  if (wanted === 0) return [];
  const tierByWord = new Map(data.priorities
    .filter((row) => row.priorityTier === "S" || row.priorityTier === "A")
    .map((row) => [row.word, row.priorityTier]));
  const groups = new Map<ExamTier, WordRecord[]>();
  for (const tier of ["S", "A"] as ExamTier[]) groups.set(tier, []);
  for (const word of data.words) {
    if (data.known.has(word.word) || !word.meaningZh || !hasWordBeastAsset(word.wordId, word.word, word.imageWordId)) continue;
    const tier = tierByWord.get(word.word);
    if (tier) groups.get(tier)!.push(word);
  }
  const seed = todayStr();
  for (const words of groups.values()) words.sort((a, b) => stableNumber(`${seed}:${a.wordId}`) - stableNumber(`${seed}:${b.wordId}`));

  const selected: WordRecord[] = [];
  for (const tier of TIER_PATTERN) {
    const next = groups.get(tier)?.shift();
    if (next) selected.push(next);
    if (selected.length >= wanted) return selected;
  }
  const rest = [...groups.values()].flat().sort((a, b) => stableNumber(`${seed}:rest:${a.wordId}`) - stableNumber(`${seed}:rest:${b.wordId}`));
  return selected.concat(rest.slice(0, Math.max(0, wanted - selected.length)));
}
