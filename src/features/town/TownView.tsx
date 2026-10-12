import { useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SpeakerButton from '../../components/SpeakerButton';
import TownMap from './TownMap';
import type { TownPracticeReturn } from './townPractice';

interface TownRow {
  id: string; word: string; meaning: string; attempted: boolean;
  latestCorrect: boolean; latestHintUsed?: boolean;
}

export default function TownView({ level, unit, rows, sibling, due, onPractice, resume }: {
  level: string; unit: number; rows: TownRow[]; sibling: ReactNode; due?: ReactNode;
  onPractice: (id: string) => Promise<void>; resume?: TownPracticeReturn;
}) {
  const [params] = useSearchParams();
  const focusId = params.get('item');
  const [selectedId, setSelectedId] = useState(rows.find(row => row.id === focusId)?.id ?? rows[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const selected = rows.find(row => row.id === selectedId) ?? rows[0];
  const built = rows.filter(row => row.attempted).length;
  const next = rows.find(row => !row.attempted) ?? selected;
  async function practice(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onPractice(id); }
    catch { setError('暫時無法開始練習，請再試一次。原有進度會保留。'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="town-page">
    <header className="town-header"><Link to="/" className="town-brand">萬詞譜</Link><Link to={`/textbook/${level}/${unit}`}>課本單元</Link></header>
    <p className="town-eyebrow">{level} · UNIT {unit} · 城鎮試玩</p>
    <h1>{built === 0 ? '答一題，蓋第一間小屋。' : '練過的字，有了小屋。'}</h1>
    <p className="town-subtle">{built === 0 ? '選一個單字開始練習，答案保存後，這個字的小屋就會落成。答錯也算；只看字卡或聽發音不會蓋屋。' : '逛逛城鎮，點小屋看看單字。'}</p>
    {resume ? <Link className="town-primary town-practice-entry" to={resume.to} state={resume.state}>繼續本輪練習 →</Link>
      : next && <button className="town-primary town-practice-entry" disabled={busy} onClick={() => void practice(next.id)}>{busy ? '正在開啟練習…' : built === 0 ? '開始蓋第一間小屋 →' : '繼續練單字 →'}</button>}
    {error && <p role="alert" className="town-error">{error}</p>}
    <div className="town-summary"><span><strong>{built}</strong>／{rows.length} 棟小屋</span><span>已練過 {built} 字</span></div>
    <progress className="town-meter" value={built} max={rows.length} aria-label={`已完成練習 ${built} 個字，共 ${rows.length} 個`} />
    <TownMap plots={rows.map(row => ({ id: row.id, word: row.word, built: row.attempted }))}
      selectedId={selected?.id ?? ''} onSelect={setSelectedId} focusOnMount={rows.some(row => row.id === focusId)} label={`${level} Unit ${unit} 單字城鎮，可向左右與上下捲動`} />
    {selected && <section className="town-selected" aria-label="選取的單字">
      <div className="town-selection-title"><h2>{selected.word}</h2><span>{selected.attempted ? '已練過 · 小屋落成' : '尚未練過 · 等待入住'}</span></div>
      <p>{selected.meaning}</p>
      {!selected.attempted && <p className="town-subtle">練這個字並保存一次答案，就能蓋小屋。答錯或使用提示也算；離開前沒作答，空地會保留。</p>}
      {selected.attempted && <p className="town-subtle">{selected.latestCorrect ? '最近一次答對' : '最近一次還不熟，再陪牠練一次'}{selected.latestHintUsed ? ' · 使用過提示' : ''}。小屋會保留。</p>}
      <div className="town-selected-actions"><SpeakerButton text={selected.word} /><button className="town-secondary" disabled={busy} onClick={() => void practice(selected.id)}>{selected.attempted ? '再練這個字' : '練這個字，蓋小屋'}</button></div>
    </section>}
    <p className="town-subtle town-footnote">小屋記錄練過的字，還要慢慢複習才會記穩。<br />進度保存在目前的瀏覽器。{level === 'LV1' && <><br />本輪續答請留在同一分頁。</>}</p>
    <div className="town-due">{sibling}</div>
    {due && <div className="town-due">{due}</div>}
  </div>;
}
