import { describe, expect, it } from "vitest";
import { getExamStarCount, getExamStarText, type ExamTier } from "./examTier";

describe("ExamTierBadge", () => {
  it("將內部考頻等級轉成五階星級", () => {
    const tiers: ExamTier[] = ["S", "A", "B", "C", "Z"];
    expect(tiers.map(getExamStarCount)).toEqual([5, 4, 3, 2, 1]);
    expect(tiers.map(getExamStarText)).toEqual([
      "★★★★★",
      "★★★★☆",
      "★★★☆☆",
      "★★☆☆☆",
      "★☆☆☆☆",
    ]);
  });
});
