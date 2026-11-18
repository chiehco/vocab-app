import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToday } from '../../hooks/useToday';
import { getStudyResume } from './studyResume';
import { getDueReviewQueue } from '../../srs/dueReview';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { examTaskSteps, getExamDetails, getExamOverview } from '../exam/examOverview';
import ResilientBeastImage from '../wordbeast/ResilientBeastImage';
import './learning-home.css';
import SitePageViews from '../../components/SitePageViews';

export default function HomeScreen() {
  const today = useToday();
  const [countdownOpen, setCountdownOpen] = useState(false);
  const data = useLiveQuery(async () => {
    try {
      const [exam, resume] = await Promise.all([getExamDetails(today), getStudyResume()]);
      const [overview, due] = await Promise.all([
        exam.isGsat && exam.countdown ? getExamOverview(today) : null,
        exam.isGsat && exam.countdown ? [] : getDueReviewQueue(today),
      ]);
      const faces = due.flatMap(({ wordRecord: word }) => {
        const src = getWordBeastAsset(word.wordId, word.word, word.imageWordId);
        return src ? [{ word: word.word, src }] : [];
      }).slice(0, 4);
      return { resume, exam, overview, dueCount: due.length, faces, error: false };
    } catch {
      return { resume: undefined, exam: null, overview: null, dueCount: 0, faces: [], error: true };
    }
  }, [today]);
  const resume = data?.resume;
  const overview = data?.overview;
  const exam = data?.exam;
  const countdown = exam?.countdown;
  const next = overview && examTaskSteps.find(step => overview.task[step.key] > 0);
  return <div className="learning-page learning-home">
    <header className="learning-header"><Link to="/" className="learning-brand">萬詞譜</Link><Link to="/settings">設定</Link></header>
    {!data ? <p role="status">正在讀取學習進度…</p> : <>
      {data.error && <p role="alert">暫時無法讀取進度，請重新整理後再試。仍可選擇課本單元。</p>}
      {!overview && <h1>{resume ? '今天，接著學吧。' : '從一個單元開始。'}</h1>}
      <section className="learning-start" aria-labelledby="home-start-title">
        <div className="learning-start-heading">
          {overview ? <h1 id="home-start-title">今日學測任務</h1>
            : <p className="learning-muted" id="home-start-title">{resume ? '上次學到' : '第一步'}</p>}
          {countdown && <button type="button" className="learning-countdown-toggle"
            aria-expanded={countdownOpen} aria-controls="home-countdown"
            onClick={() => setCountdownOpen(open => !open)}>
            距離{exam.name} {countdown.daysLeft} 天 <span aria-hidden="true">{countdownOpen ? '▴' : '▾'}</span>
          </button>}
        </div>
        {overview ? <>
          <ol className="learning-task-steps">
            {examTaskSteps.map(step => {
              const remaining = overview.task[step.key];
              const active = next?.key === step.key;
              return <li key={step.key} aria-current={active ? 'step' : undefined}>
                <span className="learning-task-status" aria-hidden="true">{remaining === 0 ? '✓' : '●'}</span>
                <strong>{step.label}</strong>
                <span className="learning-task-count">{remaining} 個</span>
                <small>{remaining === 0 ? '已完成' : active ? '進行中' : '還沒到'}</small>
              </li>;
            })}
          </ol>
          {next ? <>
            <Link className="learning-primary" to={next.to}>{next.start}<span aria-hidden="true">→</span></Link>
            <p className="learning-muted learning-task-time">剩餘約 {overview.dailyPlan.estimatedRemainingMinutes} 分鐘</p>
          </> : <p className="learning-task-complete" role="status">今日學測任務已完成</p>}
        </> : <>
          <h2>{resume?.title ?? '選擇正在讀的課本'}</h2>
          {resume ? <><progress aria-label="上次學習位置" value={resume.position} max={resume.total}/>
            <p className="learning-muted">接著第 {resume.position}／{resume.total} {resume.href.startsWith('/practice') ? '題' : '張'}</p></>
            : <p className="learning-muted">選好單元，就能看字卡或做題目。</p>}
          <Link className="learning-primary" to={resume?.href ?? '/textbook'}>{resume ? '繼續學習' : '選課本單元'}<span aria-hidden="true">→</span></Link>
        </>}
        {countdown && <div id="home-countdown" className="learning-countdown-panel" hidden={!countdownOpen}>
          <dl>
            <div><dt>{exam.name}</dt><dd>{countdown.date}</dd></div>
            <div><dt>剩餘天數</dt><dd>{countdown.daysLeft} 天</dd></div>
            {overview && <div><dt>高頻字進度</dt><dd>{overview.learned}／{overview.total} 個</dd></div>}
          </dl>
          {overview?.dailyPlan.paceTooSlow && <p className="learning-muted">
            {overview.coverage.firstPassDays === null ? '依目前上限可能無法在預留的最後 28 天前接觸完新字。'
              : `照每天 ${overview.coverage.daily} 字，第一輪約需 ${overview.coverage.firstPassDays} 天。`}
          </p>}
        </div>}
      </section>
      {overview ? <nav aria-labelledby="home-other-title">
        <h2 id="home-other-title">其他</h2>
        <Link className="learning-row" to={resume?.href ?? '/textbook'}><span><strong>課本進度</strong><small>{resume?.title ?? '選課本單元'}</small></span><span aria-hidden="true">→</span></Link>
        <Link className="learning-row" to="/town/LV1/1"><span><strong>單字小鎮</strong><small>LV1 Unit 1 · 查看練習留下的小屋</small></span><span aria-hidden="true">→</span></Link>
        <Link className="learning-row" to="/games"><strong>單字遊戲</strong><span aria-hidden="true">→</span></Link>
      </nav> : <>
        <Link className="learning-row town-home-entry" to="/town/LV1/1"><span><strong>LV1 單字小鎮</strong><small>Unit 1 · 查看練習留下的小屋</small></span><span aria-hidden="true">→</span></Link>
        {!resume && !data.error && <p className="learning-muted learning-hint">開始學習後，這裡會幫你記住位置。</p>}
        {data.dueCount > 0 && <Link className="learning-due" to="/review?due=1">
          {data.faces.length > 0 && <span className="learning-due-faces" aria-hidden="true">{data.faces.map(face => <ResilientBeastImage key={face.word} src={face.src} word={face.word} alt="" />)}</span>}
          <span><strong>今日複習</strong><small>{data.dueCount} 個單字等你回來看看</small></span><span aria-hidden="true">→</span>
        </Link>}
        <nav className="learning-tiles" aria-label="其他入口">
          {resume ? <Link to="/textbook"><strong>換個單元</strong><small>依等級與 Unit 選</small></Link>
            : <Link to="/exam"><strong>想先練學測？</strong><small>直接進大考練習</small></Link>}
          <Link to="/games"><strong>玩單字遊戲</strong><small>用學過的字對戰</small></Link>
        </nav>
      </>}
    </>}
    <footer className="learning-footer"><Link to="/progress">學習紀錄</Link><Link to="/groups">我的群組</Link></footer>
    <SitePageViews />
  </div>;
}
