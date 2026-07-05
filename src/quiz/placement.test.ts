import { describe, expect, it } from "vitest";
import { scorePlacement } from "./placement";

const r = (level: string, correct: number, total = 4) => ({ level, correct, total });

describe("scorePlacement", () => {
  it("LV1-2 全對、LV3 掉到一半：建議從 LV3 開始", () => {
    const { recommendedLevel } = scorePlacement([
      r("LV1", 4), r("LV2", 4), r("LV3", 2), r("LV4", 1), r("LV5", 0), r("LV6", 0),
    ]);
    expect(recommendedLevel).toBe("LV3");
  });

  it("75% 算達標（4 題對 3 題過關）", () => {
    const { recommendedLevel } = scorePlacement([
      r("LV1", 3), r("LV2", 3), r("LV3", 2), r("LV4", 0), r("LV5", 0), r("LV6", 0),
    ]);
    expect(recommendedLevel).toBe("LV3");
  });

  it("全部答很差：建議從 LV1 開始", () => {
    const { recommendedLevel } = scorePlacement([
      r("LV1", 1), r("LV2", 0), r("LV3", 0), r("LV4", 0), r("LV5", 0), r("LV6", 0),
    ]);
    expect(recommendedLevel).toBe("LV1");
  });

  it("全部達標：建議從 LV6 開始", () => {
    const { recommendedLevel } = scorePlacement([
      r("LV1", 4), r("LV2", 4), r("LV3", 4), r("LV4", 4), r("LV5", 4), r("LV6", 4),
    ]);
    expect(recommendedLevel).toBe("LV6");
  });

  it("缺某級結果時視為 0 分", () => {
    const { recommendedLevel, results } = scorePlacement([r("LV1", 4)]);
    expect(recommendedLevel).toBe("LV2");
    expect(results).toHaveLength(6);
  });
});
