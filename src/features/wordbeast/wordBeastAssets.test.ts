import { describe, expect, it } from "vitest";
import { A_GRADE_ASSET_IDS } from "./aGradeAssetIds";
import { S_GRADE_ASSET_IDS } from "./sGradeAssetIds";
import { getWordBeastAsset, hasWordBeastAsset } from "./wordBeastAssets";

describe("word beast assets", () => {
  it("tracks the complete audited S-grade asset set", () => {
    expect(S_GRADE_ASSET_IDS.size).toBe(185);
  });

  it("includes the six generated S-tier function-word scenes", () => {
    for (const wordId of ["W000323", "W000606", "W000897", "W000134", "W000615", "W000888"]) {
      expect(getWordBeastAsset(wordId, "function-word")).toMatch(
        new RegExp(`wordbeast/s/${wordId}\\.webp\\?v=`),
      );
    }
  });

  it("tracks the locally approved A-tier illustration batches", () => {
    expect(A_GRADE_ASSET_IDS.size).toBe(793);
    expect(getWordBeastAsset("W000851", "take")).toMatch(
      /wordbeast\/a\/W000851\.webp\?v=/,
    );
    expect(getWordBeastAsset("W000343", "get")).toMatch(
      /wordbeast\/a\/W000343\.webp\?v=/,
    );
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
    expect(getWordBeastAsset("W000251", "unknown")).toMatch(
      /wordbeast\/lv1\/W000251\.png\?v=/,
    );
  });

  it("allows split words such as agree and agreement to share one image", () => {
    const agreeAsset = getWordBeastAsset("W000250", "agree");
    const agreementAsset = getWordBeastAsset("W006013", "agreement", "W000250");
    expect(agreementAsset).toBe(agreeAsset);
    expect(hasWordBeastAsset("W006013", "agreement", "W000250")).toBe(true);
  });

  it("rejects IDs without a known asset", () => {
    expect(getWordBeastAsset("W999999", "unknown")).toBeNull();
    expect(hasWordBeastAsset("W999999", "unknown")).toBe(false);
  });
});
