import { describe, expect, it } from "vitest";
import type { ExamPriorityRecord, WordRecord } from "../../db/types";
import { DAILY_CAPTURE_SIZE, selectDailyWords, type CaptureData } from "./dailyCapture";

function word(index: number): WordRecord {
  return {
    wordId: `W${String(250 + index).padStart(6, "0")}`,
    word: `word${index}`,
    level: "LV1",
    pos: "n.",
    posAll: ["n."],
    meaningZh: `意思${index}`,
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

function priority(record: WordRecord, index: number): ExamPriorityRecord {
  const tiers = ["S", "A", "B", "C"] as const;
  return {
    wordId: record.wordId,
    word: record.word,
    rank: index + 1,
    level: record.level,
    pos: record.pos,
    meaningZh: record.meaningZh,
    priorityTier: tiers[index % tiers.length],
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
    isFunctionWord: false,
  };
}

function data(remaining: number, known = new Set<string>()): CaptureData {
  const words = Array.from({ length: 30 }, (_, index) => word(index));
  return {
    words,
    priorities: words.map(priority),
    examples: [],
    relations: [],
    known,
    remaining,
  };
}

describe("daily word-beast capture selection", () => {
  it("offers a full 15-beast daily capture when quota allows", () => {
    const selected = selectDailyWords(data(30));
    expect(selected).toHaveLength(DAILY_CAPTURE_SIZE);
    expect(new Set(selected.map((record) => record.word)).size).toBe(DAILY_CAPTURE_SIZE);
  });

  it("respects remaining quota and excludes already captured words", () => {
    const known = new Set(["word0", "word1", "word2"]);
    const selected = selectDailyWords(data(4, known));
    expect(selected).toHaveLength(4);
    expect(selected.every((record) => !known.has(record.word))).toBe(true);
  });
});
