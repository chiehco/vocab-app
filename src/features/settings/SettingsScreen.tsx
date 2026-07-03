import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { DEFAULT_SETTINGS, progressDb, setSetting } from "../../db/progressDb";

export default function SettingsScreen() {
  const [resetArmed, setResetArmed] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const meta = useLiveQuery(() => contentDb.meta.get("current"), []);
  const cap = useLiveQuery(async () => {
    const row = await progressDb.settings.get("dailyNewWordCap");
    return (row?.value as number) ?? DEFAULT_SETTINGS.dailyNewWordCap;
  }, []);

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
    <div className="p-4">
      <Link to="/" className="text-sm text-blue-600">
        ← 回首頁
      </Link>
      <h1 className="mt-2 mb-4 text-xl font-bold">設定</h1>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-bold text-slate-600">每日新字上限</label>
        <p className="mt-0.5 text-xs text-slate-400">每天最多引入幾個沒學過的新單字</p>
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

      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-bold text-red-600">危險區</h2>
        <p className="mt-1 text-xs text-red-500">
          重置會清除所有學習進度、打卡與測驗紀錄，且無法復原（單字資料不受影響）。
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
