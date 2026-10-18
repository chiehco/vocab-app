import { progressDb } from "../db/progressDb";
import type { VocabProgressDB } from '../db/progressDb';
import { validDecorationBackup, type OwnedDecoration } from '../features/town/decorations/model';
import { validGroup } from "../features/direct/model";
import { validGsatBackup } from "../features/exam/gsatStore";
import { validWrittenBackup } from "../features/exam/writtenModel";
import { validRewardBackup } from '../features/rewards/backup';
import type { RewardWallet, RewardRound, RewardEvent } from '../features/rewards/model';
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
const BACKUP_SCHEMA_VERSION = 8;

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
    rewardWallet?: RewardWallet[];
    rewardRounds?: RewardRound[];
    rewardLedger?: RewardEvent[];
    townDecorations?: OwnedDecoration[];
  };
}

export async function exportProgress(db:VocabProgressDB=progressDb): Promise<ProgressBackup> {
  return db.transaction('r', db.tables, async () => {
  const [cardStates, reviewLogs, checkIns, quizStats, settings, customGroups, directSessions, directAttempts, writtenSessions, writtenSubmissions, rewardWallet, rewardRounds, rewardLedger, townDecorations] = await Promise.all([
    db.cardStates.toArray(),
    db.reviewLogs.toArray(),
    db.checkIns.toArray(),
    db.quizStats.toArray(),
    db.settings.toArray(),
    db.customGroups.toArray(),
    db.directSessions.toArray(),
    db.directAttempts.toArray(),
    db.writtenSessions.toArray(),
    db.writtenSubmissions.toArray(),
    db.rewardWallet.toArray(),
    db.rewardRounds.toArray(),
    db.rewardLedger.toArray(),
    db.townDecorations.toArray(),
  ]);
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { cardStates, reviewLogs, checkIns, quizStats, settings, customGroups, directSessions, directAttempts, writtenSessions, writtenSubmissions, rewardWallet, rewardRounds, rewardLedger, townDecorations },
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
  if (b.schemaVersion >= 8 && !validDecorationBackup(d.townDecorations)) return '備份含無效或重疊的裝飾配置';
  const decorationSpend=b.schemaVersion>=8 ? d.townDecorations!.reduce((sum,row)=>sum+row.pricePaid,0) : 0;
  if (b.schemaVersion >= 6 && !validRewardBackup(d.rewardWallet,d.rewardRounds,d.rewardLedger,decorationSpend)) return '備份含不一致的金幣紀錄或餘額';
  return null;
}

/** 匯入備份：整批覆蓋現有進度（單一交易，失敗即整體回滾）。 */
export async function importProgress(backup: ProgressBackup,db:VocabProgressDB=progressDb): Promise<void> {
  const error = validateBackup(backup);
  if (error) throw new Error(error);
  await db.transaction(
    "rw",
    [
      db.cardStates,
      db.reviewLogs,
      db.checkIns,
      db.quizStats,
      db.settings,
      db.customGroups,
      db.directSessions,
      db.directAttempts,
      db.writtenSessions,
      db.writtenSubmissions,
      db.rewardWallet,
      db.rewardRounds,
      db.rewardLedger,
      db.townDecorations,
    ],
    async () => {
      // A legacy wallet cannot overwrite spending without its ownership receipts.
      if(backup.schemaVersion>=6 && backup.schemaVersion<8 && await db.townDecorations.count())throw Error('此舊版備份不含裝飾，無法覆蓋已有購買的資料。請使用包含裝飾的新版備份。');
      await Promise.all([
        db.cardStates.clear(),
        db.reviewLogs.clear(),
        db.checkIns.clear(),
        db.quizStats.clear(),
        db.settings.clear(),
      ]);
      // 舊版備份沒有新功能資料：保留現有群組與練習，避免意外遺失。
      if (backup.schemaVersion >= 2) {
        await Promise.all([db.customGroups.clear(), db.directSessions.clear(), db.directAttempts.clear()]);
        await db.customGroups.bulkPut(backup.data.customGroups!);
        await db.directSessions.bulkPut(backup.data.directSessions!);
        await db.directAttempts.bulkPut(backup.data.directAttempts!);
      }
      if (backup.schemaVersion >= 3) {
        await Promise.all([db.writtenSessions.clear(),db.writtenSubmissions.clear()]);
        await db.writtenSessions.bulkPut(backup.data.writtenSessions!);
        await db.writtenSubmissions.bulkPut(backup.data.writtenSubmissions!);
      }
      // Older backups cannot erase a wallet or restart its claim/round records.
      if (backup.schemaVersion >= 6) {
        await Promise.all([db.rewardWallet.clear(),db.rewardRounds.clear(),db.rewardLedger.clear()]);
        await db.rewardWallet.bulkPut(backup.data.rewardWallet!);
        await db.rewardRounds.bulkPut(backup.data.rewardRounds!);
        await db.rewardLedger.bulkPut(backup.data.rewardLedger!);
      }
      if(backup.schemaVersion>=8) {
        await db.townDecorations.clear();
        await db.townDecorations.bulkPut(backup.data.townDecorations!);
      }
      // v1/v2 do not contain written work: preserve it. v3 replaces all tables atomically.
      // reviewLogs 的 id 是自動遞增主鍵，匯入時保留原 id
      await Promise.all([
        db.cardStates.bulkPut(backup.data.cardStates),
        db.reviewLogs.bulkPut(backup.data.reviewLogs),
        db.checkIns.bulkPut(backup.data.checkIns),
        db.quizStats.bulkPut(backup.data.quizStats),
        db.settings.bulkPut(backup.data.settings),
      ]);
    },
  );
}
