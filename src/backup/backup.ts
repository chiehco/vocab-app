import { progressDb } from "../db/progressDb";
import { validGroup } from "../features/direct/model";
import { validGsatBackup } from "../features/exam/gsatStore";
import { validWrittenBackup } from "../features/exam/writtenModel";
import type { WrittenSession, WrittenSubmission } from "../features/exam/writtenModel";
import type { CustomGroup, DirectSession, DirectAttempt } from "../features/direct/model";
import type {
  CardState,
  CheckInRecord,
  QuizStatRecord,
  ReviewLogEntry,
  SettingRecord,
} from "../db/types";

const BACKUP_APP_ID = "vocab-app-progress";
const BACKUP_SCHEMA_VERSION = 5;

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
    customGroups?: CustomGroup[];
    directSessions?: DirectSession[];
    directAttempts?: DirectAttempt[];
    writtenSessions?: WrittenSession[];
    writtenSubmissions?: WrittenSubmission[];
  };
}

export async function exportProgress(): Promise<ProgressBackup> {
  return progressDb.transaction('r', progressDb.tables, async () => {
  const [cardStates, reviewLogs, checkIns, quizStats, settings, customGroups, directSessions, directAttempts, writtenSessions, writtenSubmissions] = await Promise.all([
    progressDb.cardStates.toArray(),
    progressDb.reviewLogs.toArray(),
    progressDb.checkIns.toArray(),
    progressDb.quizStats.toArray(),
    progressDb.settings.toArray(),
    progressDb.customGroups.toArray(),
    progressDb.directSessions.toArray(),
    progressDb.directAttempts.toArray(),
    progressDb.writtenSessions.toArray(),
    progressDb.writtenSubmissions.toArray(),
  ]);
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { cardStates, reviewLogs, checkIns, quizStats, settings, customGroups, directSessions, directAttempts, writtenSessions, writtenSubmissions },
  };
  });
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
  if (typeof b.exportedAt !== 'string' || !Number.isFinite(Date.parse(b.exportedAt))) return '備份日期無效';
  if (typeof b.schemaVersion !== "number") return "備份檔缺少版本資訊";
  if (!Number.isInteger(b.schemaVersion) || b.schemaVersion < 1) return "備份檔版本無效";
  if (b.schemaVersion > BACKUP_SCHEMA_VERSION)
    return `備份檔版本（${b.schemaVersion}）比 App 支援的版本新，請先更新 App`;
  const d = b.data;
  if (typeof d !== "object" || d === null) return "備份檔缺少資料內容";
  for (const key of ["cardStates", "reviewLogs", "checkIns", "quizStats", "settings"] as const) {
    if (!Array.isArray(d[key])) return `備份檔的 ${key} 資料格式不正確`;
  }
  if (b.schemaVersion >= 2) {
    for (const key of ['customGroups', 'directSessions', 'directAttempts'] as const) {
      const rows = d[key];
      if (!Array.isArray(rows) || rows.some(r => !r || typeof r.id !== 'string' || !r.id) || new Set(rows.map(r => r.id)).size !== rows.length) return `備份檔的 ${key} 資料格式不正確`;
    }
    if (d.customGroups!.some(g => !validGroup(g))) return '備份含無效群組';
    const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
    const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
    if (d.directSessions!.some(s => s.title !== undefined && typeof s.title !== 'string' || s.groupId !== undefined && typeof s.groupId !== 'string' || s.scopeQuestionIds !== undefined && (!strings(s.scopeQuestionIds) || new Set(s.scopeQuestionIds).size !== s.scopeQuestionIds.length || !strings(s.questionIds) || s.questionIds.some(id=>!s.scopeQuestionIds!.includes(id))))) return '備份含無效群組練習範圍';
    if (d.directSessions!.some(s => !strings(s.questionIds) || !s.questionIds.length || new Set(s.questionIds).size !== s.questionIds.length || !Number.isInteger(s.index) || s.index < 0 || s.index > s.questionIds.length || !record(s.choices) || Object.values(s.choices).some(v => typeof v !== 'string') || !record(s.lookups) || Object.values(s.lookups).some(v => !strings(v)) || typeof s.revision !== 'string' || !Number.isFinite(s.startedAt) || !Number.isFinite(s.updatedAt))) return '備份含無效續答資料';
    if (d.directAttempts!.some(a => typeof a.questionId !== 'string' || typeof a.choice !== 'string' || typeof a.revision !== 'string' || typeof a.correct !== 'boolean' || typeof a.firstAttempt !== 'boolean' || typeof a.hintUsed !== 'boolean' || !strings(a.lookedUpWords) || a.hintUsed !== (a.lookedUpWords.length > 0) || a.schedulingApplied !== false || !Number.isFinite(a.answeredAt) || a.id !== `${a.sessionId}:${a.questionId}` || !d.directSessions!.some(s => s.id === a.sessionId && s.questionIds.includes(a.questionId)))) return '備份含無效作答資料';
    const first = d.directAttempts!.filter(a => a.firstAttempt).map(a => a.questionId);
    if (new Set(first).size !== first.length) return '備份含重複首答紀錄';
    if (!validGsatBackup(d.directSessions!, d.directAttempts!)) return '備份含不完整的學測題組或作答紀錄';
  }
  if (b.schemaVersion >= 3 && !validWrittenBackup(d.writtenSessions,d.writtenSubmissions)) return '備份含不完整或無效的非選作答與自評紀錄';
  return null;
}

/** 匯入備份：整批覆蓋現有進度（單一交易，失敗即整體回滾）。 */
export async function importProgress(backup: ProgressBackup): Promise<void> {
  const error = validateBackup(backup);
  if (error) throw new Error(error);
  await progressDb.transaction(
    "rw",
    [
      progressDb.cardStates,
      progressDb.reviewLogs,
      progressDb.checkIns,
      progressDb.quizStats,
      progressDb.settings,
      progressDb.customGroups,
      progressDb.directSessions,
      progressDb.directAttempts,
      progressDb.writtenSessions,
      progressDb.writtenSubmissions,
    ],
    async () => {
      await Promise.all([
        progressDb.cardStates.clear(),
        progressDb.reviewLogs.clear(),
        progressDb.checkIns.clear(),
        progressDb.quizStats.clear(),
        progressDb.settings.clear(),
      ]);
      // 舊版備份沒有新功能資料：保留現有群組與練習，避免意外遺失。
      if (backup.schemaVersion >= 2) {
        await Promise.all([progressDb.customGroups.clear(), progressDb.directSessions.clear(), progressDb.directAttempts.clear()]);
        await progressDb.customGroups.bulkPut(backup.data.customGroups!);
        await progressDb.directSessions.bulkPut(backup.data.directSessions!);
        await progressDb.directAttempts.bulkPut(backup.data.directAttempts!);
      }
      if (backup.schemaVersion >= 3) {
        await Promise.all([progressDb.writtenSessions.clear(),progressDb.writtenSubmissions.clear()]);
        await progressDb.writtenSessions.bulkPut(backup.data.writtenSessions!);
        await progressDb.writtenSubmissions.bulkPut(backup.data.writtenSubmissions!);
      }
      // v1/v2 do not contain written work: preserve it. v3 replaces all tables atomically.
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
