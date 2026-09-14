import { useLiveQuery } from "dexie-react-hooks";
import { getLogicalCardStates } from "../../db/progressIdentity";
import { progressDb } from "../../db/progressDb";
import { useStreak } from "../../hooks/useStreak";
import CheckInHeatmap from "./CheckInHeatmap";
import "../realm-pages.css";

export default function ProgressScreen() {
  const streakInfo = useStreak();
  const totals = useLiveQuery(async () => {
    const [reviews, cards, checkInDays] = await Promise.all([
      progressDb.reviewLogs.count(),
      getLogicalCardStates(),
      progressDb.checkIns.count(),
    ]);
    return { reviews, started: cards.length, mastered: cards.filter((card) => card.state === "review").length, checkInDays };
  }, []);

  const started = totals?.started ?? 0;
  const mastered = totals?.mastered ?? 0;
  const stableRate = started > 0 ? Math.round((mastered / started) * 100) : 0;

  return (
    <div className="realm-page progress-page">
      <header className="realm-header">
        <div><h1>學習紀錄</h1></div>
      </header>

      <section className="streak-monument" aria-labelledby="streak-title">
        <div className="streak-orbit"><span>{streakInfo?.streak ?? "—"}</span></div>
        <div><h2 id="streak-title">連續學習天數<em>{streakInfo?.streak ?? "—"} 日</em></h2><span>最長紀錄 {streakInfo?.longest ?? "—"} 日</span></div>
      </section>

      <section className="progress-ledger" aria-labelledby="ledger-title">
        <div className="realm-section-head"><h2 id="ledger-title">學習總覽</h2><span>{stableRate}% 最近複習通過率</span></div>
        <div className="progress-line"><i style={{ width: `${stableRate}%` }} /></div>
        <dl>
          <div><dt>已學過的單字</dt><dd>{totals?.started ?? "—"}<small>枚</small></dd></div>
          <div><dt>最近複習通過率</dt><dd>{totals?.mastered ?? "—"}<small>枚</small></dd></div>
          <div><dt>累計答對數</dt><dd>{totals?.reviews ?? "—"}<small>次</small></dd></div>
          <div><dt>記錄今天</dt><dd>{totals?.checkInDays ?? "—"}<small>日</small></dd></div>
        </dl>
      </section>

      <section className="year-trace" aria-labelledby="year-title">
        <div className="realm-section-head"><h2 id="year-title">年度學習圖</h2><span>點選日期查看紀錄</span></div>
        <div className="year-heatmap"><CheckInHeatmap weeks={53} /></div>
        <div className="trace-legend"><span>沉寂</span><i /><i /><i /><i /><span>深刻</span></div>
      </section>
    </div>
  );
}
