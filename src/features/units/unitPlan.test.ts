import { describe, expect, it } from "vitest";
import type { ExamPriorityRecord, WordRecord } from "../../db/types";
import { buildExamUnits, getExamUnit, UNIT_SIZE } from "./unitPlan";

function word(index: number, level = "LV1"): WordRecord {
  return {
    wordId: `W${String(index).padStart(6, "0")}`,
    word: `word-${index}`,
    level,
    pos: "n.",
    posAll: ["n."],
    meaningZh: `意思 ${index}`,
    meaningEn: null,
    usagePattern: null,
    syllables: null,
    stressPattern: null,
    phoneticUs: null,
    familyKey: null,
    isCore: true,
    sourceNote: null,
    status: "approved",
  };
}

function priority(
  record: WordRecord,
  rank: number,
  priorityTier: ExamPriorityRecord["priorityTier"] = "A",
): ExamPriorityRecord {
  return {
    wordId: record.wordId,
    word: record.word,
    rank,
    level: record.level,
    pos: record.pos,
    meaningZh: record.meaningZh,
    priorityTier,
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

describe("S+A unit plan", () => {
  it("filters one level, orders by exam rank then wordId, and groups every 30 words", () => {
    const lv1 = Array.from({ length: 65 }, (_, index) => word(index + 1));
    const excludedLevel = word(900, "LV2");
    const excludedTier = word(901);
    const priorities = [
      ...lv1.map((record, index) => priority(record, 100 - index, index % 2 ? "S" : "A")),
      priority(excludedLevel, 1, "S"),
      priority(excludedTier, 2, "B"),
    ];

    // Equal ranks use the canonical word id as the stable tie breaker.
    priorities[0] = priority(lv1[0], 50, "A");
    priorities[1] = priority(lv1[1], 50, "S");

    const units = buildExamUnits([...lv1, excludedLevel, excludedTier], priorities, "LV1");
    const flattened = units.flatMap((unit) => unit.words);

    expect(UNIT_SIZE).toBe(30);
    expect(units.map((unit) => unit.words.length)).toEqual([30, 30, 5]);
    expect(units.map((unit) => unit.unitNumber)).toEqual([1, 2, 3]);
    expect(units.every((unit) => unit.level === "LV1")).toBe(true);
    expect(flattened).not.toContain(excludedLevel);
    expect(flattened).not.toContain(excludedTier);
    expect(flattened.indexOf(lv1[0])).toBeLessThan(flattened.indexOf(lv1[1]));
    expect(flattened.map((record) => record.wordId)).toEqual(
      [...flattened]
        .sort((left, right) => {
          const leftRank = priorities.find((row) => row.wordId === left.wordId)?.rank ?? Infinity;
          const rightRank = priorities.find((row) => row.wordId === right.wordId)?.rank ?? Infinity;
          return leftRank - rightRank || left.wordId.localeCompare(right.wordId);
        })
        .map((record) => record.wordId),
    );
  });

  it("places every word exactly once and is unchanged when both inputs are reversed", () => {
    const words = Array.from({ length: 61 }, (_, index) => word(index + 1));
    const priorities = words.map((record, index) => priority(record, (index * 17) % 61 + 1));

    const forward = buildExamUnits(words, priorities, "LV1");
    const reversed = buildExamUnits([...words].reverse(), [...priorities].reverse(), "LV1");
    const ids = forward.flatMap((unit) => unit.words.map((record) => record.wordId));

    expect(reversed).toEqual(forward);
    expect(ids).toHaveLength(words.length);
    expect(new Set(ids).size).toBe(words.length);
  });

  it("gets a 1-based unit and rejects an invalid unit number", () => {
    const words = Array.from({ length: 31 }, (_, index) => word(index + 1));
    const priorities = words.map((record, index) => priority(record, index + 1));

    expect(getExamUnit(words, priorities, "LV1", 1)?.unitId).toBe("sa-lv1-u01");
    expect(getExamUnit(words, priorities, "LV1", 2)?.words).toEqual([words[30]]);
    expect(getExamUnit(words, priorities, "LV1", 0)).toBeUndefined();
    expect(getExamUnit(words, priorities, "LV1", 3)).toBeUndefined();
  });
});
