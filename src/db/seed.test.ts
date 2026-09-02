import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { contentDb } from "./contentDb";
import { progressDb } from "./progressDb";
import { seedContentIfNeeded } from "./seed";
import { gradeFlashcard } from "../checkin/recordActivity";
import { getCardState, getKnownWords } from "./progressIdentity";
import { exportProgress } from "../backup/backup";
import type { WordRecord } from "./types";

function bundle(hash: string, caption: string): Record<string, unknown> {
  return {
    "meta.json": { schemaVersion: 2, generatedAt: "2026-08-30", wordsHash: "same-words",
      contentHash: hash, counts: { words: 0, senses: 0, examples: 0, relations: 0,
        morphemes: 0, notes: 0, examPriority: 0, media: 1 } },
    "words.json": [], "senses.json": [], "examples.json": [], "relations.json": [],
    "morphemes.json": [], "notes.json": [], "exam_priority.json": [],
    "media.json": [{ assetId: "test-image", targetType: "word", targetWord: "apple", targetHint: "蘋果",
      mediaType: "image", imageType: "scene", promptEn: null, captionZh: caption, status: "approved", licenseNote: null }],
  };
}
function serve(data: Record<string, unknown>, unavailable?: string) {
  vi.stubGlobal("fetch", vi.fn(async (path: string) => {
    const name = path.split("/").pop()!;
    return new Response(JSON.stringify(data[name]), { status: name === unavailable ? 503 : 200 });
  }));
}
beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map((table) => table.clear()));
});
afterEach(() => vi.unstubAllGlobals());

it("相同字表、相同圖片筆數但說明更新時重匯內容，完整保留獨立進度", async () => {
  serve(bundle("old", "舊說明"));
  await seedContentIfNeeded();
  await gradeFlashcard("apple", 2, "session", true);
  await progressDb.settings.put({ key: "dailyNewWordCap", value: 7 });
  const before = await Promise.all(progressDb.tables.map((table) => table.toArray()));
  serve(bundle("new", "新說明"));
  await seedContentIfNeeded();
  expect((await contentDb.media.get("test-image"))?.captionZh).toBe("新說明");
  expect(await Promise.all(progressDb.tables.map((table) => table.toArray()))).toEqual(before);
});

it("已宣告的圖片表下載失敗時，保留上一版內容與 meta，允許重試", async () => {
  serve(bundle("old", "原說明"));
  await seedContentIfNeeded();
  serve(bundle("new", "新說明"), "media.json");
  await expect(seedContentIfNeeded()).rejects.toThrow("503");
  expect((await contentDb.meta.get("current"))?.contentHash).toBe("old");
  expect((await contentDb.media.get("test-image"))?.captionZh).toBe("原說明");
  serve(bundle("new", "新說明"));
  await seedContentIfNeeded();
  expect((await contentDb.meta.get("current"))?.contentHash).toBe("new");
});

it("資料筆數不符時不安裝不完整版本", async () => {
  const data = bundle("new", "新說明");
  data["media.json"] = [];
  serve(data);
  await expect(seedContentIfNeeded()).rejects.toThrow("資料筆數不符：media");
  expect(await contentDb.meta.count()).toBe(0);
});

it("改名內容更新失敗仍可使用舊卡，重試與重載後沿用原進度且不寫進度庫", async () => {
  function renamedBundle(hash: string, name: string) {
    const data = bundle(hash, "說明");
    const record: WordRecord = { wordId: "W000264", word: name, level: "LV1", pos: "v.", posAll: ["v."],
      meaningZh: "享受", meaningEn: null, usagePattern: null, syllables: null, stressPattern: null,
      phoneticUs: null, familyKey: null, isCore: true, sourceNote: null, status: "approved" };
    data["words.json"] = [record];
    (data["meta.json"] as { counts: Record<string, number> }).counts.words = 1;
    return data;
  }
  serve(renamedBundle("legacy", "enjoy(ment)"));
  await seedContentIfNeeded();
  await gradeFlashcard("enjoy(ment)", 2, "old-session", true);
  const before = (await exportProgress()).data;
  serve(renamedBundle("renamed", "enjoy"), "media.json");
  await expect(seedContentIfNeeded()).rejects.toThrow("503");
  expect(await getKnownWords()).toEqual(["enjoy(ment)"]);
  expect(await getCardState("enjoy")).toBeUndefined();
  serve(renamedBundle("renamed", "enjoy"));
  await seedContentIfNeeded();
  await seedContentIfNeeded();
  expect(await getKnownWords()).toEqual(["enjoy"]);
  expect(await getCardState("enjoy")).toEqual(before.cardStates[0]);
  expect((await exportProgress()).data).toEqual(before);
});
