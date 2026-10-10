import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { getLV1TownItems, getLV1TownProgress, LV1_TOWN_SOURCE_CARDS } from './lv1TownModel';
import TownView from './TownView';
import './town.css';

export default function LV1TownScreen() {
  const data = useLiveQuery(async () => {
    try {
      const [words, logs] = await Promise.all([contentDb.words.toArray(), progressDb.reviewLogs.toArray()]);
      return { items: getLV1TownItems(words), logs, failed: false };
    } catch { return { items: [], logs: [], failed: true }; }
  }, []);
  if (!data) return <div className="town-page"><p role="status">正在打開 LV1 小鎮…</p></div>;
  if (data.failed) return <div className="town-page"><h1>進度暫時讀不到</h1><p role="alert">請重新整理後再試，原有進度不會被清除。</p><Link to="/">回首頁</Link></div>;
  if (data.items.length !== LV1_TOWN_SOURCE_CARDS.length) return <div className="town-page"><h1>字卡還沒載入完整</h1><p>請重新整理後再試。</p><Link to="/">回首頁</Link></div>;
  return <TownView level="LV1" unit={1} rows={getLV1TownProgress(data.items, data.logs).map(row => ({
    id: row.item.id, word: row.item.word, meaning: row.item.meaningZh,
    attempted: row.attempted, latestCorrect: row.latestCorrect,
  }))} sibling={<Link to="/town/LV4/17">前往 Unit 17 小鎮 →</Link>} />;
}
