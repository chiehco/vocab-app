import { progressDb } from "../db/progressDb";
import type {
  CardState,
  CheckInRecord,
  QuizStatRecord,
  ReviewLogEntry,
  SettingRecord,
} from "../db/types";

const BACKUP_APP_ID = "vocab-app-progress";
const BACKUP_SCHEMA_VERSION = 1;

export interface ProgressBackup {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  data: {
    cardStates: CardState[];
    reviewLogs: ReviewLogEntry[];
    checkIns: CheckInRecord[];
    quizStats: QuizStatRecord[];
    settings: SettingRecord[];
  };
}

export async function exportProgress(): Promise<ProgressBackup> {
  const [cardStates, reviewLogs, checkIns, quizStats, settings] = await Promise.all([
    progressDb.cardStates.toArray(),
    progressDb.reviewLogs.toArray(),
    progressDb.checkIns.toArray(),
    progressDb.quizStats.toArray(),
    progressDb.settings.toArray(),
  ]);
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { cardStates, reviewLogs, checkIns, quizStats, settings },
  };
}

export function downloadProgressBackup(backup: ProgressBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `單字通進度備份-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 驗證備份檔結構。回傳錯誤訊息，null 表示通過。 */
export function validateBackup(obj: unknown): string | null {
  if (typeof obj !== "object" || obj === null) return "檔案內容不是有效的 JSON 物件";
  const b = obj as Partial<ProgressBackup>;
  if (b.app !== BACKUP_APP_ID) return "這不是本 App 的進度備份檔";
  if (typeof b.schemaVersion !== "number") return "備份檔缺少版本資訊";
  if (b.schemaVersion > BACKUP_SCHEMA_VERSION)
    return `備份檔版本（${b.schemaVersion}）比 App 支援的版本新，請先更新 App`;
  const d = b.data;
  if (typeof d !== "object" || d === null) return "備份檔缺少資料內容";
  for (const key of ["cardStates", "reviewLogs", "checkIns", "quizStats", "settings"] as const) {
    if (!Array.isArray(d[key])) return `備份檔的 ${key} 資料格式不正確`;
  }
  return null;
}

/** 匯入備份：整批覆蓋現有進度（單一交易，失敗即整體回滾）。 */
export async function importProgress(backup: ProgressBackup): Promise<void> {
  await progressDb.transaction(
    "rw",
    [
      progressDb.cardStates,
      progressDb.reviewLogs,
      progressDb.checkIns,
      progressDb.quizStats,
      progressDb.settings,
    ],
    async () => {
      await Promise.all([
        progressDb.cardStates.clear(),
        progressDb.reviewLogs.clear(),
        progressDb.checkIns.clear(),
        progressDb.quizStats.clear(),
        progressDb.settings.clear(),
      ]);
      // reviewLogs 的 id 是自動遞增主鍵，匯入時保留原 id
      await Promise.all([
        progressDb.cardStates.bulkPut(backup.data.cardStates),
        progressDb.reviewLogs.bulkPut(backup.data.reviewLogs),
        progressDb.checkIns.bulkPut(backup.data.checkIns),
        progressDb.quizStats.bulkPut(backup.data.quizStats),
        progressDb.settings.bulkPut(backup.data.settings),
      ]);
    },
  );
}
