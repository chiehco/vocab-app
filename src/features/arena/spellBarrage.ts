import type { WordRecord } from "../../db/types";

export type ArenaDifficulty = "apprentice" | "keeper" | "priest";

export interface LetterTile {
  id: string;
  char: string;
  kind: "letter" | "decoy" | "blocker";
}

export const ARENA_DIFFICULTIES: Record<ArenaDifficulty, { label: string; note: string; baseMs: number; perLetterMs: number }> = {
  apprentice: { label: "見習豆魔", note: "會遲疑，也會發呆", baseMs: 2600, perLetterMs: 690 },
  keeper: { label: "守陣豆魔", note: "穩定、有一點壓力", baseMs: 1900, perLetterMs: 520 },
  priest: { label: "祭司幻影", note: "反應快，但不作弊", baseMs: 1250, perLetterMs: 390 },
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

export function selectArenaWords(
  words: WordRecord[],
  knownWords: Set<string>,
  learningLevels: string[],
  count = 5,
  random: () => number = Math.random,
): WordRecord[] {
  const eligible = words.filter(isArenaWordEligible);
  const known = shuffleWith(eligible.filter((word) => knownWords.has(word.word)), random);
  if (known.length >= count) return known.slice(0, count);
  const knownSet = new Set(known.map((word) => word.word));
  const fallback = shuffleWith(
    eligible.filter((word) => learningLevels.includes(word.level) && !knownSet.has(word.word)),
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
    config.baseMs
    + normalizeArenaAnswer(answer).length * config.perLetterMs
    + blockerCount * 720
    + normalizedJitter * 850,
  );
}
