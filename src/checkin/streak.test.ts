import { describe, expect, it } from "vitest";
import { computeCurrentStreak, computeLongestStreak } from "./streak";

const today = new Date(2026, 6, 3); // 2026-07-03（月份從 0 起算）

describe("computeCurrentStreak", () => {
  it("今天已打卡：連續天數含今天", () => {
    const dates = new Set(["2026-07-01", "2026-07-02", "2026-07-03"]);
    expect(computeCurrentStreak(dates, today)).toEqual({ streak: 3, atRisk: false });
  });

  it("今天未打卡但昨天有：atRisk，streak 到昨天為止", () => {
    const dates = new Set(["2026-07-01", "2026-07-02"]);
    expect(computeCurrentStreak(dates, today)).toEqual({ streak: 2, atRisk: true });
  });

  it("中斷過：只算最近一段", () => {
    const dates = new Set(["2026-06-28", "2026-06-29", "2026-07-02", "2026-07-03"]);
    expect(computeCurrentStreak(dates, today)).toEqual({ streak: 2, atRisk: false });
  });

  it("完全沒打卡：0 天且不顯示 atRisk", () => {
    expect(computeCurrentStreak(new Set(), today)).toEqual({ streak: 0, atRisk: false });
  });

  it("前天有、昨天沒有：streak 0", () => {
    const dates = new Set(["2026-07-01"]);
    expect(computeCurrentStreak(dates, today)).toEqual({ streak: 0, atRisk: false });
  });
});

describe("computeLongestStreak", () => {
  it("取歷史最長一段", () => {
    const dates = new Set([
      "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04",
      "2026-06-10", "2026-06-11",
      "2026-07-03",
    ]);
    expect(computeLongestStreak(dates)).toBe(4);
  });

  it("空集合為 0", () => {
    expect(computeLongestStreak(new Set())).toBe(0);
  });
});
