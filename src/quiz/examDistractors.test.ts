import { describe, expect, it } from "vitest";
import type { RelationRecord, WordRecord } from "../db/types";
import { pickExamDistractors } from "./examDistractors";

function word(wordId: string, value: string, level = "LV3"): WordRecord {
  return {
    wordId,
    word: value,
    wordVariants: [value],
    level,
    pos: "n.",
    posAll: ["n."],
    meaningZh: `義-${value}`,
    meaningEn: null,
    usagePattern: null,
    syllables: null,
    stressPattern: null,
    phoneticUs: null,
    familyKey: value,
    isCore: false,
    sourceNote: null,
    status: "draft",
  };
}

function relation(wordValue: string, relatedWord: string): RelationRecord {
  return {
    relationId: `${wordValue}-${relatedWord}`,
    word: wordValue,
    relatedWord,
    relationType: "exam_distractor",
    direction: "one_way",
    note: null,
    strength: 3,
    status: "draft",
  };
}

describe("pickExamDistractors", () => {
  it("puts curated exam distractors first", () => {
    const words = [word("W1", "credit"), word("W2", "reward"), word("W3", "quote"), word("W4", "define"), word("W5", "garden")];
    const picked = pickExamDistractors(words[0], words, [relation("credit", "reward"), relation("credit", "quote"), relation("credit", "define")]);
    expect(picked.map((item) => item.word)).toEqual(["reward", "quote", "define"]);
  });

  it("fills incomplete curated sets without duplicates", () => {
    const words = [word("W1", "credit"), word("W2", "reward"), word("W3", "quote"), word("W4", "define"), word("W5", "garden")];
    const picked = pickExamDistractors(words[0], words, [relation("credit", "reward")]);
    expect(picked).toHaveLength(3);
    expect(picked[0].word).toBe("reward");
    expect(new Set(picked.map((item) => item.word)).size).toBe(3);
  });
});
