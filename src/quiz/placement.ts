import type { WordRecord } from "../db/types";
import { pickDistractors, shuffle } from "./distractors";
import { ALL_LEVELS } from "../db/progressDb";

export interface PlacementQuestion {
  target: WordRecord;
  options: WordRecord[];
}

export interface LevelResult {
  level: string;
  correct: number;
  total: number;
}

export const PLACEMENT_PER_LEVEL = 4;

/** 每級抽 N 個字（由易到難排列），出看字選義四選一。 */
export function buildPlacementQuiz(
  allWords: WordRecord[],
  perLevel = PLACEMENT_PER_LEVEL,
): PlacementQuestion[] {
  const questions: PlacementQuestion[] = [];
  for (const level of ALL_LEVELS) {
    const pool = allWords.filter((w) => w.level === level && w.meaningZh);
    for (const target of shuffle(pool).slice(0, perLevel)) {
      questions.push({
        target,
        options: shuffle([target, ...pickDistractors(target, allWords)]),
      });
    }
  }
  return questions; // 依 LV1→LV6 順序，由易到難
}

/**
 * 估算程度：從 LV1 往上找第一個答對率低於門檻（75%）的等級，
 * 那一級就是建議的起點；全部達標則建議從最高級開始。
 */
export function scorePlacement(results: LevelResult[]): {
  results: LevelResult[];
  recommendedLevel: string;
} {
  const ordered = ALL_LEVELS.map(
    (lv) => results.find((r) => r.level === lv) ?? { level: lv, correct: 0, total: 0 },
  );
  let recommended = ALL_LEVELS[ALL_LEVELS.length - 1];
  for (const r of ordered) {
    const accuracy = r.total > 0 ? r.correct / r.total : 0;
    if (accuracy < 0.75) {
      recommended = r.level;
      break;
    }
  }
  return { results: ordered, recommendedLevel: recommended };
}
