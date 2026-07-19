import { describe, expect, it } from "vitest";
import { S_GRADE_ASSET_IDS } from "./sGradeAssetIds";
import { getWordBeastAsset, hasWordBeastAsset } from "./wordBeastAssets";

describe("word beast assets", () => {
  it("tracks the complete audited S-grade asset set", () => {
    expect(S_GRADE_ASSET_IDS.size).toBe(179);
  });

  it("prefers an S-grade semantic image over the overlapping LV1 range", () => {
    expect(getWordBeastAsset("W000270", "even")).toMatch(
      /wordbeast\/s\/W000270\.webp\?v=/,
    );
  });

  it("keeps legacy and LV1 fallbacks for non-S words", () => {
    expect(getWordBeastAsset("W999999", "volcano")).toMatch(
      /wordbeast\/priest-volcano\.png\?v=/,
    );
    expect(getWordBeastAsset("W000250", "unknown")).toMatch(
      /wordbeast\/lv1\/W000250\.png\?v=/,
    );
  });

  it("rejects IDs without a known asset", () => {
    expect(getWordBeastAsset("W999999", "unknown")).toBeNull();
    expect(hasWordBeastAsset("W999999", "unknown")).toBe(false);
  });
});
