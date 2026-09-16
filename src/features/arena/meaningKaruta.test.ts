import { describe, expect, it } from "vitest";
import type { WordRecord } from "../../db/types";
import {
  chooseCpuCard,
  countTaken,
  dealBoard,
  flipCard,
  glossConflicts,
  karutaWinner,
  observeCard,
  resolveTurn,
  seededRandom,
  selectKarutaWords,
  type KarutaState,
} from "./meaningKaruta";

function word(value: string, meaningZh = `意思-${value}`, level = "LV1"): WordRecord {
  return {
    wordId: `W-${value}`,
    word: value,
    wordVariants: [],
    level,
    pos: "n.",
    posAll: ["n."],
    meaningZh,
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

const THREE = [word("cat", "貓"), word("dog", "狗"), word("sun", "太陽")];

function cardId(state: KarutaState, value: string, face: "en" | "zh") {
  return state.cards.find((card) => card.wordId === `W-${value}` && card.face === face)!.id;
}

describe("meaning karuta selection", () => {
  it("同場的字中文短釋義不得重複、也不得互為對方的釋義", () => {
    expect(glossConflicts(word("big", "大的"), word("large", "大的；巨大的"))).toBe(true);
    expect(glossConflicts(word("big", "大的"), word("huge", "巨大的"))).toBe(false);
    const picked = selectKarutaWords(
      [word("big", "大的"), word("large", "大的；巨大的"), word("cat", "貓"), word("kitten", "小貓；貓")],
      new Set(["big", "large", "cat", "kitten"]),
      ["LV1"],
      10,
      () => 0.5,
    );
    expect(picked.map((item) => item.word)).toEqual(["big", "cat"]);
  });

  it("短釋義取第一段，太長或缺釋義的字不入陣", () => {
    const picked = selectKarutaWords(
      [word("abandon", "遺棄；拋棄"), word("empty", ""), word("long", "一個非常非常長的釋義")],
      new Set(["abandon", "empty", "long"]),
      ["LV1"],
      10,
      () => 0.5,
    );
    expect(picked.map((item) => item.word)).toEqual(["abandon"]);
  });
});

describe("meaning karuta engine", () => {
  it("同一個 seed 發出同一副牌", () => {
    const first = dealBoard(THREE, 42);
    const second = dealBoard(THREE, 42);
    expect(first.cards.map((card) => card.id)).toEqual(second.cards.map((card) => card.id));
    expect(first.cards).toHaveLength(6);
    expect(dealBoard(THREE, 43).cards.map((card) => card.id)).not.toEqual(first.cards.map((card) => card.id));
  });

  it("配對成功收走並續翻，失敗蓋回換人", () => {
    let state = dealBoard(THREE, 1);
    state = flipCard(state, cardId(state, "cat", "en"));
    state = flipCard(state, cardId(state, "cat", "zh"));
    expect(state.phase).toBe("resolve");
    expect(state.lastResult).toBe("match");
    state = resolveTurn(state);
    expect(state.taken).toEqual({ "W-cat": "player" });
    expect(state.current).toBe("player");
    expect(state.phase).toBe("pick");

    state = flipCard(state, cardId(state, "dog", "en"));
    state = flipCard(state, cardId(state, "sun", "zh"));
    expect(state.lastResult).toBe("miss");
    state = resolveTurn(state);
    expect(state.faceUp).toEqual([]);
    expect(state.current).toBe("cpu");
    expect(state.history).toHaveLength(4);
  });

  it("翻到已收走、已翻開或結算中的牌一律不動", () => {
    let state = dealBoard(THREE, 1);
    const catEn = cardId(state, "cat", "en");
    state = flipCard(state, catEn);
    expect(flipCard(state, catEn)).toBe(state);
    state = flipCard(state, cardId(state, "dog", "zh"));
    expect(flipCard(state, cardId(state, "sun", "en"))).toBe(state);
    state = resolveTurn(state);
    state = flipCard(state, cardId(state, "cat", "en"));
    state = resolveTurn(flipCard(state, cardId(state, "cat", "zh")));
    expect(flipCard(state, catEn)).toBe(state);
  });

  it("全部收完即結束並判勝負", () => {
    let state = dealBoard(THREE, 7);
    for (const value of ["cat", "dog", "sun"]) {
      state = resolveTurn(flipCard(flipCard(state, cardId(state, value, "en")), cardId(state, value, "zh")));
    }
    expect(state.phase).toBe("over");
    expect(countTaken(state, "player")).toBe(3);
    expect(karutaWinner(state)).toBe("player");
    expect(karutaWinner({ ...state, taken: {} })).toBe("draw");
  });
});

describe("cpu memory", () => {
  it("依 recall 機率記牌", () => {
    const memory = new Set<string>();
    expect(observeCard(memory, "a", 0.5, () => 0.9)).toBe(memory);
    expect([...observeCard(memory, "a", 0.5, () => 0.1)]).toEqual(["a"]);
  });

  it("記得一對就直接翻，沒記憶時只翻沒看過的牌", () => {
    const state = dealBoard(THREE, 3);
    const dogEn = cardId(state, "dog", "en");
    const dogZh = cardId(state, "dog", "zh");
    const memory = new Set([dogEn, dogZh]);
    const first = chooseCpuCard(state, memory, () => 0.5);
    expect([dogEn, dogZh]).toContain(first);
    const afterFirst = flipCard(state, first!);
    expect(chooseCpuCard(afterFirst, memory, () => 0.5)).toBe(first === dogEn ? dogZh : dogEn);

    // 記憶裡每個字只有一張牌，沒有可配的對子，就只能翻沒看過的牌
    const seen = new Set(["W-cat", "W-dog", "W-sun"].map((wordId) => state.cards.find((card) => card.wordId === wordId)!.id));
    const unknown = state.cards.filter((card) => !seen.has(card.id));
    expect(chooseCpuCard(state, seen, () => 0.99)).toBe(unknown[2].id);
  });

  it("翻開一張後，對子在記憶裡就會去配", () => {
    let state = dealBoard(THREE, 5);
    const sunZh = cardId(state, "sun", "zh");
    state = flipCard(state, cardId(state, "sun", "en"));
    expect(chooseCpuCard(state, new Set([sunZh]), () => 0.5)).toBe(sunZh);
  });

  it("seededRandom 落在 [0, 1) 且可重現", () => {
    const a = seededRandom(9);
    const b = seededRandom(9);
    const values = Array.from({ length: 5 }, () => a());
    expect(values).toEqual(Array.from({ length: 5 }, () => b()));
    values.forEach((value) => { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThan(1); });
  });
});
