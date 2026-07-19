import { describe, expect, it } from "vitest";
import type { ExampleRecord, MorphemeRecord, RelationRecord } from "../../db/types";
import { buildConfusableWordSet, buildMorphemeWordSet, buildSenseCountByWord } from "./wordTraits";

const example = (word: string, pos: string, hint: string): ExampleRecord => ({
  exampleId: `${word}:${pos}:${hint}`,
  word,
  sensePos: pos,
  meaningHint: hint,
  exampleType: "daily",
  sentenceEn: "Example.",
  sentenceZh: null,
  blankSentence: null,
  answer: null,
  difficulty: null,
  status: "draft",
});

describe("word trait data", () => {
  it("counts distinct contextual senses without inflating duplicate examples", () => {
    const counts = buildSenseCountByWord([
      example("produce", "v.", "生產"),
      example("produce", "v.", "生產"),
      example("produce", "n.", "農產品"),
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
