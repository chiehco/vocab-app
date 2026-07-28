import { describe, expect, it } from "vitest";
import type { MorphemeRecord } from "../../db/types";
import {
  buildRootFamilies,
  isFamilyMorpheme,
  normalizeMorphemeKey,
  pickFamilyMorphemes,
} from "./rootFamily";

function morpheme(overrides: Partial<MorphemeRecord> = {}): MorphemeRecord {
  return {
    rowId: "M0001",
    word: "resist",
    morpheme: "sist",
    morphemeType: "root",
    meaningZh: "站立",
    meaningEn: "to stand",
    origin: "拉丁文 sistere",
    order: 2,
    note: null,
    status: "draft",
    ...overrides,
  };
}

describe("isFamilyMorpheme", () => {
  it("認得字根、字基與結合形", () => {
    expect(isFamilyMorpheme(morpheme({ morphemeType: "root" }))).toBe(true);
    expect(isFamilyMorpheme(morpheme({ morphemeType: "base" }))).toBe(true);
    expect(isFamilyMorpheme(morpheme({ morphemeType: "combining_form" }))).toBe(true);
  });

  it("排除字首字尾，避免串出幾百字的雜訊網", () => {
    expect(isFamilyMorpheme(morpheme({ morphemeType: "prefix" }))).toBe(false);
    expect(isFamilyMorpheme(morpheme({ morphemeType: "suffix" }))).toBe(false);
    expect(isFamilyMorpheme(morpheme({ morphemeType: null }))).toBe(false);
  });
});

describe("normalizeMorphemeKey", () => {
  it("忽略大小寫、前後空白與連字號", () => {
    expect(normalizeMorphemeKey("Eco-")).toBe("eco");
    expect(normalizeMorphemeKey(" milli- ")).toBe("milli");
    expect(normalizeMorphemeKey("GRAPH")).toBe("graph");
  });
});

describe("pickFamilyMorphemes", () => {
  it("依 order 排序並濾掉字首字尾", () => {
    const picked = pickFamilyMorphemes([
      morpheme({ rowId: "M2", morpheme: "sist", morphemeType: "root", order: 2 }),
      morpheme({ rowId: "M1", morpheme: "re", morphemeType: "prefix", order: 1 }),
      morpheme({ rowId: "M3", morpheme: "ance", morphemeType: "suffix", order: 3 }),
    ]);
    expect(picked.map((item) => item.morpheme)).toEqual(["sist"]);
  });

  it("最多取三個構件", () => {
    const picked = pickFamilyMorphemes(
      [1, 2, 3, 4].map((order) => morpheme({ rowId: `M${order}`, morpheme: `r${order}`, order })),
    );
    expect(picked).toHaveLength(3);
  });
});

describe("buildRootFamilies", () => {
  const self = morpheme({ rowId: "M-self", word: "resist", morpheme: "sist" });

  it("串出同根字並排除自己", () => {
    const families = buildRootFamilies(
      [self],
      [
        self,
        morpheme({ rowId: "M-a", word: "insist", morpheme: "sist" }),
        morpheme({ rowId: "M-b", word: "consist", morpheme: "sist" }),
        morpheme({ rowId: "M-c", word: "resist", morpheme: "sist" }),
      ],
      "resist",
    );
    expect(families).toHaveLength(1);
    expect(families[0].morpheme).toBe("sist");
    expect(families[0].meaningZh).toBe("站立");
    expect(families[0].siblings).toEqual(["consist", "insist"]);
  });

  it("同一個字有多列同根時只算一次", () => {
    const families = buildRootFamilies(
      [self],
      [
        morpheme({ rowId: "M-a", word: "insist", morpheme: "sist", order: 2 }),
        morpheme({ rowId: "M-b", word: "insist", morpheme: "SIST", order: 3 }),
      ],
      "resist",
    );
    expect(families[0].siblings).toEqual(["insist"]);
  });

  it("沒有同族字時不產生空的字族", () => {
    expect(buildRootFamilies([self], [self], "resist")).toEqual([]);
  });

  it("忽略候選中的字首字尾列", () => {
    const families = buildRootFamilies(
      [self],
      [morpheme({ rowId: "M-x", word: "review", morpheme: "sist", morphemeType: "prefix" })],
      "resist",
    );
    expect(families).toEqual([]);
  });

  it("依 limit 截斷同族字", () => {
    const candidates = ["alpha", "beta", "gamma", "delta"].map((word, index) =>
      morpheme({ rowId: `M-${index}`, word, morpheme: "sist" }),
    );
    const families = buildRootFamilies([self], candidates, "resist", 2);
    expect(families[0].siblings).toEqual(["alpha", "beta"]);
  });

  it("兩個字族構件各自成組，重複的 key 不重覆列出", () => {
    const families = buildRootFamilies(
      [
        morpheme({ rowId: "M1", word: "biography", morpheme: "bio", order: 1 }),
        morpheme({ rowId: "M2", word: "biography", morpheme: "graphy", order: 2 }),
        morpheme({ rowId: "M3", word: "biography", morpheme: "Bio-", order: 3 }),
      ],
      [
        morpheme({ rowId: "M4", word: "biology", morpheme: "bio" }),
        morpheme({ rowId: "M5", word: "geography", morpheme: "graphy" }),
      ],
      "biography",
    );
    expect(families.map((family) => family.morpheme)).toEqual(["bio", "graphy"]);
    expect(families[0].siblings).toEqual(["biology"]);
    expect(families[1].siblings).toEqual(["geography"]);
  });
});
