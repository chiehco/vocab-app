import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../db/progressDb';
import { useToday } from '../../hooks/useToday';
import { getDueReviewQueue } from '../../srs/dueReview';
import { getTownProgress } from './townModel';
import TownView from './TownView';
import './town.css';

/** Existing evidence is projected into houses; opening this screen never writes progress. */
export default function TownScreen() {
  const today = useToday();
  const data = useLiveQuery(async () => {
    try {
      const [attempts, due] = await Promise.all([
        progressDb.directAttempts.toArray(), getDueReviewQueue(today),
      ]);
      return { attempts, dueCount: due.length, failed: false };
    } catch { return { attempts: [], dueCount: 0, failed: true }; }
  }, [today]);
  if (!data) return <div className="town-page"><p role="status">正在打開你的城鎮…</p></div>;
  if (data.failed) return <div className="town-page"><h1>進度暫時讀不到</h1><p role="alert">請重新整理後再試，原有進度不會被清除。</p><Link to="/">回首頁</Link></div>;
  return <TownView level="LV4" unit={17} rows={getTownProgress(data.attempts).map(row => ({
    id: row.item.learningItemId, word: row.item.displayWord ?? '', meaning: row.item.targetMeaningZh ?? '',
    attempted: row.attempted, latestCorrect: row.latestCorrect, latestHintUsed: row.latestHintUsed,
  }))} sibling={<Link to="/town/LV1/1">前往 LV1 小鎮 →</Link>}
    due={data.dueCount > 0 ? <Link to="/review?due=1">到期複習 · 全字庫 {data.dueCount} 字 →</Link>
      : <p>今天沒有到期複習。舊字也可以自由練習。</p>} />;
}
