import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { getSetting, progressDb } from "../../db/progressDb";
import { todayStr } from "../../lib/dates";
import { useStreak } from "../../hooks/useStreak";
import CheckInHeatmap from "../progress/CheckInHeatmap";

export default function DashboardScreen() {
  const streakInfo = useStreak();
  const today = todayStr();

  const dueCount = useLiveQuery(
    () => progressDb.cardStates.where("dueDate").belowOrEqual(today).count(),
    [today],
  );
  const todayCheckIn = useLiveQuery(() => progressDb.checkIns.get(today), [today]);
  const newRemaining = useLiveQuery(async () => {
    const cap = await getSetting<number>("dailyNewWordCap");
    const checkIn = await progressDb.checkIns.get(today);
    const started = await progressDb.cardStates.count();
    const total = await contentDb.words.count();
    return Math.min(Math.max(0, cap - (checkIn?.newWordsCount ?? 0)), total - started);
  }, [today]);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">高中英文單字通</h1>
        <Link to="/settings" className="text-xl" aria-label="設定">
          ⚙️
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 p-5 text-white shadow">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🔥</span>
          <div>
            {streakInfo === undefined ? (
              <p className="text-blue-100">載入中…</p>
            ) : streakInfo.atRisk ? (
              <>
                <p className="text-2xl font-bold">連續 {streakInfo.streak} 天</p>
                <p className="text-sm text-blue-100">今天還沒打卡，練一下才能延續！</p>
              </>
            ) : streakInfo.streak > 0 ? (
              <>
                <p className="text-2xl font-bold">連續 {streakInfo.streak} 天 ✅</p>
                <p className="text-sm text-blue-100">今天已打卡，繼續保持！</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">開始打卡</p>
                <p className="text-sm text-blue-100">完成一次複習或測驗就算打卡</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-2xl font-bold text-orange-500">{dueCount ?? "–"}</p>
          <p className="text-xs text-slate-500">今日到期</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-2xl font-bold text-green-600">{newRemaining ?? "–"}</p>
          <p className="text-xs text-slate-500">可學新字</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{todayCheckIn?.reviewCount ?? 0}</p>
          <p className="text-xs text-slate-500">今日已練</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/review"
          className="rounded-xl bg-blue-600 py-3.5 text-center font-bold text-white shadow"
        >
          開始複習 📖
        </Link>
        <Link
          to="/quiz"
          className="rounded-xl border-2 border-blue-600 bg-white py-3.5 text-center font-bold text-blue-600"
        >
          開始測驗 ✏️
        </Link>
      </div>

      <div className="mt-5 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-600">最近打卡</h2>
        <CheckInHeatmap weeks={16} />
      </div>
    </div>
  );
}
