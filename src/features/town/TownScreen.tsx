import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../db/progressDb';
import { useToday } from '../../hooks/useToday';
import { getDueReviewQueue } from '../../srs/dueReview';
import { getTownProgress } from './townModel';
import TownView from './TownView';
import { openTownDirectPractice, type TownPracticeReturn } from './townPractice';
import { startTownStudy, townScope, townStudyStatus, townStudyUrl } from './townStudy';
import './town.css';

/** Existing evidence is projected into houses; opening this screen never writes progress. */
export default function TownScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const resume = (location.state as { townPractice?: TownPracticeReturn } | null)?.townPractice;
  const today = useToday();
  const data = useLiveQuery(async () => {
    try {
      const [attempts, logs, scope, study, due] = await Promise.all([
        progressDb.directAttempts.toArray(), progressDb.reviewLogs.toArray(), townScope('LV4/17'), townStudyStatus('LV4/17'), getDueReviewQueue(today),
      ]);
      return { attempts, logs, scope, study, dueCount: due.length, failed: false as const };
    } catch { return { failed: true as const }; }
  }, [today]);
  if (!data) return <div className="town-page"><p role="status">正在打開你的城鎮…</p></div>;
  if (data.failed) return <div className="town-page"><h1>進度暫時讀不到</h1><p role="alert">請重新整理後再試，原有進度不會被清除。</p><Link to="/">回首頁</Link></div>;
  return <TownView level="LV4" unit={17} study={data.study} onStudy={async()=>navigate(townStudyUrl(await startTownStudy('LV4/17')))} rows={getTownProgress(data.attempts, data.logs, data.scope.bindings).map(row => ({
    id: row.item.learningItemId, word: row.item.displayWord ?? '', meaning: row.item.targetMeaningZh ?? '',
    attempted: row.attempted, latestCorrect: row.latestCorrect, latestHintUsed: row.latestHintUsed, latestLearningLabel:row.latestLearningLabel,
  }))} onPractice={async id => {
    const session = await openTownDirectPractice(id);
    navigate(`/practice/direct?session=${encodeURIComponent(session.id)}&town=LV4`);
  }} resume={resume?.to.startsWith('/practice/direct?session=') ? resume : undefined}
    sibling={<Link to="/town/LV1/1">前往 LV1 小鎮 →</Link>}
    due={data.dueCount > 0 ? <Link to="/review?due=1">到期複習 · 全字庫 {data.dueCount} 字 →</Link>
      : <p>今天沒有到期複習。舊字也可以自由練習。</p>} />;
}
