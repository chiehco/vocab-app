import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../../db/contentDb';
import { findUnit, templateGroup } from '../direct/model';
import { addLV1ReviewedGroups, lv1ReviewedGroups } from '../direct/lv1ReviewedGroups';
import { saveGroup, startSession } from '../direct/store';
import { saveWordList } from '../modes/wordLists';
import { practiceIds } from './model';
import { textbookLevels, textbookPath, textbookUnits } from './textbookCatalog';
import '../modes/learning-home.css';

export default function TextbookScreen() {
  const route = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedLevel = route.level ?? params.get('level');
  const level = textbookLevels.includes(requestedLevel ?? '') ? requestedLevel! : textbookLevels[0];
  const chosen = route.unit ? textbookUnits.find(u => u.level === route.level && u.unit === Number(route.unit)) : undefined;
  const words = useLiveQuery(() => contentDb.words.toArray(), []);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function act(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '無法開始，請再試一次。'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function practice() {
    if (!chosen) return;
    if (chosen.partial) {
      const template = lv1ReviewedGroups.find(u => u.unit === chosen.unit)!;
      const selected = template.wordIds.map(id => words?.find(w => w.wordId === id));
      if (selected.some(w => !w)) throw new Error('字卡資料尚未載入完整，請稍後再試。');
      const list = await saveWordList(selected.filter(w => !!w), chosen.name, textbookPath(chosen.level, chosen.unit));
      navigate(`/quiz?list=${encodeURIComponent(list.id)}&start=w2m`);
    } else {
      const unit = findUnit(chosen.unit, chosen.level)!;
      const ids = practiceIds(unit.items.filter(i => i.kind === 'vocabulary'));
      const session = await startSession(ids.slice(0,10), `${chosen.name} · 詞彙練習`, undefined, ids);
      navigate(`/practice/direct?session=${encodeURIComponent(session.id)}`);
    }
  }
  async function addGroup() {
    if (!chosen) return;
    if (chosen.partial) await addLV1ReviewedGroups([chosen.unit]);
    else await saveGroup(templateGroup(chosen.unit, chosen.level));
    setNotice('已加入我的群組。');
  }

  return <div className="learning-page">
    <header className="learning-header"><Link to={route.unit ? `/textbook?level=${level}` : '/'}>← {route.unit ? '課本單元' : '首頁'}</Link><Link to="/modes/words">全部單字</Link></header>
    {route.unit ? !chosen ? <><h1>找不到這個單元</h1><Link className="learning-primary" to="/textbook">選課本單元</Link></> : <>
      <p className="learning-muted">{chosen.level} 課本單元</p><h1>Unit {String(chosen.unit).padStart(2,'0')}</h1>
      <p className="learning-muted">先看字卡，或直接試試題目。</p>
      <div className="learning-meta"><span>{chosen.count} {chosen.partial ? '組圖句' : '個詞彙'}</span>{chosen.usageCount > 0 && <span>{chosen.usageCount} 項用法</span>}</div>
      {chosen.partial && <p className="learning-muted">部分內容：目前提供已審閱的圖句。</p>}
      <Link className="learning-primary" to={chosen.partial ? `${textbookPath(chosen.level,chosen.unit)}/cards` : `/vocabulary?level=${chosen.level}&unit=${chosen.unit}`}>看字卡 <span aria-hidden="true">→</span></Link>
      <button className="learning-secondary" disabled={busy || !words} onClick={() => void act(practice)}>做題目</button>
      <p className="learning-muted learning-hint">{chosen.partial ? '題目使用已收錄詞條的一般單字練習；補充詞可在字卡閱讀。' : '每次先練 10 題，可隨時離開，下次接著答。'}</p>
      <details><summary>更多選項</summary><button className="learning-secondary" disabled={busy} onClick={() => void act(addGroup)}>加入我的群組</button><Link className="learning-row" to="/groups">管理我的群組 →</Link></details>
    </> : <>
      <h1>想學哪一課？</h1><p className="learning-muted">選好單元，就可以開始。</p>
      <label className="learning-level">課本等級<select value={level} onChange={e => setParams({level:e.target.value})}>{textbookLevels.map(l => <option key={l}>{l}</option>)}</select></label>
      {textbookUnits.filter(u => u.level === level).map(u => <Link key={`${u.level}-${u.unit}`} className="learning-row" to={textbookPath(u.level,u.unit)}><span><strong>Unit {String(u.unit).padStart(2,'0')}</strong><small>{u.count} {u.partial ? '組圖句 · 部分內容' : `個詞彙 · ${u.usageCount} 項用法`}</small></span><span aria-hidden="true">→</span></Link>)}
      <footer className="learning-footer"><Link to="/groups">我的群組</Link><Link to="/modes/words">搜尋全部單字</Link></footer>
    </>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </div>;
}
