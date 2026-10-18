import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SpeakerButton from '../../components/SpeakerButton';
import TownMap from './TownMap';
import type { TownPracticeReturn } from './townPractice';
import type { townStudyStatus } from './townStudy';
import RewardPanel from '../rewards/RewardPanel';

interface TownRow {
  id: string; word: string; meaning: string; attempted: boolean;
  latestCorrect: boolean; latestHintUsed?: boolean;
  latestLearningLabel?: string;
}

export default function TownView({ level, unit, rows, sibling, due, onPractice, resume, study, onStudy }: {
  level: string; unit: number; rows: TownRow[]; sibling: ReactNode; due?: ReactNode;
  onPractice: (id: string) => Promise<void>; resume?: TownPracticeReturn;
  study:Awaited<ReturnType<typeof townStudyStatus>>; onStudy:()=>Promise<void>;
}) {
  const [params] = useSearchParams();
  const focusId = params.get('item');
  const [selectedId, setSelectedId] = useState(rows.find(row => row.id === focusId)?.id ?? rows[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const cardDialog = useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if(focusId && rows.some(row=>row.id===focusId)) {
      setSelectedId(focusId);
      if(cardDialog.current && !cardDialog.current.open)cardDialog.current.showModal();
    }
  },[focusId,rows]);
  const selected = rows.find(row => row.id === selectedId) ?? rows[0];
  const built = rows.filter(row => row.attempted).length;
  const continuing=!!study.active && study.active.index<study.active.items.length;
  const remaining=continuing ? study.active!.items.length-study.active!.index-(study.currentSaved?1:0) : study.queueCount;
  async function open(action:()=>Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); }
    catch { setError('暫時無法開始練習，請再試一次。原有進度會保留。'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="town-page town-overview">
    <header className="town-header"><Link to="/" className="town-brand">萬詞譜</Link><h1>{level} · Unit {unit}</h1><Link to={`/textbook/${level}/${unit}`}>課本單元</Link></header>
    <details className="town-about"><summary>小鎮說明</summary><div>
      <p className="town-subtle">完成一般學習、複習或補練並保存紀錄，對應單字的小屋就會落成。答錯也算；只看字卡或聽發音不會蓋屋。</p>
      <p className="town-subtle">{remaining>0 ? `本輪還有 ${remaining} 字，依本小鎮詞域、到期時間與今日剩餘額度安排。` : continuing ? '本輪的紀錄已保存，可查看成果並完成本輪。' : '明天再來查看安排，也可以選一個單字補練。'}進度會保存，可隨時回小鎮再繼續。</p>
      {study.missing.length>0 && <p className="town-subtle">{study.missing.join('、')} 尚未連到一般字卡，暫不排入日課；可點空地使用單字補練。</p>}
      <p className="town-subtle">點小屋或空地查看字卡。全貌較密集時，可放大後拖曳，或用鍵盤逐棟選取。</p>
      <RewardPanel />
      <p className="town-subtle town-footnote">小屋記錄練過的字，還要慢慢複習才會記穩。進度保存在目前的瀏覽器。{level==='LV1' && '單字補練續答請留在同一分頁。'}</p>
      <div className="town-due">{sibling}</div>{due && <div className="town-due">{due}</div>}
    </div></details>
    {continuing || remaining>0 ? <button className="town-primary town-practice-entry" disabled={busy} onClick={()=>void open(onStudy)}>{busy ? '正在開啟練習…' : continuing ? remaining ? '繼續今天的學習 →' : '查看本輪成果 →' : study.recapOnly ? '開始同日回顧 →' : '開始今日學新與複習 →'}</button>
      : <p className="town-practice-note" role="status">今天的安排已完成，目前沒有可排的學新或複習。</p>}
    {error && <p role="alert" className="town-error">{error}</p>}
    <div className="town-summary"><span><strong>{built}</strong>／{rows.length} 小屋</span><span>已練過 {built} 字</span></div>
    <progress className="town-meter" value={built} max={rows.length} aria-label={`已完成練習 ${built} 個字，共 ${rows.length} 個`} />
    <TownMap plots={rows.map(row => ({ id: row.id, word: row.word, built: row.attempted }))}
      selectedId={selected?.id ?? ''} onSelect={id=>{setSelectedId(id);cardDialog.current?.showModal();}} focusOnMount={rows.some(row => row.id === focusId)} label={`${level} Unit ${unit} 單字城鎮全貌，可放大後拖曳`} />
    {selected && <dialog className="town-card-dialog" ref={cardDialog} onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.close();}} aria-label="小鎮字卡">
      <button className="town-dialog-close" onClick={()=>cardDialog.current?.close()}>關閉字卡 ×</button><section className="town-selected" aria-label="選取的單字">
      <div className="town-selection-title"><h2>{selected.word}</h2><span>{selected.attempted ? '已練過 · 小屋落成' : '尚未練過 · 等待入住'}</span></div>
      <p>{selected.meaning}</p>
      {!selected.attempted && <p className="town-subtle">練這個字並保存一次答案，就能蓋小屋。答錯或使用提示也算；離開前沒作答，空地會保留。</p>}
      {selected.attempted && <p className="town-subtle">{selected.latestLearningLabel ?? (selected.latestCorrect ? '最近一次答對' : '最近一次還不熟，再陪牠練一次')}{selected.latestHintUsed ? ' · 使用過提示' : ''}。小屋會保留。</p>}
      <div className="town-selected-actions"><SpeakerButton text={selected.word} /><button className="town-secondary" disabled={busy} onClick={() => void open(()=>onPractice(selected.id))}>{selected.attempted ? '再練這個字' : '練這個字，蓋小屋'}</button></div>
      <p className="town-subtle">單字補練：每次只練這一字。<Link to={`/textbook/${level}/${unit}`}>到課本選範圍 →</Link></p>
      {resume && <Link className="town-text-button" to={resume.to} state={resume.state}>繼續本輪補練 →</Link>}
    </section></dialog>}
  </div>;
}
