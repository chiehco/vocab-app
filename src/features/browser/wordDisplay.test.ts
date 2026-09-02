import { describe, expect, it } from "vitest";
import type { MediaRecord, SenseRecord, WordRecord } from "../../db/types";
import { firstSummaryMeaning, getWordDisplaySense, getWordIllustrationMedia } from "./wordDisplay";

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
  it("uses approved picture captions and ignores draft, empty, and non-image records", () => {
    const approved: MediaRecord = {
      assetId: "A1", targetType: "word", targetWord: "for", targetHint: "為了",
      mediaType: "image", imageType: "scenario", promptEn: null,
      captionZh: "豆豆為了朋友準備禮物。", status: "approved", licenseNote: null,
    };
    const unsuitable = [
      { ...approved, status: "draft" }, { ...approved, captionZh: "  " },
      { ...approved, mediaType: "video" }, { ...approved, targetType: "sentence" },
    ];
    expect(getWordIllustrationMedia([...unsuitable, approved])).toBe(approved);
    expect(getWordIllustrationMedia(unsuitable)).toBeUndefined();
    expect(getWordIllustrationMedia([])).toBeUndefined();
  });
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

  it.each([
    ["joint", "adj.", "共同的", "jointly", "adv."],
    ["embarrass", "v.", "使人尷尬", "embarrassing", "adj."],
  ])("shows the explicit %s headword sense before a different-POS exam form", (name, pos, meaning, form, examPos) => {
    const record = word({ word: name, pos, posAll: [pos] });
    const exam = sense({ answerForms: [form], sensePos: examPos });
    const basic = sense({ senseId: "basic", isExamSense: false, answerForms: [name],
      sensePos: pos, meaningZh: meaning, status: "needs_check", senseOrder: 2 });
    expect(getWordDisplaySense(record, [exam, basic])).toEqual({
      meaning, pos, needsReview: true, source: "sense",
    });
  });

  it("keeps exam priority for same-POS inflections", () => {
    const record = word({ word: "promise", pos: "v.", posAll: ["v."] });
    const exam = sense({ answerForms: ["promised"], sensePos: "v.", meaningZh: "承諾" });
    const basic = sense({ isExamSense: false, answerForms: ["promise"], sensePos: "v.", meaningZh: "有望" });
    expect(getWordDisplaySense(record, [basic, exam]).meaning).toBe("承諾");
  });

  it("retains a labeled derived-form sense when no explicit headword sense exists", () => {
    const record = word({ word: "note", pos: "v./n.", posAll: ["v.", "n."] });
    const exam = sense({ answerForms: ["noted"], sensePos: "adj.", meaningZh: "以……著稱（be noted for）" });
    expect(getWordDisplaySense(record, [exam]).meaning).toBe("以……著稱（be noted for）");
  });
});
