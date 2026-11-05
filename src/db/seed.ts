import { contentDb } from "./contentDb";
import type { Table } from 'dexie';
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

interface ContentBundle {
  words: WordRecord[];
  senses: SenseRecord[];
  examples: ExampleRecord[];
  relations: RelationRecord[];
  morphemes: MorphemeRecord[];
  notes: NoteRecord[];
  examPriorities: ExamPriorityRecord[];
  media: MediaRecord[];
}

interface BootstrapBundle extends ContentBundle {
  meta: DataMeta;
}

const DATA_BASE_URL = (import.meta.env.VITE_DATA_BASE_URL || `${import.meta.env.BASE_URL}data/v1/`)
  .replace(/\/?$/, "/");

async function fetchJson<T>(name: string, fresh = false): Promise<T> {
  const controller = fresh ? new AbortController() : undefined;
  const timeout = controller ? setTimeout(() => controller.abort(), 30_000) : undefined;
  try {
    // This query is deliberately outside Workbox's ignored parameters. A stable
    // URL plus no-cache revalidates HTTP caches without reusing an old SW pack.
    const url = `${DATA_BASE_URL}${name}${fresh ? '?dictionary-update=1' : ''}`;
    const res = fresh
      ? await fetch(url, { cache: 'no-cache', signal: controller!.signal })
      : await fetch(url);
    if (!res.ok) throw new Error(`無法載入資料檔 ${name}（HTTP ${res.status}）`);
    return await res.json() as T;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

/**
 * 網路不可用時，只接受先前完整安裝過、或由 S+A 啟動包安裝的內容。
 * meta 與 words 筆數相符，足以排除首次啟動留下的空庫或不完整資料。
 */
async function hasUsableLocalContent(): Promise<boolean> {
  const current = await contentDb.meta.get("current");
  if (!current || (current.counts.words ?? 0) <= 0) return false;
  return contentDb.words.count().then((count) => count === current.counts.words);
}

function validateBundle(meta: DataMeta, bundle: ContentBundle): void {
  const countRows = {
    words: bundle.words,
    senses: bundle.senses,
    examples: bundle.examples,
    relations: bundle.relations,
    morphemes: bundle.morphemes,
    notes: bundle.notes,
    examPriority: bundle.examPriorities,
    media: bundle.media,
  };
  for (const [key, rows] of Object.entries(countRows)) {
    if (!Array.isArray(rows) || (meta.counts[key] !== undefined && rows.length !== meta.counts[key])) {
      throw new Error(`資料筆數不符：${key}；保留既有內容，請重新載入。`);
    }
  }
}

function sameContentValue(left:unknown,right:unknown):boolean {
  if(Object.is(left,right))return true;
  if(!left||!right||typeof left!=='object'||typeof right!=='object')return false;
  if(Array.isArray(left)||Array.isArray(right))return Array.isArray(left)&&Array.isArray(right)&&left.length===right.length&&left.every((value,index)=>sameContentValue(value,right[index]));
  if(Object.getPrototypeOf(left)!==Object.getPrototypeOf(right))return false;
  const keys=Object.keys(left);
  return keys.length===Object.keys(right).length&&keys.every(key=>Object.hasOwn(right,key)&&sameContentValue((left as Record<string,unknown>)[key],(right as Record<string,unknown>)[key]));
}

async function replaceChangedRows<T>(table: Table<T, string>, incoming: T[], key: (row:T)=>string): Promise<void> {
  // Compare stored rows rather than read-time editorial projections. Keep full
  // replacement semantics, including deleted rows and removed optional fields.
  const existing = await table.toCollection().raw().toArray();
  const previous = new Map(existing.map(row => [key(row), row]));
  const incomingIds = new Set(incoming.map(key));
  const removed = existing.map(key).filter(id => !incomingIds.has(id));
  const changed = incoming.filter(row => !sameContentValue(previous.get(key(row)),row));
  if (removed.length) await table.bulkDelete(removed);
  if (changed.length) await table.bulkPut(changed);
}

async function installBundle(meta: DataMeta, bundle: ContentBundle): Promise<void> {
  validateBundle(meta, bundle);
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
        replaceChangedRows(contentDb.words,bundle.words,row=>row.wordId),
        replaceChangedRows(contentDb.senses,bundle.senses,row=>row.senseId),
        replaceChangedRows(contentDb.examples,bundle.examples,row=>row.exampleId),
        replaceChangedRows(contentDb.relations,bundle.relations,row=>row.relationId),
        replaceChangedRows(contentDb.morphemes,bundle.morphemes,row=>row.rowId),
        replaceChangedRows(contentDb.notes,bundle.notes,row=>row.noteId),
        replaceChangedRows(contentDb.examPriorities,bundle.examPriorities,row=>row.wordId),
        replaceChangedRows(contentDb.media,bundle.media,row=>row.assetId),
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

/**
 * 讓首頁先可用：已有本機資料就立刻返回；空庫優先安裝單檔 S+A 啟動包。
 * 舊版部署若還沒有啟動包，會退回原本的完整資料安裝流程。
 */
export async function ensureContentAvailable(): Promise<void> {
  if (await hasUsableLocalContent()) return;
  try {
    const pack = await fetchJson<BootstrapBundle>("sa-pack.json");
    const { meta, ...bundle } = pack;
    await installBundle(meta, bundle);
  } catch {
    await seedContentIfNeeded();
  }
}

export interface DictionaryUpdateResult {
  status: 'updated' | 'current';
  scope: 'starter' | 'full';
  generatedAt: string;
}

let updateInFlight: Promise<DictionaryUpdateResult> | null = null;

/** Both manual and background checks share one atomic content-only operation. */
export function updateDictionaryContent(): Promise<DictionaryUpdateResult> {
  if (!updateInFlight) {
    const task = synchronizeInstalledContent();
    updateInFlight = task;
    const release = () => { if (updateInFlight === task) updateInFlight = null; };
    void task.then(release, release);
  }
  return updateInFlight;
}

async function synchronizeInstalledContent(): Promise<DictionaryUpdateResult> {
  const current = await contentDb.meta.get("current");
  const scope = !current || current.contentHash?.startsWith('sa:') ? 'starter' : 'full';
  if (scope === 'starter') {
    const pack = await fetchJson<BootstrapBundle>('sa-pack.json', true);
    validateBundle(pack.meta, pack);
    const incoming = pack.meta.contentHash ?? pack.meta.wordsHash;
    const stored = current?.contentHash ?? current?.wordsHash;
    if (incoming === stored && await hasUsableLocalContent()) {
      return { status: 'current', scope, generatedAt: pack.meta.generatedAt };
    }
    const { meta, ...bundle } = pack;
    await installBundle(meta, bundle);
    return { status: 'updated', scope, generatedAt: meta.generatedAt };
  }
  const meta = await fetchJson<DataMeta>('meta.json', true);
  const incoming = meta.contentHash ?? meta.wordsHash;
  const stored = current?.contentHash ?? current?.wordsHash;
  if (incoming === stored && await hasUsableLocalContent()
    && await contentDb.media.count() === (meta.counts.media ?? 0)) {
    return { status: 'current', scope, generatedAt: meta.generatedAt };
  }
  await installBundle(meta, await downloadFullBundle(meta, true));
  return { status: 'updated', scope, generatedAt: meta.generatedAt };
}

/** Offline startup stays usable; manual callers receive the actual failure. */
export async function refreshInstalledContent(): Promise<void> {
  try {
    await updateDictionaryContent();
  } catch {
    // Content and progress are retained. The settings action can retry explicitly.
  }
}

async function downloadFullBundle(meta: DataMeta, fresh = false): Promise<ContentBundle> {
  const optional = <T,>(file: string, countKey: string): Promise<T[]> =>
    fetchJson<T[]>(file, fresh).catch((error: unknown) => {
      if ((meta.counts[countKey] ?? 0) > 0) throw error;
      return [];
    });
  const [words, senses, examples, relations, morphemes, notes, examPriorities, media] = await Promise.all([
    fetchJson<WordRecord[]>('words.json', fresh),
    optional<SenseRecord>('senses.json', 'senses'),
    fetchJson<ExampleRecord[]>('examples.json', fresh),
    fetchJson<RelationRecord[]>('relations.json', fresh),
    fetchJson<MorphemeRecord[]>('morphemes.json', fresh),
    optional<NoteRecord>('notes.json', 'notes'),
    optional<ExamPriorityRecord>('exam_priority.json', 'examPriority'),
    optional<MediaRecord>('media.json', 'media'),
  ]);
  return { words, senses, examples, relations, morphemes, notes, examPriorities, media };
}

/**
 * 啟動時檢查：bundled meta.json 的 wordsHash 與 DB 內存值不同（或 DB 是空的）
 * 就整批重灌內容資料。只動 VocabContentDB，進度資料庫完全不受影響。
 */
export async function seedContentIfNeeded(): Promise<void> {
  let meta: DataMeta;
  try {
    meta = await fetchJson<DataMeta>("meta.json");
  } catch (error) {
    if (await hasUsableLocalContent()) return;
    throw error;
  }
  const current = await contentDb.meta.get("current");
  // contentHash 涵蓋所有資料檔；舊版 meta 沒有此欄位時退回 wordsHash
  const incoming = meta.contentHash ?? meta.wordsHash;
  const stored = current?.contentHash ?? current?.wordsHash;
  const mediaCount = await contentDb.media.count();
  if (current && stored === incoming && mediaCount === (meta.counts.media ?? 0)) return;

  let bundle: ContentBundle;
  try {
    bundle = await downloadFullBundle(meta);
  } catch (error) {
    if (await hasUsableLocalContent()) return;
    throw error;
  }
  await installBundle(meta, bundle);
}
