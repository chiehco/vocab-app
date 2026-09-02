import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getKnownWords, getLogicalCardStates } from "../../db/progressIdentity";
import { contentDb } from "../../db/contentDb";
import { getSetting, progressDb } from "../../db/progressDb";
import { useToday } from "../../hooks/useToday";
import { useStreak } from "../../hooks/useStreak";
import CheckInHeatmap from "../progress/CheckInHeatmap";
import { buildTopExamWordSet } from "../../quiz/examScope";
import { selectDailyWords } from "../wordbeast/dailyCapture";
import "./dashboard.css";

const BASE = import.meta.env.BASE_URL;

export default function DashboardScreen() {
  const streakInfo = useStreak();
  const today = useToday();

  const dueCount = useLiveQuery(
    async () => {
      const allowed = buildTopExamWordSet(await contentDb.examPriorities.toArray());
      return (await getLogicalCardStates()).filter((card) => allowed.has(card.word) && (card.dueDate <= today || !!card.practicePending)).length;
    },
    [today],
  );
  const todayCheckIn = useLiveQuery(() => progressDb.checkIns.get(today), [today]);
  const newRemaining = useLiveQuery(async () => {
    const [cap, checkIn, knownKeys, words, priorities] = await Promise.all([
      getSetting<number>("dailyNewWordCap"), progressDb.checkIns.get(today),
      getKnownWords(), contentDb.words.toArray(),
      contentDb.examPriorities.toArray(),
    ]);
    return selectDailyWords({ words, priorities, examples: [], relations: [],
      known: new Set(knownKeys as string[]), remaining: Math.max(0, cap - (checkIn?.newWordsCount ?? 0)),
    }).length;
  }, [today]);

  const due = dueCount ?? 0;
  const available = newRemaining ?? 0;
  const practiced = todayCheckIn?.reviewCount ?? 0;
  const encounterCount = due + available;
  const streak = streakInfo?.streak ?? 0;
  const dayComplete = Boolean(todayCheckIn);

  return (
    <div className="beast-home">
      <header className="beast-home-header">
        <div>
          <p>WORD BEAST ARCHIVE</p>
          <h1>萬字譜</h1>
        </div>
        <Link to="/settings" className="beast-home-settings" aria-label="設定">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>
        </Link>
      </header>

      <main>
        <section className="encounter-portal" aria-labelledby="encounter-title">
          <div className="encounter-portal-copy">
            <div className="encounter-kicker">
              <span className={dayComplete ? "is-complete" : ""}>{dayComplete ? "今日已練習" : "今日還沒練習"}</span>
              <i>{encounterCount || "·"}</i>
            </div>
            <h2 id="encounter-title">今日<br /><em>遭遇</em></h2>
            <p>{due > 0 ? `${due} 個 S＋A 單字等你回想。` : available > 0 ? `${available} 隻 S＋A 字獸正在林地出沒。` : "目前沒有待回想的 S＋A 單字，也可以自由練習。"}</p>
            <Link to={due > 0 ? "/review" : available > 0 ? "/wordbeast" : "/quiz"} className="encounter-primary-action">
              <span>{due > 0 ? "開始回想複習" : available > 0 ? "開始辨名收服" : "自由練習"}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
            </Link>
          </div>

          <div className="encounter-beast" aria-hidden="true">
            <span className="encounter-halo" />
            <img src={`${BASE}wordbeast/pest-beast.png`} alt="" />
            <span className="encounter-rune rune-one">P</span>
            <span className="encounter-rune rune-two">?</span>
            <span className="encounter-shadow" />
          </div>
        </section>

        <Link to="/placement" className="entrance-test-entry">
          <span className="entrance-test-mark">初</span>
          <div><p>ENTRANCE CALIBRATION</p><h2>入門測試</h2><span>24 題判定起始位階與新字範圍</span></div>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
        </Link>

        <Link to="/arena" className="arena-home-entry">
          <span className="arena-home-mark">VS</span>
          <div><p>OFFLINE ARENA</p><h2>字獸競技場</h2><span>字母轟炸已開陣・玩家對電腦</span></div>
          <b>開戰 →</b>
        </Link>

        <section className="daily-rite" aria-labelledby="daily-rite-title">
          <div className="section-heading">
            <div><p>TODAY'S RITE</p><h2 id="daily-rite-title">今日修行</h2></div>
            <span>{practiced > 0 ? `已完成 ${practiced} 次` : "尚未開始"}</span>
          </div>
          <div className={`daily-checkin ${todayCheckIn ? "is-complete" : ""}`} role="status">
            <span className="daily-checkin-mark">{todayCheckIn ? "✓" : "待"}</span>
            <div>
              <b>{todayCheckIn ? "今日已打卡" : "今日尚未打卡"}</b>
              <p>{todayCheckIn ? `已完成 ${practiced} 次辨名，連續修行 ${streak} 日。` : "完成任一題複習或練習後自動打卡。"}</p>
            </div>
            <time dateTime={today}>{today.slice(5).replace("-", "/")}</time>
          </div>
          <div className="rite-metrics">
            <div><strong>{dueCount ?? "—"}</strong><span>封印鬆動</span></div>
            <div><strong>{newRemaining ?? "—"}</strong><span>未知字獸</span></div>
            <div><strong>{practiced}</strong><span>今日辨名</span></div>
            <div className="rite-streak"><strong>{streak}</strong><span>連續修行</span><small>日</small></div>
          </div>
          <div className="rite-actions">
            <Link to="/review">只複習舊封印 <span>→</span></Link>
            <Link to="/quiz">開始今日馴化 <span>→</span></Link>
          </div>
        </section>

        <section className="practice-trace" aria-labelledby="practice-title">
          <div className="section-heading">
            <div><p>SEAL RECORD</p><h2 id="practice-title">修行足跡</h2></div>
            <Link to="/progress">完整紀錄</Link>
          </div>
          <CheckInHeatmap weeks={16} />
        </section>
      </main>

      <p className="beast-home-motto">辨其形，喚其名，收其魂。</p>
    </div>
  );
}
