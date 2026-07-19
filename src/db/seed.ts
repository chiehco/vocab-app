import { contentDb } from "./contentDb";
import type {
  ExampleRecord,
  ExamPriorityRecord,
  MorphemeRecord,
  NoteRecord,
  RelationRecord,
  WordRecord,
} from "./types";

interface DataMeta {
  schemaVersion: number;
  generatedAt: string;
  counts: Record<string, number>;
  wordsHash: string;
  contentHash?: string;
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
  // contentHash 涵蓋所有資料檔；舊版 meta 沒有此欄位時退回 wordsHash
  const incoming = meta.contentHash ?? meta.wordsHash;
  const stored = current?.contentHash ?? current?.wordsHash;
  if (current && stored === incoming) return;

  const [words, examples, relations, morphemes, notes, examPriorities] = await Promise.all([
    fetchJson<WordRecord[]>("words.json"),
    fetchJson<ExampleRecord[]>("examples.json"),
    fetchJson<RelationRecord[]>("relations.json"),
    fetchJson<MorphemeRecord[]>("morphemes.json"),
    fetchJson<NoteRecord[]>("notes.json").catch(() => [] as NoteRecord[]),
    fetchJson<ExamPriorityRecord[]>("exam_priority.json").catch(() => [] as ExamPriorityRecord[]),
  ]);

  await contentDb.transaction(
    "rw",
    [
      contentDb.words,
      contentDb.examples,
      contentDb.relations,
      contentDb.morphemes,
      contentDb.notes,
      contentDb.examPriorities,
      contentDb.meta,
    ],
    async () => {
      await Promise.all([
        contentDb.words.clear(),
        contentDb.examples.clear(),
        contentDb.relations.clear(),
        contentDb.morphemes.clear(),
        contentDb.notes.clear(),
        contentDb.examPriorities.clear(),
      ]);
      await Promise.all([
        contentDb.words.bulkPut(words),
        contentDb.examples.bulkPut(examples),
        contentDb.relations.bulkPut(relations),
        contentDb.morphemes.bulkPut(morphemes),
        contentDb.notes.bulkPut(notes),
        contentDb.examPriorities.bulkPut(examPriorities),
      ]);
      await contentDb.meta.put({
        key: "current",
        wordsHash: meta.wordsHash,
        contentHash: meta.contentHash,
        generatedAt: meta.generatedAt,
        counts: meta.counts,
      });
    },
  );
}
