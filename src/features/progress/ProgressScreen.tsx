import { useLiveQuery } from "dexie-react-hooks";
import { progressDb } from "../../db/progressDb";
import { useStreak } from "../../hooks/useStreak";
import CheckInHeatmap from "./CheckInHeatmap";
import "../realm-pages.css";

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

  const started = totals?.started ?? 0;
  const mastered = totals?.mastered ?? 0;
  const stableRate = started > 0 ? Math.round((mastered / started) * 100) : 0;

  return (
    <div className="realm-page progress-page">
      <header className="realm-header">
        <div><p>SEAL RECORD</p><h1>修行足跡</h1></div>
        <span className="progress-seal">錄</span>
      </header>

      <section className="streak-monument" aria-labelledby="streak-title">
        <div className="streak-orbit"><i /><i /><span>{streakInfo?.streak ?? "—"}</span></div>
        <div><p>CURRENT RITE</p><h2 id="streak-title">連續修行<br /><em>{streakInfo?.streak ?? "—"} 日</em></h2><span>最長紀錄 {streakInfo?.longest ?? "—"} 日</span></div>
      </section>

      <section className="progress-ledger" aria-labelledby="ledger-title">
        <div className="realm-section-head"><div><p>ARCHIVE STATUS</p><h2 id="ledger-title">封印總錄</h2></div><span>{stableRate}% 已進入穩定期</span></div>
        <div className="progress-line"><i style={{ width: `${stableRate}%` }} /></div>
        <dl>
          <div><dt>已相遇字獸</dt><dd>{totals?.started ?? "—"}<small>枚</small></dd></div>
          <div><dt>穩定封印</dt><dd>{totals?.mastered ?? "—"}<small>枚</small></dd></div>
          <div><dt>累計辨名</dt><dd>{totals?.reviews ?? "—"}<small>次</small></dd></div>
          <div><dt>留下足跡</dt><dd>{totals?.checkInDays ?? "—"}<small>日</small></dd></div>
        </dl>
      </section>

      <section className="year-trace" aria-labelledby="year-title">
        <div className="realm-section-head"><div><p>PAST 53 WEEKS</p><h2 id="year-title">年度修行圖</h2></div><span>點選日期查看紀錄</span></div>
        <div className="year-heatmap"><CheckInHeatmap weeks={53} /></div>
        <div className="trace-legend"><span>沉寂</span><i /><i /><i /><i /><span>深刻</span></div>
      </section>

      <p className="realm-motto">每一次記起，都讓封印更牢。</p>
    </div>
  );
}
