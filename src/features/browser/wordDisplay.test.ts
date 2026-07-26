import { describe, expect, it } from "vitest";
import type { SenseRecord, WordRecord } from "../../db/types";
import { firstSummaryMeaning, getWordDisplaySense } from "./wordDisplay";

function word(overrides: Partial<WordRecord> = {}): WordRecord {
  return {
    wordId: "W000323",
    word: "for",
    wordVariants: ["for"],
    level: "LV1",
    pos: "prep./conj.",
    posAll: ["prep.", "conj."],
    meaningZh: "爲；因爲；至於；DOS批處理命令",
    meaningEn: null,
    usagePattern: null,
    syllables: null,
    stressPattern: null,
    phoneticUs: null,
    familyKey: "for",
    isCore: true,
    sourceNote: null,
    status: "draft",
    ...overrides,
  };
}

function sense(overrides: Partial<SenseRecord> = {}): SenseRecord {
  return {
    senseId: "S-for-1",
    wordId: "W000323",
    word: "for",
    senseOrder: 1,
    sensePos: "prep.",
    meaningZh: "為了；給",
    isExamSense: true,
    examEvidence: null,
    answerForms: [],
    note: null,
    status: "reviewed",
    ...overrides,
  };
}

describe("word display sense", () => {
  it("keeps the archive label short and normalizes uncommon glyph variants", () => {
    expect(firstSummaryMeaning("爲；因爲；至於；DOS批處理命令")).toBe("為");
  });

  it("prefers a reviewed exam sense and carries its part of speech", () => {
    expect(getWordDisplaySense(word(), [sense()])).toEqual({
      meaning: "為了；給",
      pos: "prep.",
      needsReview: false,
      source: "sense",
    });
  });

  it("flags an uncurated summary for later human calibration", () => {
    expect(getWordDisplaySense(word(), [])).toEqual({
      meaning: "為",
      pos: "prep./conj.",
      needsReview: true,
      source: "summary",
    });
  });
});
