import { describe, expect, it } from "vitest";
import { monthBounds, monthCells, monthLabel, shiftMonth } from "./calendarMonth";

describe("calendarMonth", () => {
  it("月初前補空格、月底補滿整週，週日開頭", () => {
    // 2026-10-01 是星期四
    const cells = monthCells("2026-10");
    expect(cells.slice(0, 4).every(c => c.key === null)).toBe(true);
    expect(cells[4]).toEqual({ key: "2026-10-01", day: 1 });
    expect(cells.filter(c => c.key).length).toBe(31);
    // 10/31 是星期六，剛好排滿 5 週，不需要尾端補位
    expect(cells.length).toBe(35);
    expect(cells.at(-1)?.key).toBe("2026-10-31");
    // 2026-11 從星期日開始、30 日是星期一，尾端補 5 格
    const nov = monthCells("2026-11");
    expect(nov[0].key).toBe("2026-11-01");
    expect(nov.length).toBe(35);
    expect(nov.at(-1)?.key).toBeNull();
  });

  it("二月與閏年天數正確", () => {
    expect(monthCells("2026-02").filter(c => c.key).length).toBe(28);
    expect(monthCells("2028-02").filter(c => c.key).length).toBe(29);
  });

  it("跨年加減月份", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(shiftMonth("2026-10", -13)).toBe("2025-09");
  });

  it("翻月範圍從第一筆打卡到本月", () => {
    expect(monthBounds([], "2026-10-09")).toEqual({ earliest: "2026-10", current: "2026-10" });
    expect(monthBounds(["2026-08-03", "2026-09-30"], "2026-10-09")).toEqual({ earliest: "2026-08", current: "2026-10" });
  });

  it("月份標題", () => {
    expect(monthLabel("2026-03")).toBe("2026 年 3 月");
  });
});
