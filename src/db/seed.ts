import { contentDb } from "./contentDb";
import type {
  ExampleRecord,
  ExamPriorityRecord,
  MediaRecord,
  MorphemeRecord,
  NoteRecord,
  RelationRecord,
  SenseRecord,
  WordRecord,
} from "./types";

interface DataMeta {
  schemaVersion: number;
  generatedAt: string;
  counts: Record<string, number>;
  wordsHash: string;
  contentHash?: string;
}

const DATA_BASE_URL = (import.meta.env.VITE_DATA_BASE_URL || `${import.meta.env.BASE_URL}data/v1/`)
  .replace(/\/?$/, "/");

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(`${DATA_BASE_URL}${name}`);
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
  const mediaCount = await contentDb.media.count();
  if (current && stored === incoming && mediaCount === (meta.counts.media ?? 0)) return;

  // 舊資料可缺選用表；已宣告有資料的表若下載失敗，不得用空表覆蓋既有內容。
  const optional = <T,>(file: string, countKey: string): Promise<T[]> =>
    fetchJson<T[]>(file).catch((error: unknown) => {
      if ((meta.counts[countKey] ?? 0) > 0) throw error;
      return [];
    });

  const [words, senses, examples, relations, morphemes, notes, examPriorities, media] = await Promise.all([
    fetchJson<WordRecord[]>("words.json"),
    optional<SenseRecord>("senses.json", "senses"),
    fetchJson<ExampleRecord[]>("examples.json"),
    fetchJson<RelationRecord[]>("relations.json"),
    fetchJson<MorphemeRecord[]>("morphemes.json"),
    optional<NoteRecord>("notes.json", "notes"),
    optional<ExamPriorityRecord>("exam_priority.json", "examPriority"),
    optional<MediaRecord>("media.json", "media"),
  ]);

  for (const [key, rows] of Object.entries({ words, senses, examples, relations, morphemes, notes, examPriority: examPriorities, media })) {
    if (!Array.isArray(rows) || (meta.counts[key] !== undefined && rows.length !== meta.counts[key])) {
      throw new Error(`資料筆數不符：${key}；保留既有內容，請重新載入。`);
    }
  }

  await contentDb.transaction(
    "rw",
    [
      contentDb.words,
      contentDb.senses,
      contentDb.examples,
      contentDb.relations,
      contentDb.morphemes,
      contentDb.notes,
      contentDb.examPriorities,
      contentDb.media,
      contentDb.meta,
    ],
    async () => {
      await Promise.all([
        contentDb.words.clear(),
        contentDb.senses.clear(),
        contentDb.examples.clear(),
        contentDb.relations.clear(),
        contentDb.morphemes.clear(),
        contentDb.notes.clear(),
        contentDb.examPriorities.clear(),
        contentDb.media.clear(),
      ]);
      await Promise.all([
        contentDb.words.bulkPut(words),
        contentDb.senses.bulkPut(senses),
        contentDb.examples.bulkPut(examples),
        contentDb.relations.bulkPut(relations),
        contentDb.morphemes.bulkPut(morphemes),
        contentDb.notes.bulkPut(notes),
        contentDb.examPriorities.bulkPut(examPriorities),
        contentDb.media.bulkPut(media),
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
