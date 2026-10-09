import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToday } from '../../hooks/useToday';
import { getStudyResume } from './studyResume';
import { getDueReviewQueue } from '../../srs/dueReview';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import ResilientBeastImage from '../wordbeast/ResilientBeastImage';
import './learning-home.css';

export default function HomeScreen() {
  const today = useToday();
  const data = useLiveQuery(async () => {
    try {
      const [resume, due] = await Promise.all([getStudyResume(), getDueReviewQueue(today)]);
      // 到期字裡有圖的前幾隻，放在複習卡上；沒圖的字不硬湊
      const faces = due.flatMap(({ wordRecord: w }) => { const src = getWordBeastAsset(w.wordId, w.word, w.imageWordId); return src ? [{ word: w.word, src }] : []; }).slice(0, 4);
      return { resume, dueCount: due.length, faces, error: false };
    } catch { return { resume: undefined, dueCount: 0, faces: [], error: true }; }
  }, [today]);
  const resume = data?.resume;
  return <div className="learning-page learning-home">
    <header className="learning-header"><Link to="/" className="learning-brand">萬詞譜</Link><Link to="/settings">設定</Link></header>
    <h1>{resume ? '今天，接著學吧。' : '從一個單元開始。'}</h1>
    <Link className="learning-row town-home-entry" to="/town/LV1/1"><span><strong>LV1 單字小鎮</strong><small>Unit 1 · 查看練習留下的小屋</small></span><span aria-hidden="true">→</span></Link>
    {!data ? <p role="status">正在讀取學習進度…</p> : <>
      {data.error && <p role="alert">暫時無法讀取進度，請重新整理後再試。仍可選擇課本單元。</p>}
      <section className="learning-start" aria-label={resume ? '上次學到' : '開始學習'}>
        <p className="learning-muted">{resume ? '上次學到' : '第一步'}</p>
        <h2>{resume?.title ?? '選擇正在讀的課本'}</h2>
        {resume ? <><progress aria-label="上次學習位置" value={resume.position} max={resume.total}/><p className="learning-muted">接著第 {resume.position}／{resume.total} {resume.href.startsWith('/practice') ? '題' : '張'}</p></>
          : <p className="learning-muted">選好單元，就能看字卡或做題目。</p>}
        <Link className="learning-primary" to={resume?.href ?? '/textbook'}>{resume ? '繼續學習' : '選課本單元'}<span aria-hidden="true">→</span></Link>
      </section>
      {!resume && !data.error && <p className="learning-muted learning-hint">開始學習後，這裡會幫你記住位置。</p>}
      {data.dueCount > 0 && <Link className="learning-due" to="/review?due=1">
        {data.faces.length > 0 && <span className="learning-due-faces" aria-hidden="true">{data.faces.map(f => <ResilientBeastImage key={f.word} src={f.src} word={f.word} alt="" />)}</span>}
        <span><strong>今日複習</strong><small>{data.dueCount} 個單字等你回來看看</small></span><span aria-hidden="true">→</span></Link>}
      <nav className="learning-tiles" aria-label="其他入口">
        {resume ? <Link to="/textbook"><strong>換個單元</strong><small>依等級與 Unit 選</small></Link>
          : <Link to="/exam"><strong>想先練學測？</strong><small>直接進大考練習</small></Link>}
        <Link to="/games"><strong>玩單字遊戲</strong><small>用學過的字對戰</small></Link>
      </nav>
    </>}
    <footer className="learning-footer"><Link to="/progress">學習紀錄</Link><Link to="/groups">我的群組</Link></footer>
  </div>;
}
