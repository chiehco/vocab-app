import { describe, expect, it } from "vitest";
import { applyGrade, scheduleRecall, newCardState } from "./sm2";

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

  it.each(["2027-01-02", "2027-01-09", "2027-01-15"])("考前熟字不因日期 %s 被壓成每日重考", today => {
    const mature = {...newCardState("test", today), state:"review" as const,
      intervalDays:38, repetitions:4, dueDate:today};
    const original=JSON.stringify(mature);
    const next=applyGrade(mature,2,today,"2027-01-16");
    expect(next.intervalDays).toBe(95);
    expect(next.dueDate).toBe(applyGrade(mature,2,today).dueDate);
    expect(JSON.stringify(mature)).toBe(original);
    expect(applyGrade(mature,0,today,"2027-01-16").intervalDays).toBe(1);
  });
  it("提前答對不延後既有日期；忘記仍提早召回",()=>{
    const mature={...newCardState("test",TODAY),state:"review" as const,
      intervalDays:38,repetitions:4,dueDate:"2027-02-10",lastReviewedAt:"2027-01-01T10:00:00Z"};
    expect(scheduleRecall(mature,2,"2027-01-15","2027-01-16")).toBe(mature);
    expect(scheduleRecall(mature,0,"2027-01-15","2027-01-16").dueDate).toBe("2027-01-16");
  });
});
