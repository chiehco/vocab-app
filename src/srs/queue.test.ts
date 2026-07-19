import { describe, expect, it } from "vitest";
import type { CardState } from "../db/types";
import { wasCardCreatedOn } from "./queue";

function card(createdAt: string, lastReviewedAt: string | null): CardState {
  return {
    word: "test",
    state: "review",
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: 1,
    dueDate: "2026-07-20",
    lastReviewedAt,
    lapses: 0,
    createdAt,
  };
}

describe("wasCardCreatedOn", () => {
  it("辨認今天首次收服且已完成作答的卡片", () => {
    const createdAt = new Date(2026, 6, 19, 12).toISOString();
    expect(wasCardCreatedOn(card(createdAt, createdAt), "2026-07-19")).toBe(true);
  });

  it("排除舊卡與尚未完成作答的卡片", () => {
    const oldDate = new Date(2026, 6, 18, 12).toISOString();
    const today = new Date(2026, 6, 19, 12).toISOString();
    expect(wasCardCreatedOn(card(oldDate, today), "2026-07-19")).toBe(false);
    expect(wasCardCreatedOn(card(today, null), "2026-07-19")).toBe(false);
  });
});
