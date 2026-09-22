import { describe, expect, it } from "vitest";
import { buildUsagePatternItems } from "./usagePattern";

describe("buildUsagePatternItems", () => {
  it("pairs aligned English and Chinese collocations", () => {
    expect(buildUsagePatternItems(
      "have a great time; a great deal of N; It's great to V",
      "玩得很開心；大量的……；做……很棒",
    )).toEqual([
      { english: "have a great time", chinese: "玩得很開心" },
      { english: "a great deal of N", chinese: "大量的……" },
      { english: "It's great to V", chinese: "做……很棒" },
    ]);
  });

  it("keeps English usable when Chinese segments do not align", () => {
    expect(buildUsagePatternItems("first; second", "只有一段")).toEqual([
      { english: "first", chinese: undefined },
      { english: "second", chinese: undefined },
    ]);
  });
});
