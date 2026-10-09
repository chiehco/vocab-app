import "fake-indexeddb/auto";
import { readFileSync, readdirSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { contentDb } from "./contentDb";
import { ensureContentAvailable } from "./seed";
import { templateGroup } from "../features/direct/model";
import { resolveGroupWords } from "../features/direct/groupScope";

type Item = { kind?: string; officialWordId?: string | null; review?: string; illustration?: unknown };
const direct = "src/features/direct/";
const data = "public/data/v1/";
function read<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
function items(file: string) {
  return read<{ learningItems: Item[] }>(direct + file).learningItems;
}
const units = ["curriculum.json", "curriculumUnit2.json"];
const pack = read<{ words: { wordId: string }[] }>(data + "sa-pack.json");

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(contentDb.tables.map(table => table.clear()));
});

it("啟動包完整收錄 LV3 U1/U2，保留 S+A、LV4 reviewed、LV1 reviewed 且不擴其他範圍", () => {
  const expected = new Set(read<{ wordId: string; priorityTier: string }[]>(data + "exam_priority.json")
    .filter(row => ["S", "A"].includes(row.priorityTier)).map(row => row.wordId));
  for (const file of readdirSync(direct).filter(name => /^curriculumLV4Unit.*\.json$/.test(name))) {
    for (const item of items(file)) {
      if (item.kind === "vocabulary" && item.officialWordId && item.review === "content_reviewed" && item.illustration) {
        expected.add(item.officialWordId);
      }
    }
  }
  for (const item of read<Item[]>("src/features/vocabulary/lv1ReviewedImages.json")) {
    if (item.officialWordId) expected.add(item.officialWordId);
  }
  for (const file of units) {
    for (const item of items(file)) {
      if (item.kind === "vocabulary" && item.officialWordId) expected.add(item.officialWordId);
    }
  }
  expect(new Set(pack.words.map(word => word.wordId))).toEqual(expected);
  expect(pack.words).toHaveLength(expected.size);
});

it("空庫安裝實際啟動包後，LV3 U1/U2 已映射字卡全部可解析且共用主卡去重", async () => {
  await Promise.all(contentDb.tables.map(table => table.clear()));
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (!url.endsWith("/sa-pack.json")) throw new Error(`Unexpected full-data fallback: ${url}`);
    return new Response(JSON.stringify(pack));
  }));
  await ensureContentAvailable();
  const installed = await contentDb.words.toArray();
  for (const [index, unit] of [1, 2].entries()) {
    const ids = items(units[index]).filter(item => item.kind === "vocabulary" && item.officialWordId)
      .map(item => item.officialWordId!);
    expect(ids).toHaveLength([99, 116][index]);
    expect(new Set(ids).size).toBe([98, 116][index]);
    expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
    expect(new Set(resolveGroupWords(templateGroup(unit), installed).map(word => word.wordId)))
      .toEqual(new Set(ids));
  }
  expect(fetch).toHaveBeenCalledTimes(1);
}, 15000);
