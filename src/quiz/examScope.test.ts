import { describe, expect, it } from "vitest";
import type { ExamPriorityRecord, WordRecord } from "../db/types";
import {
  buildTopExamWordSet,
  filterTopExamWords,
  filterWordsByLevels,
  sortExamWordsByPriority,
} from "./examScope";

function priority(
  word: string,
  tier: ExamPriorityRecord["priorityTier"],
  isFunctionWord = false,
  rank = 1,
): ExamPriorityRecord {
  return {
    wordId: `W-${word}`,
    word,
    rank,
    level: "LV3",
    pos: "v.",
    meaningZh: word,
    priorityTier: tier,
    scoreXuece: 0,
    xtBase: 0,
    xtOption: 0,
    xtCross: 0,
    xtYears: 0,
    xtYearList: null,
    xtOptionCount: 0,
    xtAnswerCount: 0,
    advancedTier: null,
    scoreZhikao: 0,
    zkYears: 0,
    zkYearList: null,
    zkOptionCount: 0,
    zkAnswerCount: 0,
    isFunctionWord,
  };
}

function word(value: string): WordRecord {
  return {
    wordId: `W-${value}`,
    word: value,
    wordVariants: [value],
    level: "LV3",
    pos: "v.",
    posAll: ["v."],
    meaningZh: value,
    meaningEn: null,
    usagePattern: null,
    syllables: null,
    stressPattern: null,
    phoneticUs: null,
    familyKey: value,
    isCore: true,
    sourceNote: null,
    status: "reviewed",
  };
}

describe("S+A exam scope", () => {
  it("includes both S and A tiers, including function words", () => {
    const result = buildTopExamWordSet([
      priority("serve", "S"),
      priority("along", "A", true),
      priority("material", "B"),
    ]);

    expect([...result]).toEqual(["serve", "along"]);
  });

  it("filters the word archive without changing collection state", () => {
    const words = [word("serve"), word("along"), word("material")];
    const result = filterTopExamWords(words, new Set(["serve", "along"]));

    expect(result.map((row) => row.word)).toEqual(["serve", "along"]);
  });

  it("orders the open card pool by exam priority without leaking lower tiers", () => {
    const words = [word("along"), word("material"), word("serve")];
    const result = sortExamWordsByPriority(words, [
      priority("along", "A", true, 50),
      priority("material", "B", false, 2),
      priority("serve", "S", false, 8),
    ]);

    expect(result.map((row) => row.word)).toEqual(["serve", "along"]);
  });

  it("defaults can focus a trial on discriminating levels while leaving the full pool open", () => {
    const lv2 = { ...word("along"), level: "LV2" };
    const lv3 = { ...word("serve"), level: "LV3" };
    const lv4 = { ...word("provide"), level: "LV4" };

    expect(filterWordsByLevels([lv2, lv3, lv4], ["LV3", "LV4"]).map((row) => row.word))
      .toEqual(["serve", "provide"]);
    expect(filterWordsByLevels([lv2, lv3, lv4], []).map((row) => row.word))
      .toEqual(["along", "serve", "provide"]);
  });
});
