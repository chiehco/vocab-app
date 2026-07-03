import type { WordRecord } from "../db/types";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function posOverlaps(a: WordRecord, b: WordRecord): boolean {
  return a.posAll.some((p) => b.posAll.includes(p));
}

function levelNum(level: string): number {
  return Number(level.replace("LV", "")) || 0;
}

/**
 * 干擾項生成：同等級 + 詞性有交集 + 意思不同，優先排除同字族
 * （避免 unite/unity 同題）。池不足時逐步放寬：先放掉詞性，再等級 ±1。
 */
export function pickDistractors(
  target: WordRecord,
  all: WordRecord[],
  n = 3,
): WordRecord[] {
  const base = all.filter(
    (w) =>
      w.word !== target.word &&
      w.meaningZh &&
      w.meaningZh !== target.meaningZh,
  );

  const tiers: ((w: WordRecord) => boolean)[] = [
    (w) =>
      w.level === target.level &&
      posOverlaps(w, target) &&
      (!w.familyKey || w.familyKey !== target.familyKey),
    (w) => w.level === target.level && posOverlaps(w, target),
    (w) => w.level === target.level,
    (w) => Math.abs(levelNum(w.level) - levelNum(target.level)) <= 1,
    () => true,
  ];

  const picked: WordRecord[] = [];
  const used = new Set<string>([target.word]);
  for (const tier of tiers) {
    if (picked.length >= n) break;
    const pool = shuffle(base.filter((w) => tier(w) && !used.has(w.word)));
    for (const w of pool) {
      if (picked.length >= n) break;
      if (picked.some((p) => p.meaningZh === w.meaningZh)) continue;
      picked.push(w);
      used.add(w.word);
    }
  }
  return picked;
}

export { shuffle };
