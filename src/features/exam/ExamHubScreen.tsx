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
import { estimateCoverage } from "./studyPlan";
import { getDailyLearningPlan } from "../../srs/dailyPlan";

export default function ExamHubScreen() {
  const today = useToday();
  const overview = useLiveQuery(async () => {
    const [priorities, cards, words, dailyCap, checkIn, examDate, dailyPlan] = await Promise.all([
      contentDb.examPriorities.toArray(),
      getLogicalCardStates(),
      contentDb.words.toArray(),
      getSetting<number>("dailyNewWordCap"),
      progressDb.checkIns.get(today),
      getSetting<string>("examDate"),
      getDailyLearningPlan(today),
    ]);
    const installed = new Set(words.map(w=>w.word));
    const progress = buildExamHubProgress(priorities.filter(p=>installed.has(p.word)), cards, today);
    const remaining = dailyPlan.remainingNew;
    const newWords = selectDailyWords({
      words, priorities, examples: [], relations: [],
      known: new Set(cards.map((card) => card.word)), remaining,
    }).length;
    return { ...progress, newWords, examDate, dailyCap, dailyPlan, practiced: checkIn?.reviewCount ?? 0 };
  }, [today]);

  const total = overview?.total ?? 0;
  const learned = overview?.learned ?? 0;
  const progressPct = total ? Math.round((learned / total) * 100) : 0;
  const examDate = overview?.examDate ?? DEFAULT_SETTINGS.examDate;
  const daysLeft = Math.max(0, differenceInCalendarDays(parseISO(examDate), parseISO(today)));
  const dailyCap = overview?.dailyPlan.dailyTarget ?? 8;
  const plan = estimateCoverage(total-learned, dailyCap, daysLeft);
  const primaryRoute = (overview?.due ?? 0) > 0 ? "/review" : (overview?.newWords ?? 0) > 0 ? "/wordbeast" : "/quiz";
  const primaryLabel = (overview?.due ?? 0) > 0 ? `複習到期單字（${overview?.due} 個）` : (overview?.newWords ?? 0) > 0 ? `學今天的新單字（${overview?.newWords} 個）` : "開始高頻練習";

  return (
    <div className="exam-hub-page">
      <header className="exam-hub-header">
        <nav><Link to="/exam">← 大考模式</Link></nav>
        <p className="exam-hub-kicker">學測單字複習</p>
        <h1>千單斬</h1>
        <p className="exam-hub-lead">原 S+A 字庫，依 110–115 年考頻排序。</p>
        <p className="exam-hub-countdown">距離學測 <strong>{daysLeft}</strong> 天<span>{format(parseISO(examDate), "yyyy.MM.dd")}</span></p>
      </header>

      <main className="exam-hub-main">
        <section className="exam-today" aria-labelledby="exam-today-title">
          <div className="exam-section-head">
            <h2 id="exam-today-title">今天要做什麼</h2>
            <span>{overview ? `已完成 ${overview.practiced} 題` : "整理中"}</span>
          </div>
          <dl>
            <div><dt>到期複習</dt><dd>{overview?.due ?? "—"}<small>個</small></dd></div>
            <div><dt>今日新字</dt><dd>{overview?.newWords ?? "—"}<small>個</small></dd></div>
          </dl>
          <Link className="exam-primary-action" to={primaryRoute}>{primaryLabel}<span aria-hidden="true">→</span></Link>
        </section>

        <section className="exam-progress" aria-labelledby="exam-progress-title">
          <div className="exam-section-head">
            <h2 id="exam-progress-title">高頻字進度</h2>
            <strong>{progressPct}<small>%</small></strong>
          </div>
          <div className="exam-progress-track" aria-label={`已學 ${learned}／${total} 個高頻單字`}><i style={{ width: `${progressPct}%` }} /></div>
          <p className="exam-progress-caption">已開始 <b>{learned}</b>／{total || "—"} 個可獨立練習單字</p>
          <div className="exam-tier-lines">
            <div><span>S</span><p><b>{overview?.s.learned ?? 0}</b>／{overview?.s.total ?? "—"}</p><i style={{ width: `${overview?.s.total ? (overview.s.learned / overview.s.total) * 100 : 0}%` }} /></div>
            <div><span>A</span><p><b>{overview?.a.learned ?? 0}</b>／{overview?.a.total ?? "—"}</p><i style={{ width: `${overview?.a.total ? (overview.a.learned / overview.a.total) * 100 : 0}%` }} /></div>
          </div>
        </section>

        <section className="exam-plan" aria-labelledby="exam-plan-title">
          <div className="exam-section-head"><h2 id="exam-plan-title">每天 15–20 分鐘</h2></div>
          <p>先做到期複習，再學新字。以 15 分鐘估算，另留約 5 分鐘給較難的字。</p>
          {!overview ? <p role="status">正在計算學習安排…</p> : <>
            <p>尚未開始 {plan.remaining} 字；一般每日目標 {plan.daily} 字，依複習量下調。</p>
            <p>今天還可加入 {overview.dailyPlan.remainingNew} 個新字；剩餘複習與新字約需 {overview.dailyPlan.estimatedRemainingMinutes} 分鐘。</p>
            {overview.dailyPlan.overBudget && <p className="exam-plan-note">今天的複習量較多，暫停加入新字。可分次完成，到期的字都會保留。</p>}
            {overview.dailyPlan.paceTooSlow && <p className="exam-plan-note">依目前上限可能無法在預留的最後 28 天前接觸完新字，請優先守住高頻字，或調整範圍。</p>}
            <details className="exam-plan-details">
              <summary>第一輪估算與計算方式</summary>
              <p>{plan.firstPassDays === null ? '目前暫停加入新字，尚無第一輪完成時間。' : plan.remaining === 0 ? '這個範圍的字都已開始學習，請繼續到期複習。' : `若每天達到一般目標，第一輪約需 ${plan.firstPassDays} 天。`}</p>
              {plan.spareDays !== null && <p>{plan.spareDays > 0 ? `第一輪後約剩 ${plan.spareDays} 天可反覆練習。` : plan.spareDays === 0 ? '第一輪將用完剩餘天數，未留後續鞏固時間。' : `第一輪預估超過剩餘天數 ${-plan.spareDays} 天，需調整每日量或優先範圍。`}</p>}
              <p>每個新字暫以 1 分鐘、每次回想約 20 秒估算，速度因人而異。第一輪天數未計入漏學或新字暫緩；目標是在最後 28 天前先接觸完。</p>
              <p>答得穩的字逐步拉長間隔，忘記的字隔天再複習；考試倒數不會強迫所有熟字每日重考。</p>
              <p>功能詞保留在字卡與考古題；目前不列入獨立字義練習。多義字待按義項拆分後再納入。</p>
            </details>
          </>}
          <Link className="exam-plan-link" to="/settings">調整每日新字量 →</Link>
        </section>

        <section className="exam-actions" aria-label="學測專區功能">
          <Link to="/review"><div><b>高頻複習</b><small>依記憶曲線複習今天到期的字</small></div><i aria-hidden="true">→</i></Link>
          <Link to="/quiz"><div><b>高頻題型練習</b><small>看字、看義、看圖與例句填空</small></div><i aria-hidden="true">→</i></Link>
          <Link to="/browse"><div><b>高頻單字總表</b><small>依考頻排名查找 S+A 單字</small></div><i aria-hidden="true">→</i></Link>
          <Link to="/settings"><div><b>學測日期與字級</b><small>調整倒數日期和手機閱讀大小</small></div><i aria-hidden="true">→</i></Link>
        </section>
      </main>
    </div>
  );
}
