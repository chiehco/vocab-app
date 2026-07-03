import { contentDb } from "./contentDb";
import type {
  ExampleRecord,
  MorphemeRecord,
  RelationRecord,
  WordRecord,
} from "./types";

interface DataMeta {
  schemaVersion: number;
  generatedAt: string;
  counts: Record<string, number>;
  wordsHash: string;
}

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/v1/${name}`);
  if (!res.ok) throw new Error(`無法載入資料檔 ${name}（HTTP ${res.status}）`);
  return res.json() as Promise<T>;
}

/**
 * 啟動時檢查：bundled meta.json 的 wordsHash 與 DB 內存值不同（或 DB 是空的）
 * 就整批重灌內容資料。只動 VocabContentDB，進度資料庫完全不受影響。
 */
export async function seedContentIfNeeded(): Promise<void> {
  const meta = await fetchJson<DataMeta>("meta.json");
  const current = await contentDb.meta.get("current");
  if (current && current.wordsHash === meta.wordsHash) return;

  const [words, examples, relations, morphemes] = await Promise.all([
    fetchJson<WordRecord[]>("words.json"),
    fetchJson<ExampleRecord[]>("examples.json"),
    fetchJson<RelationRecord[]>("relations.json"),
    fetchJson<MorphemeRecord[]>("morphemes.json"),
  ]);

  await contentDb.transaction(
    "rw",
    [contentDb.words, contentDb.examples, contentDb.relations, contentDb.morphemes, contentDb.meta],
    async () => {
      await Promise.all([
        contentDb.words.clear(),
        contentDb.examples.clear(),
        contentDb.relations.clear(),
        contentDb.morphemes.clear(),
      ]);
      await Promise.all([
        contentDb.words.bulkPut(words),
        contentDb.examples.bulkPut(examples),
        contentDb.relations.bulkPut(relations),
        contentDb.morphemes.bulkPut(morphemes),
      ]);
      await contentDb.meta.put({
        key: "current",
        wordsHash: meta.wordsHash,
        generatedAt: meta.generatedAt,
        counts: meta.counts,
      });
    },
  );
}
