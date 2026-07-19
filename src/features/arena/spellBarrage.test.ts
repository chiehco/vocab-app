import { describe, expect, it } from "vitest";
import type { WordRecord } from "../../db/types";
import { buildLetterTiles, CPU_OBSERVE_MS, getCpuFinishMs, normalizeArenaAnswer, selectArenaWords } from "./spellBarrage";

function word(value: string, level = "LV1"): WordRecord {
  return {
    wordId: `W-${value}`,
    word: value,
    wordVariants: [],
    level,
    pos: "n.",
    posAll: ["n."],
    meaningZh: `意思-${value}`,
    meaningEn: null,
    usagePattern: null,
    syllables: null,
    stressPattern: null,
    phoneticUs: null,
    familyKey: null,
    isCore: true,
    sourceNote: null,
    status: "active",
  };
}

describe("spell barrage", () => {
  it("只保留可直接拼寫的三到十字母單字", () => {
    expect(normalizeArenaAnswer("ice-cream")).toBe("icecream");
    const selected = selectArenaWords(
      [word("cat"), word("go"), word("ice-cream"), word("elephant")],
      new Set(["cat", "go", "ice-cream", "elephant"]),
      ["LV1"],
      5,
      () => 0.5,
    );
    expect(selected.map((item) => item.word)).toEqual(["cat", "elephant"]);
  });

  it("優先使用已收服單字，不足時才由學習範圍補齊", () => {
    const words = [word("cat"), word("dog"), word("sun"), word("moon", "LV2"), word("star", "LV3")];
    const selected = selectArenaWords(words, new Set(["cat", "dog"]), ["LV1", "LV2"], 4, () => 0.5);
    expect(selected.slice(0, 2).map((item) => item.word).sort()).toEqual(["cat", "dog"]);
    expect(selected).toHaveLength(4);
    expect(selected.some((item) => item.word === "star")).toBe(false);
  });

  it("字母磚包含答案、誘餌與指定數量的妄磚", () => {
    const tiles = buildLetterTiles("apple", 2, () => 0.2);
    expect(tiles.filter((tile) => tile.kind === "letter").map((tile) => tile.char).sort().join(""))
      .toBe("aelpp");
    expect(tiles.filter((tile) => tile.kind === "decoy")).toHaveLength(2);
    expect(tiles.filter((tile) => tile.kind === "blocker")).toHaveLength(2);
  });

  it("難度越高電腦完成越快，妄磚則會拖慢電腦", () => {
    const easy = getCpuFinishMs("witness", "apprentice", 0, 0);
    const hard = getCpuFinishMs("witness", "priest", 0, 0);
    expect(hard).toBeLessThan(easy);
    expect(getCpuFinishMs("witness", "priest", 2, 0)).toBe(hard + 1440);
    expect(hard).toBeGreaterThan(CPU_OBSERVE_MS);
  });
});
