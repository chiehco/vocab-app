import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { ALL_LEVELS, DEFAULT_SETTINGS, progressDb, setSetting } from "../../db/progressDb";
import { applyFontScale, FONT_SCALE_OPTIONS, normalizeFontScale } from "../../settings/fontScale";
import {
  downloadProgressBackup,
  exportProgress,
  importProgress,
  validateBackup,
  type ProgressBackup,
} from "../../backup/backup";

export default function SettingsScreen() {
  const [resetArmed, setResetArmed] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<ProgressBackup | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const meta = useLiveQuery(() => contentDb.meta.get("current"), []);
  const cap = useLiveQuery(async () => {
    const row = await progressDb.settings.get("dailyNewWordCap");
    return (row?.value as number) ?? DEFAULT_SETTINGS.dailyNewWordCap;
  }, []);
  const levels = useLiveQuery(async () => {
    const row = await progressDb.settings.get("learningLevels");
    return (row?.value as string[]) ?? [...DEFAULT_SETTINGS.learningLevels];
  }, []);
  const fontScale = useLiveQuery(async () => {
    const row = await progressDb.settings.get("fontScale");
    return normalizeFontScale(row?.value ?? DEFAULT_SETTINGS.fontScale);
  }, []);
  const autoPronounce = useLiveQuery(async () => {
    const row = await progressDb.settings.get("autoPronounce");
    return (row?.value as boolean) ?? DEFAULT_SETTINGS.autoPronounce;
  }, []);
  const examDate = useLiveQuery(async () => {
    const row = await progressDb.settings.get("examDate");
    return (row?.value as string) ?? DEFAULT_SETTINGS.examDate;
  }, []);

  async function toggleLevel(lv: string) {
    if (!levels) return;
    const next = levels.includes(lv)
      ? levels.filter((l) => l !== lv)
      : [...levels, lv];
    if (next.length === 0) return; // 至少保留一級
    await setSetting("learningLevels", next);
  }

  async function resetProgress() {
    await progressDb.transaction(
      "rw",
      [
        progressDb.cardStates,
        progressDb.reviewLogs,
        progressDb.checkIns,
        progressDb.quizStats,
      ],
      async () => {
        await Promise.all([
          progressDb.cardStates.clear(),
          progressDb.reviewLogs.clear(),
          progressDb.checkIns.clear(),
          progressDb.quizStats.clear(),
        ]);
      },
    );
    setResetArmed(false);
    setResetDone(true);
  }

  return (
    <div className="settings-page p-4">
      <Link to="/" className="text-sm text-(--ui-accent)">
        ← 回首頁
      </Link>
      <h1 className="mt-2 mb-4 text-[2rem] font-bold leading-tight">設定</h1>
      <button type="button" className="mb-4 rounded-lg border px-4 py-2" onClick={() => window.dispatchEvent(new Event('vocab-check-update'))}>檢查網頁更新</button>

      <div className="rounded-lg border border-(--ui-border) bg-white p-4">
        <label className="block text-sm font-bold text-(--ui-text)">自動安排的新字上限</label>
        <p className="mt-1 text-sm text-(--ui-muted)">學測一般安排 8–10 個新字，複習較多時減量，並遵守這裡較低的上限。單元與群組自由練習可另行安排。</p>
        <div className="mt-2 flex gap-2">
          {[5, 10, 15, 20, 30].map((n) => (
            <button
              key={n}
              onClick={() => setSetting("dailyNewWordCap", n)}
              className={`flex-1 min-h-11 rounded-lg py-2 text-sm font-bold ${
                cap === n ? "bg-(--ui-accent) text-white" : "border border-(--ui-border-strong) bg-white text-(--ui-text)"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-(--ui-border) bg-white p-4">
        <label className="block text-sm font-bold text-(--ui-text)">自動播放英文發音</label>
        <p className="mt-1 text-sm text-(--ui-muted)">進入學習或複習字卡時自動唸一次；測驗在揭示答案後才唸。可隨時點喇叭重播。</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            { label: "開啟", value: true },
            { label: "關閉", value: false },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => setSetting("autoPronounce", option.value)}
              className={`min-h-11 rounded-lg py-2 text-sm font-bold ${
                autoPronounce === option.value
                  ? "bg-(--ui-accent) text-white"
                  : "border border-(--ui-border-strong) bg-white text-(--ui-text)"
              }`}
              aria-pressed={autoPronounce === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-(--ui-border) bg-white p-4">
        <label className="block text-sm font-bold text-(--ui-text)">字級</label>
        <p className="mt-1 text-sm text-(--ui-muted)">放大全站文字，圖片與版面尺寸不會跟著放大。</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {FONT_SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={async () => {
                applyFontScale(option.value);
                await setSetting("fontScale", option.value);
              }}
              className={`min-h-11 rounded-lg py-2 text-sm font-bold ${
                fontScale === option.value
                  ? "bg-(--ui-accent) text-white"
                  : "border border-(--ui-border-strong) bg-white text-(--ui-text)"
              }`}
              aria-pressed={fontScale === option.value}
            >
              {option.label} <span className="block text-xs font-normal opacity-90">{option.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-(--ui-border) bg-white p-4">
        <label htmlFor="exam-date" className="block text-sm font-bold text-(--ui-text)">學測日期</label>
        <p className="mt-1 text-sm text-(--ui-muted)">用於倒數與第一輪學習時間估算；熟字的複習間隔不因考試接近而強制縮短。</p>
        <input
          id="exam-date"
          type="date"
          value={examDate ?? ""}
          onChange={(event) => setSetting("examDate", event.target.value)}
          className="mt-2 w-full rounded-lg border border-(--ui-border-strong) bg-white px-3 py-2 text-sm font-bold text-(--ui-text)"
        />
      </div>

      <div className="mt-4 rounded-lg border border-(--ui-border) bg-white p-4">
        <label className="block text-sm font-bold text-(--ui-text)">學習範圍（字彙等級）</label>
        <p className="mt-1 text-sm text-(--ui-muted)">
          新字只會從勾選的等級引入；練習（還沒學過任何字時）也以此範圍出題。已在學的字不受影響。
        </p>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {ALL_LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => toggleLevel(lv)}
              className={`min-h-11 rounded-lg py-2 text-sm font-bold ${
                levels?.includes(lv)
                  ? "bg-(--ui-accent) text-white"
                  : "border border-(--ui-border-strong) bg-white text-(--ui-muted)"
              }`}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-(--ui-border) bg-white p-4">
        <h2 className="text-sm font-bold text-(--ui-text)">資料版本</h2>
        {meta ? (
          <p className="mt-1 text-sm text-(--ui-muted)">
            共 {meta.counts.words} 個單字、{meta.counts.examples} 個例句
            <br />
            資料產生時間：{meta.generatedAt}
          </p>
        ) : (
          <p className="mt-1 text-sm text-(--ui-muted)">載入中…</p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-(--ui-border) bg-white p-4">
        <h2 className="text-sm font-bold text-(--ui-text)">進度備份</h2>
        <p className="mt-1 text-sm text-(--ui-muted)">
          學習進度存在這台裝置上；換手機或清除瀏覽器資料前，請先匯出備份。
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={async () => {
              const backup = await exportProgress();
              downloadProgressBackup(backup);
              setBackupMsg({
                ok: true,
                text: `已匯出 ${backup.data.cardStates.length} 個單字進度、${backup.data.checkIns.length} 天打卡、${backup.data.customGroups?.length ?? 0} 個群組與 ${backup.data.directAttempts?.length ?? 0} 筆直接作答、${backup.data.writtenSubmissions?.length ?? 0} 筆混合／非選作答`,
              });
            }}
            className="flex-1 min-h-11 rounded-lg bg-(--ui-accent) py-2.5 text-sm font-bold text-white"
          >
            匯出備份
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-11 rounded-lg border border-(--ui-accent) bg-white py-2.5 text-sm font-bold text-(--ui-accent)"
          >
            匯入備份…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBackupMsg(null);
              setPendingImport(null);
              let parsed: unknown;
              try {
                parsed = JSON.parse(await file.text());
              } catch {
                setBackupMsg({ ok: false, text: "無法讀取檔案：不是有效的 JSON" });
                return;
              }
              const err = validateBackup(parsed);
              if (err) {
                setBackupMsg({ ok: false, text: err });
                return;
              }
              setPendingImport(parsed as ProgressBackup);
            }}
          />
        </div>
        {pendingImport && (
          <div className="mt-3 rounded-lg border border-(--ui-warning) bg-(--ui-warning-soft) p-3">
            <p className="text-sm text-(--ui-warning)">
              備份檔（{pendingImport.exportedAt.slice(0, 10)}）含{" "}
              {pendingImport.data.cardStates.length} 個單字進度、
              {pendingImport.data.checkIns.length} 天打卡。
              <br />
              {pendingImport.schemaVersion >= 3
                ? `另含 ${pendingImport.data.customGroups?.length ?? 0} 個群組、${pendingImport.data.directAttempts?.length ?? 0} 筆直接作答、${pendingImport.data.writtenSubmissions?.length ?? 0} 筆混合／非選作答。匯入會覆蓋這台裝置目前的所有進度，確定嗎？`
                : pendingImport.schemaVersion === 2
                ? `這是第二版備份，含 ${pendingImport.data.customGroups?.length ?? 0} 個群組、${pendingImport.data.directAttempts?.length ?? 0} 筆直接作答。匯入會覆蓋單字進度、群組及直接作答；保留目前混合／非選原答、自評與草稿。確定嗎？`
                : '這是第一版備份；匯入會覆蓋原有單字學習進度，保留目前的自建群組、直接作答及混合／非選紀錄。確定嗎？'}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await importProgress(pendingImport);
                    setPendingImport(null);
                    setBackupMsg({ ok: true, text: "匯入完成，進度已還原。" });
                  } catch {
                    setBackupMsg({ ok: false, text: "匯入失敗，原有進度已保留。請檢查備份或可用儲存空間。" });
                  }
                }}
                className="rounded-lg bg-(--ui-warning) min-h-11 px-4 py-2 text-sm font-bold text-white"
              >
                確定匯入
              </button>
              <button
                onClick={() => setPendingImport(null)}
                className="rounded-lg border border-(--ui-border-strong) bg-white min-h-11 px-4 py-2 text-sm text-(--ui-text)"
              >
                取消
              </button>
            </div>
          </div>
        )}
        {backupMsg && (
          <p className={`mt-3 text-sm font-bold ${backupMsg.ok ? "text-(--ui-success)" : "text-(--ui-danger)"}`}>
            {backupMsg.text}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-(--ui-danger) bg-(--ui-danger-soft) p-4">
        <h2 className="text-sm font-bold text-(--ui-danger)">危險區</h2>
        <p className="mt-1 text-sm text-(--ui-danger)">
          重置會清除單字複習進度、打卡與一般測驗紀錄。自建群組、直接作答及混合／非選紀錄仍保留；單字資料不受影響。
        </p>
        {resetDone ? (
          <p className="mt-3 text-sm font-bold text-(--ui-text)">已重置完成。</p>
        ) : !resetArmed ? (
          <button
            onClick={() => setResetArmed(true)}
            className="mt-3 rounded-lg border border-(--ui-danger) bg-white min-h-11 px-4 py-2 text-sm font-bold text-(--ui-danger)"
          >
            重置單字複習進度…
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={resetProgress}
              className="rounded-lg bg-(--ui-danger) min-h-11 px-4 py-2 text-sm font-bold text-white"
            >
              確定重置（無法復原）
            </button>
            <button
              onClick={() => setResetArmed(false)}
              className="rounded-lg border border-(--ui-border-strong) bg-white min-h-11 px-4 py-2 text-sm text-(--ui-text)"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
