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
      <Link to="/" className="text-sm text-blue-600">
        ← 回首頁
      </Link>
      <h1 className="mt-2 mb-4 text-xl font-bold">設定</h1>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-bold text-slate-600">每日新字上限</label>
        <p className="mt-0.5 text-xs text-slate-400">每天最多學幾個沒看過的新單字</p>
        <div className="mt-2 flex gap-2">
          {[5, 10, 15, 20, 30].map((n) => (
            <button
              key={n}
              onClick={() => setSetting("dailyNewWordCap", n)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                cap === n ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-600"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-bold text-slate-600">自動播放英文發音</label>
        <p className="mt-0.5 text-xs text-slate-400">答案揭曉時自動唸一次；作答前不會先唸出隱藏答案。</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            { label: "開啟", value: true },
            { label: "關閉", value: false },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => setSetting("autoPronounce", option.value)}
              className={`rounded-lg py-2 text-sm font-bold ${
                autoPronounce === option.value
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white text-slate-600"
              }`}
              aria-pressed={autoPronounce === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-bold text-slate-600">字級</label>
        <p className="mt-0.5 text-xs text-slate-400">放大全站文字，圖片與版面尺寸不會跟著放大。</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {FONT_SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={async () => {
                applyFontScale(option.value);
                await setSetting("fontScale", option.value);
              }}
              className={`rounded-lg py-2 text-sm font-bold ${
                fontScale === option.value
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white text-slate-600"
              }`}
              aria-pressed={fontScale === option.value}
            >
              {option.label} <span className="block text-xs font-normal opacity-75">{option.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <label htmlFor="exam-date" className="block text-sm font-bold text-slate-600">學測日期</label>
        <p className="mt-0.5 text-xs text-slate-400">複習間隔會依剩餘時間縮短，避免單字排到考試之後。</p>
        <input
          id="exam-date"
          type="date"
          value={examDate ?? ""}
          onChange={(event) => setSetting("examDate", event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700"
        />
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-bold text-slate-600">學習範圍（字彙等級）</label>
        <p className="mt-0.5 text-xs text-slate-400">
          新字只會從勾選的等級引入；練習（還沒學過任何字時）也以此範圍出題。已在學的字不受影響。
        </p>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {ALL_LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => toggleLevel(lv)}
              className={`rounded-lg py-2 text-sm font-bold ${
                levels?.includes(lv)
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white text-slate-400"
              }`}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-600">資料版本</h2>
        {meta ? (
          <p className="mt-1 text-sm text-slate-500">
            共 {meta.counts.words} 個單字、{meta.counts.examples} 個例句
            <br />
            資料產生時間：{meta.generatedAt}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">載入中…</p>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-600">進度備份</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          學習進度存在這台裝置上；換手機或清除瀏覽器資料前，請先匯出備份。
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={async () => {
              const backup = await exportProgress();
              downloadProgressBackup(backup);
              setBackupMsg({
                ok: true,
                text: `已匯出 ${backup.data.cardStates.length} 個單字的學習進度、${backup.data.checkIns.length} 天打卡紀錄`,
              });
            }}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white"
          >
            匯出備份
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-lg border border-blue-600 bg-white py-2.5 text-sm font-bold text-blue-600"
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
          <div className="mt-3 rounded-lg border border-orange-300 bg-orange-50 p-3">
            <p className="text-sm text-orange-800">
              備份檔（{pendingImport.exportedAt.slice(0, 10)}）含{" "}
              {pendingImport.data.cardStates.length} 個單字進度、
              {pendingImport.data.checkIns.length} 天打卡。
              <br />
              匯入會<b>覆蓋</b>這台裝置目前的所有進度，確定嗎？
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={async () => {
                  await importProgress(pendingImport);
                  setPendingImport(null);
                  setBackupMsg({ ok: true, text: "匯入完成，進度已還原。" });
                }}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white"
              >
                確定匯入
              </button>
              <button
                onClick={() => setPendingImport(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600"
              >
                取消
              </button>
            </div>
          </div>
        )}
        {backupMsg && (
          <p className={`mt-3 text-sm font-bold ${backupMsg.ok ? "text-green-600" : "text-red-500"}`}>
            {backupMsg.text}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-bold text-red-600">危險區</h2>
        <p className="mt-1 text-xs text-red-500">
          重置會清除所有學習進度、打卡與練習紀錄，且無法復原（單字資料不受影響）。
        </p>
        {resetDone ? (
          <p className="mt-3 text-sm font-bold text-slate-600">已重置完成。</p>
        ) : !resetArmed ? (
          <button
            onClick={() => setResetArmed(true)}
            className="mt-3 rounded-lg border border-red-400 bg-white px-4 py-2 text-sm font-bold text-red-500"
          >
            重置所有學習進度…
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={resetProgress}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
            >
              確定重置（無法復原）
            </button>
            <button
              onClick={() => setResetArmed(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
