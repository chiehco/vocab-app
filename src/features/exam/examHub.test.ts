import { describe, expect, it } from "vitest";
import type { CardState, ExamPriorityRecord, WordRecord } from "../../db/types";
import { buildExamTaskReviewQueues } from "./examOverview";
import { buildExamHubProgress } from "./examHub";

function priority(word: string, tier: ExamPriorityRecord["priorityTier"]): ExamPriorityRecord {
  return {
    wordId: `W-${word}`, word, rank: 1, level: "LV1", pos: null, meaningZh: null,
    priorityTier: tier, scoreXuece: 0, xtBase: 0, xtOption: 0, xtCross: 0,
    xtYears: 0, xtYearList: null, xtOptionCount: 0, xtAnswerCount: 0,
    advancedTier: null, scoreZhikao: 0, zkYears: 0, zkYearList: null,
    zkOptionCount: 0, zkAnswerCount: 0, isFunctionWord: false,
  };
}

function card(word: string, dueDate: string, practicePending = false): CardState {
  return {
    word, state: "learning", easeFactor: 2.5, intervalDays: 1, repetitions: 1,
    dueDate, lastReviewedAt: null, lapses: 0, createdAt: "2026-09-01", practicePending,
  };
}

describe("exam hub progress", () => {
  it("counts only S+A words and includes practice-pending cards in today's review", () => {
    const result = buildExamHubProgress(
      [priority("alpha", "S"), priority("bravo", "A"), priority("charlie", "B")],
      [card("alpha", "2026-09-05", true), card("bravo", "2026-09-03"), card("charlie", "2026-09-03")],
      "2026-09-04",
    );

    expect(result).toEqual({
      total: 2,
      learned: 2,
      due: 2,
      s: { total: 1, learned: 1 },
      a: { total: 1, learned: 1 },
    });
  });
});

it("keeps today's new words in confirmation, even when older S+A work is due", () => {
  const words = ["alpha", "bravo", "charlie", "delta"].map(word => ({ word, wordId: `W-${word}` } as WordRecord));
  const priorities = words.map(word => priority(word.word, word.word === "charlie" ? "B" : "A"));
  const today = "2026-09-04";
  const older = card("alpha", today);
  const fresh = { ...card("bravo", today, true), state: "new" as const, createdAt: new Date(2026, 8, 4, 12).toISOString() };
  const confirmed = { ...fresh, word: "delta", dueDate: "2026-09-05", practicePending: false };
  const queues = buildExamTaskReviewQueues(words, priorities, [older, fresh, card("charlie", today), confirmed], today);
  expect(queues.due.map(item => item.wordRecord.word)).toEqual(["alpha"]);
  expect(queues.confirm.map(item => item.wordRecord.word)).toEqual(["bravo"]);
  expect(queues.confirm[0]).toMatchObject({ isNew: false, isPractice: true });
});
