import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { getLV1TownItems, getLV1TownProgress, LV1_TOWN_SOURCE_CARDS } from './lv1TownModel';
import TownView from './TownView';
import { saveWordList } from '../modes/wordLists';
import type { TownPracticeReturn } from './townPractice';
import './town.css';
import { startTownStudy, townScope, townStudyStatus, townStudyUrl } from './townStudy';
import { useToday } from '../../hooks/useToday';

export default function LV1TownScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const resume = (location.state as { townPractice?: TownPracticeReturn } | null)?.townPractice;
  const today=useToday();
  const data = useLiveQuery(async () => {
    try {
      const [words, logs, scope, study] = await Promise.all([contentDb.words.toArray(), progressDb.reviewLogs.toArray(), townScope('LV1/1'), townStudyStatus('LV1/1')]);
      return { items: getLV1TownItems(words), words, logs, scope, study, failed: false as const };
    } catch { return { failed: true as const }; }
  }, [today]);
  if (!data) return <div className="town-page"><p role="status">正在打開 LV1 小鎮…</p></div>;
  if (data.failed) return <div className="town-page"><h1>進度暫時讀不到</h1><p role="alert">請重新整理後再試，原有進度不會被清除。</p><Link to="/">回首頁</Link></div>;
  if (data.items.length !== LV1_TOWN_SOURCE_CARDS.length) return <div className="town-page"><h1>字卡還沒載入完整</h1><p>請重新整理後再試。</p><Link to="/">回首頁</Link></div>;
  return <TownView level="LV1" unit={1} study={data.study} onStudy={async()=>navigate(townStudyUrl(await startTownStudy('LV1/1')))} rows={getLV1TownProgress(data.items, data.logs, data.scope.bindings).map(row => ({
    id: row.item.id, word: row.item.word, meaning: row.item.meaningZh,
    attempted: row.attempted, latestCorrect: row.latestCorrect, latestLearningLabel:row.latestLearningLabel,
  }))} onPractice={async id => {
    const item = data.items.find(item => item.id === id);
    const word = data.words.find(word => word.wordId === item?.wordId);
    if (!word) throw new Error('字卡尚未完整載入');
    const list = await saveWordList([word], `LV1 Unit 1 · ${word.word}`, '/textbook/LV1/1');
    navigate(`/quiz?list=${encodeURIComponent(list.id)}&start=w2m&town=LV1`);
  }} resume={resume?.to.startsWith('/quiz?list=') ? resume : undefined}
    sibling={<Link to="/town/LV4/17">前往 Unit 17 小鎮 →</Link>} />;
}
