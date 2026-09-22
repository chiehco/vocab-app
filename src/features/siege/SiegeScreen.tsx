import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../../db/contentDb';
import { textbookLevels, textbookUnits } from '../vocabulary/textbookCatalog';
import { scriptJson, siegeUnitWords, type SiegeWord } from './model';
import template from './siege.html?raw';
import '../modes/learning-home.css';
import './siege.css';

function Battle({ words, title }: { words: SiegeWord[]; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(950);
  const doc = useMemo(() => template.replace('/* SIEGE_WORDS */', scriptJson(words)), [words]);
  useEffect(() => {
    function resize(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'siege-height') return;
      const next = event.data.height;
      if (Number.isFinite(next) && next > 100 && next < 5000) setHeight(Math.ceil(next));
    }
    window.addEventListener('message', resize);
    return () => window.removeEventListener('message', resize);
  }, []);
  return <iframe ref={frame} className="siege-frame" title={`${title} 即時拼字守城`}
    sandbox="allow-scripts" srcDoc={doc} style={{ height }} />;
}

export default function SiegeScreen() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('level') ?? 'LV1';
  const level = textbookLevels.includes(requested) ? requested : 'LV1';
  const units = textbookUnits.filter(u => u.level === level);
  const unit = units.find(u => u.unit === Number(params.get('unit'))) ?? units[0];
  const dictionary = useLiveQuery(() => contentDb.words.toArray(), []);
  const [match, setMatch] = useState<{ words: SiegeWord[]; title: string } | null>(null);
  const words = useMemo(() => siegeUnitWords(level, unit.unit, dictionary ?? []), [level, unit.unit, dictionary]);
  if (match) return <div className="siege-page">
    <header className="siege-nav"><button onClick={() => setMatch(null)}>← 換單元</button><span>{match.title}</span><Link to="/games">遊戲</Link></header>
    <Battle words={match.words} title={match.title} />
  </div>;
  return <div className="learning-page">
    <header className="learning-header"><Link to="/games">← 單字遊戲</Link></header>
    <h1>拼字守城</h1><p className="learning-muted">拼字召喚援軍、冰凍敵人、爆破救場。守住 60 秒！</p>
    <label className="learning-level">課本等級<select value={level} onChange={e => setParams({ level: e.target.value })}>{textbookLevels.map(l => <option key={l}>{l}</option>)}</select></label>
    <label className="learning-level">單元<select value={unit.unit} onChange={e => setParams({ level, unit: e.target.value })}>{units.map(u => <option key={u.unit} value={u.unit}>Unit {String(u.unit).padStart(2, '0')}</option>)}</select></label>
    <p>{dictionary ? `${words.length} 個可玩單字` : '載入單字中…'}</p>
    <p className="learning-muted">本版使用 2–16 個英文字母的單字，不含片語與符號。{level === 'LV1' ? 'LV1 使用已審閱單元中有正式詞條的單字及一般字義，尚非完整課本內容。' : '中文提示採用本單元詞義。'}</p>
    <button className="learning-primary" disabled={!dictionary || words.length < 3} onClick={() => setMatch({ words, title: `${level} Unit ${String(unit.unit).padStart(2, '0')}` })}>進入守城</button>
    {dictionary && words.length < 3 && <p role="status">目前可用單字不足，請改選其他單元。</p>}
    <p className="learning-muted learning-hint">敵人會持續前進；切換招式會清空目前拼字。可隨時暫停，離開本頁會結束這一局。</p>
  </div>;
}
