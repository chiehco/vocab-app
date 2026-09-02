import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contentDb } from "../db/contentDb";
import { progressDb } from "../db/progressDb";
import type { WordRecord } from "../db/types";
import { buildTodayQueue, buildTodayRecapQueue } from "../srs/queue";
import { getCardState, getKnownWords, getLogicalCardStates } from "../db/progressIdentity";
import { PROGRESS_RENAMES } from "../db/progressRenames";
import { exportProgress, importProgress } from "../backup/backup";
import { newCardState } from "../srs/sm2";
import { gradeFlashcard, recordQuizAnswer, recordReviewWithoutScheduling } from "./recordActivity";
import { computeCurrentStreak, computeLongestStreak } from "./streak";

const TODAY = "2026-08-30";
function setDay(day: number) { vi.setSystemTime(new Date(2026, 7, day, 12)); }
function word(word: string, wordId: string): WordRecord {
  return { word, wordId, level: "LV1", pos: "n.", posAll: ["n."], meaningZh: "測試",
    meaningEn: null, usagePattern: null, syllables: null, stressPattern: null, phoneticUs: null,
    familyKey: null, isCore: true, sourceNote: null, status: "approved" };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setDay(30);
  await Promise.all([...progressDb.tables, ...contentDb.tables].map((table) => table.clear()));
  await contentDb.words.bulkPut([word("apple", "W000001"), word("beach", "W000002"), word("cat", "W000003")]);
  await progressDb.settings.put({ key: "dailyNewWordCap", value: 1 });
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("新版詞頭沿用舊進度（原主鍵與歷史保留）", () => {
  const oldName = "enjoy(ment)";
  const newName = "enjoy";
  async function installRenamedWord() {
    await contentDb.words.bulkPut([word(newName, "W000264"), word("enjoyment", "WNEW001")]);
  }

  it("62 個經核對的改名都可回到同一張卡；讀取不改任何進度表", async () => {
    await contentDb.words.bulkPut(PROGRESS_RENAMES.map((row) => word(row.word, row.wordId)));
    await progressDb.cardStates.bulkPut(PROGRESS_RENAMES.map((row) => newCardState(row.oldWord, TODAY)));
    const before = (await exportProgress()).data;
    for (const row of PROGRESS_RENAMES) expect((await getCardState(row.word))?.word).toBe(row.oldWord);
    const known = await getKnownWords();
    expect(known.sort()).toEqual(PROGRESS_RENAMES.map((row) => row.word).sort());
    const queue = await buildTodayQueue(undefined, PROGRESS_RENAMES.map((row) => row.word));
    expect(queue).toHaveLength(PROGRESS_RENAMES.length);
    expect(queue.every((item) => !item.isNew)).toBe(true);
    expect((await exportProgress()).data).toEqual(before);
  });

  it("舊卡練習、正式回想、同日回顧、隔日複習都沿用原排程且不重計新字", async () => {
    await contentDb.words.put(word(oldName, "W000264"));
    await recordQuizAnswer(oldName, true, "quiz-w2m", "legacy", true);
    await installRenamedWord();
    await recordQuizAnswer(newName, false, "fill-blank", "updated", true);
    expect((await buildTodayQueue(undefined, [newName]))[0]).toMatchObject({ isNew: false, isPractice: true });
    expect(await progressDb.quizStats.get(oldName)).toMatchObject({ timesAsked: 2, timesCorrect: 1 });
    expect(await gradeFlashcard(newName, 2, "recall", true)).toMatchObject({ word: oldName, intervalDays: 1, dueDate: "2026-08-31" });
    expect((await buildTodayRecapQueue(undefined, [newName])).map((item) => item.wordRecord.word)).toEqual([newName]);
    await recordReviewWithoutScheduling(newName, 0, "recap", true);
    expect(await getCardState(newName)).toMatchObject({ intervalDays: 1, practicePending: true });
    await gradeFlashcard(newName, 2, "retry", true);
    expect(await progressDb.checkIns.get(TODAY)).toMatchObject({ newWordsCount: 1, reviewCount: 5 });
    setDay(31);
    expect(await gradeFlashcard(newName, 2, "tomorrow", true)).toMatchObject({ word: oldName, intervalDays: 6, dueDate: "2026-09-06" });
    expect(await progressDb.checkIns.get("2026-08-31")).toMatchObject({ newWordsCount: 0, reviewCount: 1 });
    expect(await progressDb.cardStates.count()).toBe(1);
    expect(await progressDb.cardStates.get(newName)).toBeUndefined();
    expect((await progressDb.reviewLogs.toArray()).every((row) => row.word === oldName)).toBe(true);
  });

  it("新拆出的衍生字不繼承熟練度；沒有舊進度的新安裝使用新名稱", async () => {
    await installRenamedWord();
    await progressDb.cardStates.put({ ...newCardState(oldName, TODAY), state: "review", dueDate: "2026-09-10" });
    expect(await getCardState("enjoyment")).toBeUndefined();
    expect((await buildTodayQueue(undefined, [newName, "enjoyment"])).map((item) => [item.wordRecord.word, item.isNew])).toEqual([["enjoyment", true]]);
    await gradeFlashcard("enjoyment", 2, "derivative", true);
    expect(await progressDb.cardStates.get(oldName)).toMatchObject({ dueDate: "2026-09-10" });
    await progressDb.cardStates.clear();
    expect((await gradeFlashcard(newName, 2, "fresh", true)).word).toBe(newName);
  });

  it("新舊紀錄同時存在時選新卡，舊卡不加入到期數或熟練數，也不被覆寫", async () => {
    await installRenamedWord();
    const archived = { ...newCardState(oldName, TODAY), state: "review" as const, intervalDays: 90, repetitions: 9, practicePending: true };
    const current = { ...newCardState(newName, TODAY), dueDate: "2026-09-10" };
    await progressDb.cardStates.bulkPut([archived, current]);
    await progressDb.quizStats.bulkPut([
      { word: oldName, timesAsked: 50, timesCorrect: 50, lastAskedAt: null },
      { word: newName, timesAsked: 2, timesCorrect: 1, lastAskedAt: null },
    ]);
    expect(await getLogicalCardStates()).toEqual([current]);
    expect(await buildTodayQueue(undefined, [newName])).toEqual([]);
    await recordQuizAnswer(newName, false, "quiz-w2m", "conflict", true);
    expect(await getCardState(newName)).toMatchObject({ state: "new", repetitions: 0, practicePending: true });
    expect(await progressDb.cardStates.get(oldName)).toEqual(archived);
    expect(await progressDb.quizStats.get(oldName)).toMatchObject({ timesAsked: 50, timesCorrect: 50 });
    expect(await progressDb.quizStats.get(newName)).toMatchObject({ timesAsked: 3, timesCorrect: 1 });
    expect(await progressDb.checkIns.get(TODAY)).toMatchObject({ newWordsCount: 0 });
    expect((await exportProgress()).data.cardStates).toHaveLength(2);
  });

  it("舊 schema 1 備份在新版內容還原、重複還原後仍可接續，所有歷史不變", async () => {
    await contentDb.words.put(word(oldName, "W000264"));
    await recordQuizAnswer(oldName, true, "quiz-w2m", "legacy", true);
    await gradeFlashcard(oldName, 2, "recall", true);
    const backup = await exportProgress();
    await installRenamedWord();
    for (let i = 0; i < 2; i++) {
      await importProgress(backup);
      expect((await exportProgress()).data).toEqual(backup.data);
      expect((await getCardState(newName))?.word).toBe(oldName);
      expect(await getKnownWords()).toEqual([newName]);
    }
  });

  it("未換新版內容、ID 不符或舊名稱被其他內容沿用時不猜測連結", async () => {
    await contentDb.words.put(word(oldName, "W000264"));
    await progressDb.cardStates.put(newCardState(oldName, TODAY));
    expect(await getCardState(newName)).toBeUndefined();
    expect((await getCardState(oldName))?.word).toBe(oldName);
    await contentDb.words.clear();
    await contentDb.words.put(word(newName, "WRONG_ID"));
    expect(await getCardState(newName)).toBeUndefined();
    await contentDb.words.clear();
    await installRenamedWord();
    await contentDb.words.put(word(oldName, "OTHER_ID"));
    expect(await getCardState(newName)).toBeUndefined();
    expect(await getKnownWords()).toEqual([oldName]);
  });

  it("舊鍵並行作答不產生第二張卡；寫入失敗完整回滾，重試才計一次", async () => {
    await installRenamedWord();
    await progressDb.cardStates.put(newCardState(oldName, TODAY));
    const before = (await exportProgress()).data;
    vi.spyOn(progressDb.reviewLogs, "add").mockRejectedValueOnce(new Error("disk full"));
    await expect(recordQuizAnswer(newName, false, "quiz-w2m", "retry", true)).rejects.toThrow("disk full");
    expect((await exportProgress()).data).toEqual(before);
    await Promise.all([
      recordQuizAnswer(newName, false, "quiz-w2m", "retry", true),
      recordQuizAnswer(newName, true, "quiz-w2m", "retry", true),
    ]);
    expect(await progressDb.cardStates.count()).toBe(1);
    expect(await progressDb.quizStats.get(oldName)).toMatchObject({ timesAsked: 2, timesCorrect: 1 });
    expect(await progressDb.checkIns.get(TODAY)).toMatchObject({ newWordsCount: 0, reviewCount: 2, sessionsCount: 1 });
  });

  it("只留有舊題型統計的備份也延續次數，不把統計推算成回想熟練度", async () => {
    await installRenamedWord();
    await progressDb.quizStats.put({ word: oldName, timesAsked: 10, timesCorrect: 8, lastAskedAt: null });
    expect(await recordQuizAnswer(newName, true, "quiz-w2m", "stats", true)).toMatchObject({ word: newName, repetitions: 0, practicePending: true });
    expect(await progressDb.quizStats.get(oldName)).toMatchObject({ timesAsked: 11, timesCorrect: 9 });
    expect(await progressDb.quizStats.get(newName)).toBeUndefined();
  });
});

describe("練習 → 打卡 → 正式回想 → 間隔複習", () => {
  it("新字練習只登記待回想；不升熟練度，正式評分後才排明天", async () => {
    const practice = await recordQuizAnswer("apple", true, "quiz-w2m", "quiz-1", true);
    expect(practice).toMatchObject({ state: "new", repetitions: 0, intervalDays: 0,
      lastReviewedAt: null, dueDate: TODAY, practicePending: true });
    expect(await progressDb.checkIns.get(TODAY)).toMatchObject({ reviewCount: 1, newWordsCount: 1, sessionsCount: 1 });
    const queue = await buildTodayQueue(undefined, ["apple", "beach"]);
    expect(queue.map((item) => item.wordRecord.word)).toEqual(["apple"]);
    expect(queue[0].isPractice).toBe(true);
    const recalled = await gradeFlashcard("apple", 2, "review-1", true);
    expect(recalled).toMatchObject({ intervalDays: 1, repetitions: 1, dueDate: "2026-08-31", practicePending: false });
    expect(await progressDb.checkIns.get(TODAY)).toMatchObject({ reviewCount: 2, newWordsCount: 1, sessionsCount: 2 });
    expect((await progressDb.reviewLogs.toArray()).map((row) => row.schedulingApplied)).toEqual([false, true]);
    expect(await buildTodayQueue(undefined, ["apple"])).toEqual([]);
  });

  it("填空錯誤保留原排程，但排入確認；答對不會抹掉待回想狀態", async () => {
    const original = { ...newCardState("apple", TODAY), state: "review" as const,
      intervalDays: 15, repetitions: 3, dueDate: "2026-09-10", lastReviewedAt: new Date().toISOString() };
    await progressDb.cardStates.put(original);
    await recordQuizAnswer("apple", false, "fill-blank", "quiz-1", true);
    await recordQuizAnswer("apple", true, "quiz-image", "quiz-1", false);
    expect(await progressDb.cardStates.get("apple")).toEqual({ ...original, practicePending: true });
    expect((await buildTodayQueue(undefined, ["apple"])).map((item) => item.wordRecord.word)).toEqual(["apple"]);
    await gradeFlashcard("apple", 2, "review-1", true);
    expect(await progressDb.cardStates.get("apple")).toEqual({ ...original, practicePending: false });
    expect((await progressDb.reviewLogs.toArray()).every((row) => !row.schedulingApplied)).toBe(true);
  });

  it("正式忘記才縮短間隔；同日重答不會連續處罰或延長", async () => {
    await progressDb.cardStates.put({ ...newCardState("apple", TODAY), state: "review",
      intervalDays: 15, repetitions: 3, dueDate: "2026-09-10", lastReviewedAt: new Date().toISOString() });
    const failed = await gradeFlashcard("apple", 0, "review-1", true);
    expect(failed).toMatchObject({ intervalDays: 1, dueDate: "2026-08-31", lapses: 1, repetitions: 0 });
    expect(await gradeFlashcard("apple", 0, "review-1", false)).toEqual(failed);
    expect(await gradeFlashcard("apple", 3, "review-1", false)).toEqual(failed);
  });

  it("到期與逾期回想會更新間隔；隔日打卡按本地日分開", async () => {
    await gradeFlashcard("apple", 2, "review-1", true);
    setDay(31);
    expect((await buildTodayQueue(undefined, ["apple"])).length).toBe(1);
    const next = await gradeFlashcard("apple", 2, "review-2", true);
    expect(next).toMatchObject({ intervalDays: 6, dueDate: "2026-09-06" });
    expect(computeCurrentStreak(new Set(await progressDb.checkIns.toCollection().primaryKeys()), new Date())).toEqual({ streak: 2, atRisk: false });
    vi.setSystemTime(new Date(2026, 8, 8, 12));
    expect((await buildTodayQueue(undefined, ["apple"])).length).toBe(1);
    expect(await gradeFlashcard("apple", 2, "review-3", true)).toMatchObject({ intervalDays: 15, dueDate: "2026-09-23" });
  });

  it("漏一天後重新開始連續紀錄，保留歷史最長與舊打卡，不補造缺席日", async () => {
    await recordQuizAnswer("apple", true, "quiz-w2m", "day-1", true);
    setDay(31);
    await recordQuizAnswer("apple", false, "quiz-w2m", "day-2", true);
    vi.setSystemTime(new Date(2026, 8, 2, 12));
    const dates = () => progressDb.checkIns.toCollection().primaryKeys();
    expect(computeCurrentStreak(new Set(await dates()), new Date())).toEqual({ streak: 0, atRisk: false });
    await recordQuizAnswer("apple", true, "quiz-w2m", "return", true);
    expect(computeCurrentStreak(new Set(await dates()), new Date())).toEqual({ streak: 1, atRisk: false });
    expect(computeLongestStreak(new Set(await dates()))).toBe(2);
    expect(await dates()).toEqual(["2026-08-30", "2026-08-31", "2026-09-02"]);
    expect(await progressDb.checkIns.get("2026-09-02")).toMatchObject({reviewCount: 1, newWordsCount: 0, sessionsCount: 1});
    expect(await progressDb.reviewLogs.count()).toBe(3);
  });

  it("快速並行作答不重複增加新字數；S＋A 白名單不混入其他字", async () => {
    await Promise.all([
      recordQuizAnswer("apple", false, "quiz-w2m", "quiz-1", true),
      recordQuizAnswer("apple", true, "quiz-w2m", "quiz-1", false),
      recordQuizAnswer("cat", false, "quiz-w2m", "quiz-1", false),
    ]);
    expect(await progressDb.checkIns.get(TODAY)).toMatchObject({ reviewCount: 3, newWordsCount: 2, sessionsCount: 1 });
    expect(await progressDb.quizStats.get("apple")).toMatchObject({ timesAsked: 2, timesCorrect: 1 });
    expect((await buildTodayQueue(undefined, ["apple", "beach"])).map((item) => item.wordRecord.word)).toEqual(["apple"]);
  });

  it("捕捉／小遊戲即使走舊入口也不冒充正式回想", async () => {
    for (const mode of ["quiz-image", "slash"] as const) {
      expect(await gradeFlashcard("apple", 2, "game", false, mode)).toMatchObject({
        state: "new", intervalDays: 0, lastReviewedAt: null, practicePending: true,
      });
    }
    expect((await progressDb.reviewLogs.toArray()).every((row) => !row.schedulingApplied)).toBe(true);
  });

  it("同日回顧不更新間隔；忘記會留下正式回想待辦", async () => {
    const card = await gradeFlashcard("apple", 2, "review-1", true);
    await recordReviewWithoutScheduling("apple", 0, "recap", true);
    expect(await progressDb.cardStates.get("apple")).toEqual({ ...card, practicePending: true });
  });

  it("寫入失敗會回滾卡片、作答統計與打卡，不留下部分成功", async () => {
    vi.spyOn(progressDb.reviewLogs, "add").mockRejectedValueOnce(new Error("disk full"));
    await expect(recordQuizAnswer("apple", true, "quiz-w2m", "quiz-1", true)).rejects.toThrow("disk full");
    expect(await progressDb.cardStates.count()).toBe(0);
    expect(await progressDb.quizStats.count()).toBe(0);
    expect(await progressDb.checkIns.count()).toBe(0);
  });

  it("同一局跨午夜仍分日打卡，局數依實際紀錄而非前端旗標", async () => {
    vi.setSystemTime(new Date(2026, 7, 30, 23, 59, 59));
    await recordQuizAnswer("apple", true, "quiz-w2m", "overnight", false);
    vi.setSystemTime(new Date(2026, 7, 31, 0, 0, 1));
    await recordQuizAnswer("apple", true, "quiz-w2m", "overnight", false);
    await recordQuizAnswer("apple", true, "quiz-w2m", "overnight", true);
    expect(await progressDb.checkIns.get(TODAY)).toMatchObject({ reviewCount: 1, sessionsCount: 1 });
    expect(await progressDb.checkIns.get("2026-08-31")).toMatchObject({ reviewCount: 2, sessionsCount: 1, newWordsCount: 0 });
  });
});
