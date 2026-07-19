import { describe, expect, it } from "vitest";
import type { WordRecord } from "../db/types";
import type { QueueItem } from "../srs/queue";
import { buildRound, cardFontSize, comboReward, needsPlaque, shortZh } from "./slash";

function word(w: string, meaningZh: string | null, level = "LV1"): WordRecord {
  return {
    wordId: `w_${w}`,
    word: w,
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
    status: "ok",
  };
}

const POOL: WordRecord[] = [
  word("apple", "蘋果"),
  word("banana", "香蕉"),
  word("cherry", "櫻桃"),
  word("durian", "榴槤"),
  word("elder", "長者"),
  word("fig", "無花果"),
];

function items(...ws: WordRecord[]): QueueItem[] {
  return ws.map((w) => ({ wordRecord: w, isNew: false }));
}

describe("comboReward", () => {
  it("基本 10 分，3 連 20 分，5 連以上 30 分", () => {
    expect(comboReward(1).points).toBe(10);
    expect(comboReward(2).points).toBe(10);
    expect(comboReward(3).points).toBe(20);
    expect(comboReward(4).points).toBe(20);
    expect(comboReward(5).points).toBe(30);
    expect(comboReward(9).points).toBe(30);
  });

  it("恰好 3 連回 1 血、恰好 5 連回 2 血，其餘不回", () => {
    expect(comboReward(2).heal).toBe(0);
    expect(comboReward(3).heal).toBe(1);
    expect(comboReward(4).heal).toBe(0);
    expect(comboReward(5).heal).toBe(2);
    expect(comboReward(6).heal).toBe(0);
  });

  it("3 連以上才有爆氣特效", () => {
    expect(comboReward(2).burst).toBe(false);
    expect(comboReward(3).burst).toBe(true);
  });
});

describe("shortZh", () => {
  it("取第一段字義", () => {
    expect(shortZh("遺棄；拋棄")).toBe("遺棄");
    expect(shortZh("蘋果")).toBe("蘋果");
  });
});

describe("cardFontSize", () => {
  it("字越長字級越小", () => {
    expect(cardFontSize("act")).toBe("13cqw");
    expect(cardFontSize("appeal")).toBe("11cqw");
    expect(cardFontSize("arithmetic")).toBe("10cqw");
    expect(cardFontSize("accomplishment")).toBe("10cqw");
  });

  it("中文用中文的級距", () => {
    expect(cardFontSize("蘋果")).toBe("13cqw");
    expect(cardFontSize("在船飛機車上")).toBe("10cqw");
  });
});

describe("needsPlaque", () => {
  it("紅框塞得下的短字不用符咒", () => {
    expect(needsPlaque("act")).toBe(false);
    expect(needsPlaque("appealing")).toBe(false);
    expect(needsPlaque("蘋果")).toBe(false);
    expect(needsPlaque("在船飛機車上")).toBe(false);
  });

  it("長字改貼符咒", () => {
    expect(needsPlaque("arithmetic")).toBe(true);
    expect(needsPlaque("accomplishment")).toBe(true);
    expect(needsPlaque("在船飛機或車上的")).toBe(true);
  });
});

describe("buildRound", () => {
  it("每題恰有一個正解、牌數正確", () => {
    const round = buildRound(items(POOL[0], POOL[1]), POOL, 4, ["zh2en"]);
    expect(round).toHaveLength(2);
    for (const q of round) {
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
      expect(q.options.find((o) => o.isCorrect)!.word.word).toBe(q.target.word);
    }
  });

  it("zh2en 牌面是英文，en2zh 牌面是中文短義", () => {
    const [zh2en] = buildRound(items(POOL[0]), POOL, 3, ["zh2en"]);
    expect(zh2en.options.every((o) => /^[a-z]+$/i.test(o.label))).toBe(true);

    const [en2zh] = buildRound(items(POOL[0]), POOL, 3, ["en2zh"]);
    expect(en2zh.options.find((o) => o.isCorrect)!.label).toBe("蘋果");
    expect(en2zh.options.every((o) => /[一-鿿]/.test(o.label))).toBe(true);
  });

  it("沒有中文字義的字不出題", () => {
    const broken = word("ghost", null);
    const round = buildRound(items(broken, POOL[0]), POOL, 3, ["zh2en"]);
    expect(round).toHaveLength(1);
    expect(round[0].target.word).toBe("apple");
  });

  it("題型只從允許清單挑", () => {
    const round = buildRound(items(...POOL), POOL, 3, ["audio"]);
    expect(round.every((q) => q.mode === "audio")).toBe(true);
  });
});
