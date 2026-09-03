import Dexie, { type Table } from "dexie";
import type {
  CardState,
  CheckInRecord,
  QuizStatRecord,
  ReviewLogEntry,
  SettingRecord,
} from "./types";

/**
 * 進度資料庫：使用者的學習紀錄，永不因內容更新而清除。
 * 升級只允許加欄位/加表，絕不砍表或改主鍵。
 */
export class VocabProgressDB extends Dexie {
  cardStates!: Table<CardState, string>;
  reviewLogs!: Table<ReviewLogEntry, number>;
  checkIns!: Table<CheckInRecord, string>;
  quizStats!: Table<QuizStatRecord, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super("VocabProgressDB");
    this.version(1).stores({
      cardStates: "word, dueDate, state",
      reviewLogs: "++id, word, reviewedAt, sessionId",
      checkIns: "date",
      quizStats: "word",
      settings: "key",
    });
  }
}

export const progressDb = new VocabProgressDB();

export const ALL_LEVELS = ["LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];

export const DEFAULT_SETTINGS = {
  dailyNewWordCap: 15,
  reviewSessionSize: 20,
  learningLevels: ALL_LEVELS,
  fontScale: 1,
} as const;

export async function getSetting<T>(key: keyof typeof DEFAULT_SETTINGS): Promise<T> {
  const row = await progressDb.settings.get(key);
  return (row?.value ?? DEFAULT_SETTINGS[key]) as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await progressDb.settings.put({ key, value });
}
