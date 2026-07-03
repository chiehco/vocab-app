import { useLiveQuery } from "dexie-react-hooks";
import { progressDb } from "../../db/progressDb";
import { useStreak } from "../../hooks/useStreak";
import CheckInHeatmap from "./CheckInHeatmap";

export default function ProgressScreen() {
  const streakInfo = useStreak();
  const totals = useLiveQuery(async () => {
    const [reviews, started, mastered, checkInDays] = await Promise.all([
      progressDb.reviewLogs.count(),
      progressDb.cardStates.count(),
      progressDb.cardStates.where("state").equals("review").count(),
      progressDb.checkIns.count(),
    ]);
    return { reviews, started, mastered, checkInDays };
  }, []);

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">學習進度</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-orange-500">🔥 {streakInfo?.streak ?? "–"}</p>
          <p className="text-xs text-slate-500">目前連續天數</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-500">🏆 {streakInfo?.longest ?? "–"}</p>
          <p className="text-xs text-slate-500">最長連續紀錄</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{totals?.started ?? "–"}</p>
          <p className="text-xs text-slate-500">已開始學習的單字</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-green-600">{totals?.mastered ?? "–"}</p>
          <p className="text-xs text-slate-500">進入複習階段</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-700">{totals?.reviews ?? "–"}</p>
          <p className="text-xs text-slate-500">累計練習次數</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-700">{totals?.checkInDays ?? "–"}</p>
          <p className="text-xs text-slate-500">累計打卡天數</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-600">過去一年打卡紀錄</h2>
        <CheckInHeatmap weeks={53} />
      </div>
    </div>
  );
}
