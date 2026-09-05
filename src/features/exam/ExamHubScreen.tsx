import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { contentDb } from "../../db/contentDb";
import { getLogicalCardStates } from "../../db/progressIdentity";
import { DEFAULT_SETTINGS, getSetting, progressDb } from "../../db/progressDb";
import { useToday } from "../../hooks/useToday";
import { selectDailyWords } from "../wordbeast/dailyCapture";
import { buildExamHubProgress } from "./examHub";
import "./exam-hub.css";

export default function ExamHubScreen() {
  const today = useToday();
  const overview = useLiveQuery(async () => {
    const [priorities, cards, words, dailyCap, checkIn, examDate] = await Promise.all([
      contentDb.examPriorities.toArray(),
      getLogicalCardStates(),
      contentDb.words.toArray(),
      getSetting<number>("dailyNewWordCap"),
      progressDb.checkIns.get(today),
      getSetting<string>("examDate"),
    ]);
    const progress = buildExamHubProgress(priorities, cards, today);
    const remaining = Math.max(0, dailyCap - (checkIn?.newWordsCount ?? 0));
    const newWords = selectDailyWords({
      words, priorities, examples: [], relations: [],
      known: new Set(cards.map((card) => card.word)), remaining,
    }).length;
    return { ...progress, newWords, examDate, practiced: checkIn?.reviewCount ?? 0 };
  }, [today]);

  const total = overview?.total ?? 0;
  const learned = overview?.learned ?? 0;
  const progressPct = total ? Math.round((learned / total) * 100) : 0;
  const examDate = overview?.examDate ?? DEFAULT_SETTINGS.examDate;
  const daysLeft = Math.max(0, differenceInCalendarDays(parseISO(examDate), parseISO(today)));
  const primaryRoute = (overview?.due ?? 0) > 0 ? "/review" : (overview?.newWords ?? 0) > 0 ? "/wordbeast" : "/quiz";
  const primaryLabel = (overview?.due ?? 0) > 0 ? `複習到期單字（${overview?.due} 個）` : (overview?.newWords ?? 0) > 0 ? `學今天的新單字（${overview?.newWords} 個）` : "開始高頻練習";

  return (
    <div className="thousand-slash-page">
      <header className="thousand-slash-hero">
        <nav><Link to="/">← 首頁</Link><span>GSAT HIGH-FREQUENCY ZONE</span></nav>
        <div className="thousand-slash-title">
          <p>學測高頻單字專區</p>
          <h1 aria-label="千單斬"><span>千</span><span>單</span><span>斬</span></h1>
          <i aria-hidden="true" />
        </div>
        <div className="thousand-slash-countdown">
          <span>距離學測</span><strong>{daysLeft}</strong><b>天</b>
          <small>{format(parseISO(examDate), "yyyy.MM.dd")}</small>
        </div>
        <p className="thousand-slash-promise">先守住 S+A 高頻字，再把分數往上推。</p>
      </header>

      <main className="thousand-slash-main">
        <section className="exam-progress" aria-labelledby="exam-progress-title">
          <div className="exam-section-head">
            <div><p>HIGH-FREQUENCY PROGRESS</p><h2 id="exam-progress-title">高頻字進度</h2></div>
            <strong>{progressPct}<small>%</small></strong>
          </div>
          <div className="exam-progress-track" aria-label={`已學 ${learned}／${total} 個高頻單字`}><i style={{ width: `${progressPct}%` }} /></div>
          <p className="exam-progress-caption">已學 <b>{learned}</b>／{total || "—"} 個 S+A 高頻單字</p>
          <div className="exam-tier-lines">
            <div><span>S</span><p><b>{overview?.s.learned ?? 0}</b>／{overview?.s.total ?? "—"}</p><i style={{ width: `${overview?.s.total ? (overview.s.learned / overview.s.total) * 100 : 0}%` }} /></div>
            <div><span>A</span><p><b>{overview?.a.learned ?? 0}</b>／{overview?.a.total ?? "—"}</p><i style={{ width: `${overview?.a.total ? (overview.a.learned / overview.a.total) * 100 : 0}%` }} /></div>
          </div>
        </section>

        <section className="exam-today" aria-labelledby="exam-today-title">
          <div className="exam-section-head">
            <div><p>TODAY'S PLAN</p><h2 id="exam-today-title">今天要做什麼</h2></div>
            <span>{overview ? `已完成 ${overview.practiced} 題` : "整理中"}</span>
          </div>
          <dl>
            <div><dt>到期複習</dt><dd>{overview?.due ?? "—"}<small>個</small></dd></div>
            <div><dt>今日新字</dt><dd>{overview?.newWords ?? "—"}<small>個</small></dd></div>
          </dl>
          <Link className="exam-primary-action" to={primaryRoute}>{primaryLabel}<span>→</span></Link>
        </section>

        <section className="exam-actions" aria-label="學測專區功能">
          <Link to="/review"><span>01</span><div><b>高頻複習</b><small>依記憶曲線複習今天到期的字</small></div><i>→</i></Link>
          <Link to="/quiz"><span>02</span><div><b>高頻題型練習</b><small>看字、看義、看圖與例句填空</small></div><i>→</i></Link>
          <Link to="/units"><span>03</span><div><b>Unit 連續學習</b><small>同等級每 30 字一單元，連續看完不回字表</small></div><i>→</i></Link>
          <Link to="/browse"><span>04</span><div><b>高頻單字總表</b><small>依考頻排名查找 S+A 單字</small></div><i>→</i></Link>
          <Link to="/settings"><span>05</span><div><b>學測日期與字級</b><small>調整倒數日期和手機閱讀大小</small></div><i>→</i></Link>
        </section>
      </main>

      <p className="thousand-slash-footer">一日一斬，字字有痕。</p>
    </div>
  );
}
