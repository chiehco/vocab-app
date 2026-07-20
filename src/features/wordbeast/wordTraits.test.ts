import { describe, expect, it } from "vitest";
import type { MorphemeRecord, RelationRecord, SenseRecord } from "../../db/types";
import { buildConfusableWordSet, buildMorphemeWordSet, buildSenseCountByWord } from "./wordTraits";

const sense = (word: string, order: number, pos: string, meaningZh: string): SenseRecord => ({
  senseId: `${word}-${order}`,
  wordId: `W${order}`,
  word,
  senseOrder: order,
  sensePos: pos,
  meaningZh,
  isExamSense: false,
  examEvidence: null,
  answerForms: [],
  note: null,
  status: "draft",
});

describe("word trait data", () => {
  it("counts the canonical sense rows for each word", () => {
    const counts = buildSenseCountByWord([
      sense("produce", 1, "v.", "生產"),
      sense("produce", 2, "n.", "農產品"),
    ]);
    expect(counts.get("produce")).toBe(2);
  });

  it("marks both sides of confusable and exam-distractor relations", () => {
    const relations = [
      { word: "accept", relatedWord: "except", relationType: "confuse" },
      { word: "demand", relatedWord: "persuasive", relationType: "exam_distractor" },
      { word: "large", relatedWord: "big", relationType: "synonym" },
    ] as RelationRecord[];
    expect([...buildConfusableWordSet(relations)].sort()).toEqual(["accept", "demand", "except", "persuasive"]);
  });

  it("marks only words that have real morpheme records", () => {
    const records = [{ word: "inspect" }, { word: "respect" }] as MorphemeRecord[];
    expect(buildMorphemeWordSet(records)).toEqual(new Set(["inspect", "respect"]));
  });
});
