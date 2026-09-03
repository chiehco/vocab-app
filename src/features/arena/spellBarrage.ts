import type { WordRecord } from "../../db/types";

export type ArenaDifficulty = "apprentice" | "keeper" | "priest";
export const CPU_OBSERVE_MS = 2500;

export interface LetterTile {
  id: string;
  char: string;
  kind: "letter" | "decoy" | "blocker";
}

export function composeArenaAnswer(tiles: LetterTile[], selectedTileIds: string[]): string {
  const tileById = new Map(tiles.map((tile) => [tile.id, tile]));
  return selectedTileIds
    .map((id) => tileById.get(id))
    .filter((tile): tile is LetterTile => Boolean(tile && tile.kind !== "blocker"))
    .map((tile) => tile.char)
    .join("");
}

export const ARENA_DIFFICULTIES: Record<ArenaDifficulty, { label: string; note: string; baseMs: number; perLetterMs: number }> = {
  apprentice: { label: "見習豆魔", note: "先看線索，再慢慢敲", baseMs: 4000, perLetterMs: 900 },
  keeper: { label: "守陣豆魔", note: "穩定，開始有壓力", baseMs: 3000, perLetterMs: 700 },
  priest: { label: "祭司幻影", note: "反應快，但仍會等你", baseMs: 2000, perLetterMs: 520 },
};

export function normalizeArenaAnswer(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

export function isArenaWordEligible(word: WordRecord): boolean {
  const answer = normalizeArenaAnswer(word.word);
  return Boolean(word.meaningZh && answer.length >= 3 && answer.length <= 10 && answer === word.word.toLowerCase());
}

export function shuffleWith<T>(items: T[], random: () => number = Math.random): T[] {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export interface ArenaSelectionContext {
  /** S＋A 單字，依考試排名由前到後。 */
  prioritizedWords?: readonly string[];
  /** 今天到期或練習後待正式回想的單字。 */
  dueWords?: ReadonlySet<string>;
}

/** 加權隨機排序，讓高頻／到期字較常出現，同時保留遊戲題目的變化。 */
export function weightedArenaOrder(
  words: WordRecord[],
  context: ArenaSelectionContext,
  random: () => number = Math.random,
): WordRecord[] {
  const prioritizedWords = context.prioritizedWords ?? [];
  const priorityRank = new Map(prioritizedWords.map((word, index) => [word, index]));
  const rankRange = Math.max(1, prioritizedWords.length - 1);
  return words
    .map((word, originalIndex) => {
      const rank = priorityRank.get(word.word);
      const examWeight = rank === undefined ? 1 : 2 + 2 * (1 - rank / rankRange);
      const dueWeight = context.dueWords?.has(word.word) ? 4 : 0;
      const weight = examWeight + dueWeight;
      const sample = Math.max(Number.EPSILON, random());
      return { word, originalIndex, key: Math.pow(sample, 1 / weight) };
    })
    .sort((a, b) => b.key - a.key || a.originalIndex - b.originalIndex)
    .map((item) => item.word);
}

export function selectArenaWords(
  words: WordRecord[],
  knownWords: Set<string>,
  learningLevels: string[],
  count = 5,
  random: () => number = Math.random,
  context: ArenaSelectionContext = {},
): WordRecord[] {
  const eligible = words.filter(isArenaWordEligible);
  const known = weightedArenaOrder(eligible.filter((word) => knownWords.has(word.word)), context, random);
  if (known.length >= count) return known.slice(0, count);
  const knownSet = new Set(known.map((word) => word.word));
  const fallback = weightedArenaOrder(
    eligible.filter((word) => learningLevels.includes(word.level) && !knownSet.has(word.word)),
    context,
    random,
  );
  return [...known, ...fallback].slice(0, count);
}

const DECOY_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export function buildLetterTiles(
  answer: string,
  blockerCount: number,
  random: () => number = Math.random,
): LetterTile[] {
  const normalized = normalizeArenaAnswer(answer);
  const letters: LetterTile[] = [...normalized].map((char, index) => ({ id: `letter-${index}-${char}`, char, kind: "letter" }));
  const decoys: LetterTile[] = Array.from({ length: normalized.length <= 5 ? 2 : 3 }, (_, index) => {
    let char = DECOY_ALPHABET[Math.floor(random() * DECOY_ALPHABET.length)];
    if (normalized.includes(char)) char = DECOY_ALPHABET[(DECOY_ALPHABET.indexOf(char) + 7) % DECOY_ALPHABET.length];
    return { id: `decoy-${index}-${char}`, char, kind: "decoy" as const };
  });
  const blockers: LetterTile[] = Array.from({ length: blockerCount }, (_, index) => ({
    id: `blocker-${index}`,
    char: "妄",
    kind: "blocker" as const,
  }));
  return shuffleWith([...letters, ...decoys, ...blockers], random);
}

export function getCpuFinishMs(
  answer: string,
  difficulty: ArenaDifficulty,
  blockerCount: number,
  jitter = 0.5,
): number {
  const config = ARENA_DIFFICULTIES[difficulty];
  const normalizedJitter = Math.max(0, Math.min(1, jitter));
  return Math.round(
    CPU_OBSERVE_MS
    + config.baseMs
    + normalizeArenaAnswer(answer).length * config.perLetterMs
    + blockerCount * 720
    + normalizedJitter * 850,
  );
}
