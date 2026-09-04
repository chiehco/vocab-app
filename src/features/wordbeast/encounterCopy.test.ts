import { describe, expect, it } from "vitest";
import type { ExampleRecord, WordRecord } from "../../db/types";
import { getEncounterMeaning, getEncounterPos, getPrimaryMeaning, stripExamPoint } from "./encounterCopy";

const obedient: WordRecord = {
  wordId: "W003684",
  word: "obedient",
  wordVariants: ["obedient"],
  level: "LV4",
  pos: "adj.",
  posAll: ["adj."],
  meaningZh: "服從的；順從的；孝順的；忠順的",
  meaningEn: null,
  usagePattern: null,
  syllables: null,
  stressPattern: null,
  phoneticUs: null,
  familyKey: "obedient",
  isCore: true,
  sourceNote: null,
  status: "draft",
};

const derivativeExample: ExampleRecord = {
  exampleId: "EX-obediently",
  word: "obedient",
  sensePos: "adv.",
  meaningHint: "順從地（考點：obediently 副詞）",
  exampleType: "exam",
  sentenceEn: "The puppy sat obediently.",
  sentenceZh: "小狗順從地坐好。",
  blankSentence: "The puppy sat _____.",
  answer: "obediently",
  difficulty: "LV4",
  status: "draft",
};

describe("word-beast encounter copy", () => {
  it("removes exam-point annotations from visible clues", () => {
    expect(stripExamPoint("部位（考點：body parts 身體部位）")).toBe("部位");
  });

  it("falls back to the target word when the example tests a derivative", () => {
    expect(getEncounterMeaning(obedient, derivativeExample)).toBe("服從的；順從的；孝順的；忠順的");
    expect(getEncounterPos(obedient, derivativeExample)).toBe("adj.");
  });

  it("uses the approved image meaning before a broader dictionary meaning", () => {
    expect(getEncounterMeaning(obedient, derivativeExample, "順從")).toBe("順從");
  });

  it("shows only the first common meaning when a false name is cut", () => {
    expect(getPrimaryMeaning("神祕的；不可思議的；難解的")).toBe("神祕的");
  });
});
