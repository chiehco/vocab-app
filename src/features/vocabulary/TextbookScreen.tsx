import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../../db/contentDb';
import { findUnit, templateGroup } from '../direct/model';
import { addLV1ReviewedGroups, lv1ReviewedGroups } from '../direct/lv1ReviewedGroups';
import { saveGroup, startScopeSession } from '../direct/store';
import { saveWordList } from '../modes/wordLists';
import { practiceIds } from './model';
import { publisherName, resolveTextbookScope, unitRanges, textbookPath, trackInfo, unitsFor, unitTitle, type TextbookScope, type TextbookUnit } from './textbookCatalog';
import { ScopePicker, UnitTiles } from '../../components/ScopePicker';
import '../modes/learning-home.css';

const pad = (n: number) => String(n).padStart(2, '0');

/** 預設出版社與類別不寫進網址，舊連結 /textbook?level=LV3 照樣可用 */
function scopeQuery(scope: TextbookScope) {
  const q = new URLSearchParams();
  if (scope.track !== '7000') q.set('track', scope.track);
  if (scope.publisher !== 'ivy') q.set('pub', scope.publisher);
  q.set('level', scope.volume);
  return q.toString();
}
const tileDetail = (u: TextbookUnit) => u.partial ? `${u.count} 組圖句` : `${u.count} 個詞彙${u.usageCount ? ` · ${u.usageCount} 項用法` : ''}`;

export default function TextbookScreen() {
  const route = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const scope = resolveTextbookScope({ track: params.get('track'), publisher: params.get('pub'), volume: route.level ?? params.get('level') });
  const units = scope ? unitsFor(scope) : [];
  const chosen = route.unit && scope?.volume === route.level ? units.find(u => u.unit === Number(route.unit)) : undefined;
  const listPath = scope ? `/textbook?${scopeQuery(scope)}` : '/textbook';
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
      const session = await startScopeSession(ids, `${chosen.name} · 詞彙練習`);
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
    <header className="learning-header"><Link to={route.unit ? listPath : '/'}>← {route.unit ? '選單元' : '首頁'}</Link><Link to="/modes/words">全部單字</Link></header>
    {route.unit ? !chosen ? <><h1>找不到這個單元</h1><Link className="learning-primary" to={listPath}>選單元</Link></> : <>
      <p className="learning-muted">{publisherName(chosen.publisher)} {trackInfo(chosen.track).label} · {chosen.volume}</p><h1>{unitTitle(chosen)}</h1>
      <section className="learning-start textbook-unit-card" aria-label="開始這個單元">
        <div className="learning-meta"><span>{chosen.count} {chosen.partial ? '組圖句' : '個詞彙'}</span>{chosen.usageCount > 0 && <span>{chosen.usageCount} 項用法</span>}</div>
        {chosen.partial && <p className="learning-muted">部分內容：目前提供已審閱的圖句。</p>}
        <Link className="learning-primary" to={chosen.partial ? `${textbookPath(chosen.level,chosen.unit)}/cards` : `/vocabulary?level=${chosen.level}&unit=${chosen.unit}`}>看字卡 <span aria-hidden="true">→</span></Link>
        <button className="learning-secondary" disabled={busy || !words} onClick={() => void act(practice)}>做題目</button>
      </section>
      <p className="learning-muted learning-hint">{chosen.partial ? '題目使用已收錄詞條的一般單字練習；補充詞可在字卡閱讀。' : '範圍涵蓋整個單元，未練過的題目優先。可隨時離開，下次接著答。'}</p>
      <details><summary>更多選項</summary><button className="learning-secondary" disabled={busy} onClick={() => void act(addGroup)}>加入我的群組</button><Link className="learning-row" to="/groups">管理我的群組 →</Link></details>
    </> : <>
      <h1>想學哪一課？</h1><p className="learning-muted">選好單元，就可以開始。</p>
      {!scope ? <p role="status">目前還沒有可用的單元。</p> : <>
        <ScopePicker scope={scope} onChange={next => setParams(new URLSearchParams(scopeQuery(next)), { replace: true })} />
        <ScopeNote scope={scope} units={units} />
        <UnitTiles units={units} to={u => textbookPath(u.volume, u.unit) + (scope.track !== '7000' || scope.publisher !== 'ivy' ? `?${scopeQuery(scope)}` : '')} detail={tileDetail} />
      </>}
      <footer className="learning-footer"><Link to="/groups">我的群組</Link><Link to="/modes/words">搜尋全部單字</Link></footer>
    </>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </div>;
}

/** 部分內容與缺號只說一次，不在每格重複。 */
function ScopeNote({ scope, units }: { scope: TextbookScope; units: TextbookUnit[] }) {
  if (!units.length) return null;
  const info = trackInfo(scope.track);
  const ranges = unitRanges(units.map(u => u.unit));
  const label = ranges.map(([a, b]) => a === b ? pad(a) : `${pad(a)}–${pad(b)}`).join('、');
  const partial = units.some(u => u.partial);
  return <p className="learning-muted textbook-scope-note">
    {publisherName(scope.publisher)} {info.label} {scope.volume}：收錄 {info.unitLabel === 'Unit' ? `Unit ${label}` : `第 ${label} 課`}
    {ranges.length > 1 ? '，其餘單元整理中' : ''}。{partial ? '目前提供已審閱的圖句，屬部分內容。' : ''}
  </p>;
}
