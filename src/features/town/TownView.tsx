import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import SpeakerButton from '../../components/SpeakerButton';
import TownMap from './TownMap';

interface TownRow {
  id: string; word: string; meaning: string; attempted: boolean;
  latestCorrect: boolean; latestHintUsed?: boolean;
}

export default function TownView({ level, unit, rows, sibling, due }: {
  level: string; unit: number; rows: TownRow[]; sibling: ReactNode; due?: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? '');
  const selected = rows.find(row => row.id === selectedId) ?? rows[0];
  const built = rows.filter(row => row.attempted).length;
  return <div className="town-page">
    <header className="town-header"><Link to="/" className="town-brand">萬詞譜</Link><Link to={`/textbook/${level}/${unit}`}>課本單元</Link></header>
    <p className="town-eyebrow">{level} · UNIT {unit} · 城鎮試玩</p>
    <h1>練過的字，有了小屋。</h1>
    <p className="town-subtle">逛逛城鎮，點小屋看看單字。</p>
    <Link className="town-primary town-practice-entry" to={`/textbook/${level}/${unit}`}>到課本練習 →</Link>
    <div className="town-summary"><span><strong>{built}</strong>／{rows.length} 棟小屋</span><span>已練過 {built} 字</span></div>
    <progress className="town-meter" value={built} max={rows.length} aria-label={`已完成練習 ${built} 個字，共 ${rows.length} 個`} />
    <TownMap plots={rows.map(row => ({ id: row.id, word: row.word, built: row.attempted }))}
      selectedId={selected?.id ?? ''} onSelect={setSelectedId} label={`${level} Unit ${unit} 單字城鎮，可向左右與上下捲動`} />
    {selected && <section className="town-selected" aria-label="選取的單字">
      <div className="town-selection-title"><h2>{selected.word}</h2><span>{selected.attempted ? '已練過 · 小屋落成' : '尚未練過 · 等待入住'}</span></div>
      <p>{selected.meaning}</p>
      {selected.attempted && <p className="town-subtle">{selected.latestCorrect ? '最近一次答對' : '最近一次還不熟，再陪牠練一次'}{selected.latestHintUsed ? ' · 使用過提示' : ''}。小屋會保留。</p>}
      <div className="town-selected-actions"><SpeakerButton text={selected.word} /></div>
    </section>}
    <p className="town-subtle town-footnote">小屋記錄練過的字，還要慢慢複習才會記穩。<br />進度保存在目前的瀏覽器。</p>
    <div className="town-due">{sibling}</div>
    {due && <div className="town-due">{due}</div>}
  </div>;
}
