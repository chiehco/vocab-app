import { describe, expect, it } from "vitest";
import { applyGrade, clampIntervalToExam, newCardState } from "./sm2";

const TODAY = "2026-07-03";

describe("applyGrade", () => {
  it("新卡第一次答 Good：間隔 1 天、進入 review", () => {
    const next = applyGrade(newCardState("test", TODAY), 2, TODAY);
    expect(next.intervalDays).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.state).toBe("review");
    expect(next.dueDate).toBe("2026-07-04");
    expect(next.easeFactor).toBeCloseTo(2.5); // Good 不改 EF
  });

  it("第二次答 Good：間隔 6 天", () => {
    let card = applyGrade(newCardState("test", TODAY), 2, TODAY);
    card = applyGrade(card, 2, TODAY);
    expect(card.intervalDays).toBe(6);
    expect(card.dueDate).toBe("2026-07-09");
  });

  it("第三次起：間隔 = round(前次間隔 × EF)", () => {
    let card = applyGrade(newCardState("test", TODAY), 2, TODAY);
    card = applyGrade(card, 2, TODAY);
    card = applyGrade(card, 2, TODAY);
    expect(card.intervalDays).toBe(Math.round(6 * 2.5)); // 15
  });

  it("Again：重置 repetitions、間隔 1 天、lapses+1、EF 掉 0.8 但不低於 1.3", () => {
    let card = applyGrade(newCardState("test", TODAY), 2, TODAY);
    card = applyGrade(card, 2, TODAY);
    const failed = applyGrade(card, 0, TODAY);
    expect(failed.repetitions).toBe(0);
    expect(failed.intervalDays).toBe(1);
    expect(failed.lapses).toBe(1);
    expect(failed.state).toBe("relearning");
    expect(failed.easeFactor).toBeCloseTo(1.7); // 2.5 - 0.8
  });

  it("EF 下限 1.3", () => {
    let card = newCardState("test", TODAY);
    for (let i = 0; i < 5; i++) card = applyGrade(card, 0, TODAY);
    expect(card.easeFactor).toBe(1.3);
  });

  it("Hard：算通過但 EF 降 0.14", () => {
    const next = applyGrade(newCardState("test", TODAY), 1, TODAY);
    expect(next.repetitions).toBe(1);
    expect(next.state).toBe("review");
    expect(next.easeFactor).toBeCloseTo(2.36);
  });

  it("Easy：EF 升 0.1", () => {
    const next = applyGrade(newCardState("test", TODAY), 3, TODAY);
    expect(next.easeFactor).toBeCloseTo(2.6);
  });

  it("新卡第一次就 Again：state 為 learning", () => {
    const next = applyGrade(newCardState("test", TODAY), 0, TODAY);
    expect(next.state).toBe("learning");
  });

  it("考試前把長間隔限制在剩餘天數的一半", () => {
    const mature = {
      ...newCardState("test", "2026-09-03"),
      state: "review" as const,
      intervalDays: 38,
      repetitions: 4,
    };
    const next = applyGrade(mature, 2, "2026-09-03", "2027-01-16");
    expect(next.intervalDays).toBe(67);
    expect(next.dueDate).toBe("2026-11-09");
  });

  it("考試日無效或已過時時不改 SM-2 間隔", () => {
    expect(clampIntervalToExam(95, "2027-01-17", "2027-01-16")).toBe(95);
    expect(clampIntervalToExam(95, "2026-09-03", "not-a-date")).toBe(95);
    expect(clampIntervalToExam(95, "2026-09-03")).toBe(95);
  });
});
