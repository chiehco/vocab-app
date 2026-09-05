import { useEffect, useMemo, useState } from "react";
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
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import { prefetchTodayImages, type ImagePackProgress } from "../wordbeast/prefetchTodayImages";
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
  const todayNewWords = useLiveQuery(async () => {
    const [cap, checkIn, knownKeys, words, priorities] = await Promise.all([
      getSetting<number>("dailyNewWordCap"), progressDb.checkIns.get(today),
      getKnownWords(), contentDb.words.toArray(),
      contentDb.examPriorities.toArray(),
    ]);
    return selectDailyWords({ words, priorities, examples: [], relations: [],
      known: new Set(knownKeys as string[]), remaining: Math.max(0, cap - (checkIn?.newWordsCount ?? 0)),
    });
  }, [today]);

  const imageUrls = useMemo(
    () => (todayNewWords ?? []).map((word) => getWordBeastAsset(word.wordId, word.word, word.imageWordId)),
    [todayNewWords],
  );
  const imageKey = imageUrls.join("|");
  const [imageRetry, setImageRetry] = useState(0);
  const [imagePack, setImagePack] = useState<ImagePackProgress | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [offlineShellReady, setOfflineShellReady] = useState(false);

  useEffect(() => {
    if (!imageKey) {
      setImagePack(null);
      return;
    }
    const urls = imageKey.split("|");
    let cancelled = false;
    setImagePack({ processed: 0, cached: 0, failed: 0, total: urls.length, ready: false });
    void prefetchTodayImages(urls, (value) => {
      if (!cancelled) setImagePack(value);
    });
    return () => { cancelled = true; };
  }, [imageKey, imageRetry]);

  useEffect(() => {
    const wentOnline = () => {
      setOnline(true);
      setImageRetry((value) => value + 1);
    };
    const wentOffline = () => setOnline(false);
    window.addEventListener("online", wentOnline);
    window.addEventListener("offline", wentOffline);
    return () => {
      window.removeEventListener("online", wentOnline);
      window.removeEventListener("offline", wentOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready
        .then((registration) => {
          if (!cancelled && !!registration.active) setOfflineShellReady(true);
        })
        .catch(() => undefined);
    }
    return () => { cancelled = true; };
  }, []);

  const due = dueCount ?? 0;
  const available = todayNewWords?.length ?? 0;
  const practiced = todayCheckIn?.reviewCount ?? 0;
  const encounterCount = due + available;
  const streak = streakInfo?.streak ?? 0;
  const dayComplete = Boolean(todayCheckIn);
  const todayOfflineReady = Boolean(imagePack?.ready && offlineShellReady);
  const preparingNewWordImages = due === 0 && available > 0 && (
    !imagePack || imagePack.processed < imagePack.total || (!online && !imagePack.ready)
  );

  return (
    <div className="beast-home">
      <header className="beast-home-header">
        <div>
          <p>WORD BEAST ARCHIVE</p>
          <h1>萬詞譜</h1>
        </div>
        <div className="beast-home-tools">
          {available > 0 && imagePack && (
            <button
              type="button"
              className={`offline-pack-status ${imagePack.ready ? "is-ready" : imagePack.processed === imagePack.total ? "has-error" : "is-loading"}`}
              onClick={() => imagePack.processed === imagePack.total && !imagePack.ready && setImageRetry((value) => value + 1)}
              disabled={imagePack.ready || imagePack.processed < imagePack.total}
              aria-live="polite"
            >
              <i />
              {todayOfflineReady
                ? "今日新字離線可用"
                : imagePack.ready
                  ? "今日圖片已下載"
                : imagePack.processed === imagePack.total
                  ? `尚有 ${imagePack.failed} 張待下載`
                  : `今日圖片 ${imagePack.cached}/${imagePack.total}`}
            </button>
          )}
          <Link to="/settings" className="beast-home-settings" aria-label="設定">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>
          </Link>
        </div>
      </header>

      <main>
        <section className="encounter-portal" aria-labelledby="encounter-title">
          <div className="encounter-portal-copy">
            <div className="encounter-kicker">
              <span className={dayComplete ? "is-complete" : ""}>{dayComplete ? "今日已練習" : "今日還沒練習"}</span>
              <i>{encounterCount || "·"}</i>
            </div>
            <h2 id="encounter-title">今日<br /><em>遭遇</em></h2>
            <p>{due > 0 ? `${due} 個 S+A 單字等你複習。` : available > 0 ? `${available} 個 S+A 新單字等你學習。` : "目前沒有待複習的 S+A 單字，也可以自由練習。"}</p>
            {preparingNewWordImages ? (
              <span className="encounter-primary-action is-disabled" aria-disabled="true">
                <span>{online ? "正在準備今日圖片" : "需連線下載今日圖片"}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
              </span>
            ) : (
              <Link to={due > 0 ? "/review" : available > 0 ? "/wordbeast" : "/quiz"} className="encounter-primary-action">
                <span>{due > 0 ? "開始複習" : available > 0 ? "開始學新單字" : "自由練習"}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
              </Link>
            )}
          </div>

          <div className="encounter-beast" aria-hidden="true">
            <span className="encounter-halo" />
            <img src={`${BASE}wordbeast/pest-beast.png`} alt="" />
            <span className="encounter-rune rune-one">P</span>
            <span className="encounter-rune rune-two">?</span>
            <span className="encounter-shadow" />
          </div>
        </section>

        <Link to="/exam" className="exam-focus-entry">
          <span className="exam-focus-mark">斬</span>
          <div><p>GSAT HIGH-FREQUENCY ZONE</p><h2>千單斬</h2><span>學測高頻單字專區・S+A 進度與今日任務</span></div>
          <b>進入 →</b>
        </Link>

        <Link to="/placement" className="entrance-test-entry">
          <span className="entrance-test-mark">初</span>
          <div><p>ENTRANCE CALIBRATION</p><h2>程度測驗</h2><span>24 題判定起始位階與新字範圍</span></div>
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
              <b>{todayCheckIn ? "今天已完成學習" : "今天還沒開始"}</b>
              <p>{todayCheckIn ? `已完成 ${practiced} 次辨名，連續修行 ${streak} 日。` : "完成任一題複習或練習後自動打卡。"}</p>
            </div>
            <time dateTime={today}>{today.slice(5).replace("-", "/")}</time>
          </div>
          <div className="rite-metrics">
            <div><strong>{dueCount ?? "—"}</strong><span>快忘記了</span></div>
            <div><strong>{todayNewWords?.length ?? "—"}</strong><span>尚未學過的單字</span></div>
            <div><strong>{practiced}</strong><span>今天答對數</span></div>
            <div className="rite-streak"><strong>{streak}</strong><span>連續學習天數</span><small>日</small></div>
          </div>
          <div className="rite-actions">
            <Link to="/review">複習到期單字（{due} 個） <span>→</span></Link>
            <Link to="/wordbeast">今天的新單字（{available} 個） <span>→</span></Link>
          </div>
        </section>

        <section className="practice-trace" aria-labelledby="practice-title">
          <div className="section-heading">
            <div><p>SEAL RECORD</p><h2 id="practice-title">學習紀錄</h2></div>
            <Link to="/progress">完整紀錄</Link>
          </div>
          <CheckInHeatmap weeks={16} />
        </section>
      </main>

      <p className="beast-home-motto">辨其形，喚其名，收其魂。</p>
    </div>
  );
}
