import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../db/progressDb';
import { learningItems, templateGroup } from './model';
import type { CustomGroup } from './model';
import { saveGroup, startGroupSession } from './store';
import './direct.css';
import { contentDb } from '../../db/contentDb';
import GroupImportPanel from './GroupImportPanel';
import { groupWords } from './groupWords';

export default function GroupsScreen() {
  const navigate = useNavigate();
  const [params]=useSearchParams();
  const groups = useLiveQuery(() => progressDb.customGroups.orderBy('updatedAt').reverse().toArray());
  const words = useLiveQuery(() => contentDb.words.toArray());
  const [selected,setSelected] = useState(params.get('group')??'');
  const [name,setName] = useState(params.get('group')?'LV3 Unit 1':'');
  const [query,setQuery] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const g = groups?.find(g => g.id === selected);
  const cards = groupWords(g?.wordIds ?? [], words ?? []);
  const savedName=g?.name;
  useEffect(()=>{if(savedName!==undefined)setName(savedName);},[savedName]);
  const sessions=useLiveQuery(()=>progressDb.directSessions.orderBy('updatedAt').reverse().toArray());
  const resume=sessions?.find(s=>s.groupId===g?.id && s.index<s.questionIds.length);
  async function practice() { if(!g)return;setBusy(true);setError('');try {const s=await startGroupSession(g.id);navigate(`/practice/direct?session=${s.id}`);}catch {setError('未能開始練習，請確認群組至少有一個項目後再重試。');}finally {setBusy(false);} }
  async function save(group: CustomGroup) { setBusy(true); setError(''); try { await saveGroup(group); setSelected(group.id); } catch { setError('未能儲存。名稱不可空白，請重試。'); } finally { setBusy(false); } }
  function move(index:number,delta:number) { if (!g) return; const ids=[...g.itemIds]; [ids[index],ids[index+delta]]=[ids[index+delta],ids[index]]; void save({...g,itemIds:ids}); }
  function moveWord(index:number,delta:number) { if (!g?.wordIds) return; const ids=[...g.wordIds]; [ids[index],ids[index+delta]]=[ids[index+delta],ids[index]]; void save({...g,wordIds:ids}); }
  const available = learningItems.filter(i => !g?.itemIds.includes(i.learningItemId) && `${i.displayWord ?? i.pattern} ${i.targetMeaningZh ?? i.explanationZh}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="direct-page"><nav><Link to="/modes/words">← 單字模式</Link><Link to="/vocabulary">單字字卡</Link></nav>
    <p className="direct-kicker">MY COLLECTION</p><h1>我的群組</h1><p className="direct-muted">匯入單字表，或把 Unit 收進群組，再依需要增刪與排序。</p>
    {error && <p role="alert">{error}</p>}
    <GroupImportPanel words={words} groups={groups ?? []} onSaved={group => {setSelected(group.id);setName(group.name);}} />
    <button className="direct-primary" disabled={busy} onClick={() => {setName('LV3 Unit 1'); void save(templateGroup());}}>以 LV3 Unit 1 建立群組</button>
    <button disabled={busy} onClick={() => {setName('LV3 Unit 2');void save(templateGroup(2));}}>以 LV3 Unit 2 建立群組</button>
    <button disabled={busy} onClick={() => {setName('我的群組'); void save({...templateGroup(),name:'我的群組',itemIds:[],templateId:null,templateRevision:null});}}>建立空白群組</button>
    <p className="direct-muted">Unit 1含123詞彙、53文法；Unit 2含138詞彙、40文法。例句均另行撰寫。</p>
    <label>選擇群組<select value={selected} onChange={e => {setSelected(e.target.value);setName(groups?.find(g => g.id === e.target.value)?.name ?? '');}}><option value="">請選擇</option>{groups?.map(g => <option value={g.id} key={g.id}>{g.name}（{g.itemIds.length + (g.wordIds?.length ?? 0)}）</option>)}</select></label>
    {g && <><form onSubmit={e => {e.preventDefault();void save({...g,name:name.trim()});}}><label>群組名稱<input value={name} maxLength={80} onChange={e => setName(e.target.value)} /></label><button disabled={busy || !name.trim()}>儲存名稱</button></form>
      <h2>{g.name} · {g.itemIds.length + (g.wordIds?.length ?? 0)} 項</h2>
      {!!g.wordIds?.length && <>
        <div className="group-import-links">{cards[0] && <Link to={`/word/${cards[0].wordId}?group=${encodeURIComponent(g.id)}`}>依序看字卡</Link>}<Link to={`/quiz?group=${encodeURIComponent(g.id)}`}>單字自由練習</Link></div>
        <ol className="direct-items">{g.wordIds.map((id,index) => {const word=words?.find(w=>w.wordId===id);return <li key={id}>
          {word ? <Link to={`/word/${id}?group=${encodeURIComponent(g.id)}`}>{index+1}. {word.word} · {word.meaningZh}</Link> : <span>{index+1}. 此字卡目前無法使用</span>}
          <div className="direct-item-actions"><button disabled={busy || index===0} aria-label={`上移單字第${index+1}項`} onClick={()=>moveWord(index,-1)}>↑</button><button disabled={busy || index===g.wordIds!.length-1} aria-label={`下移單字第${index+1}項`} onClick={()=>moveWord(index,1)}>↓</button><button disabled={busy} aria-label={`移除單字第${index+1}項`} onClick={()=>void save({...g,wordIds:g.wordIds!.filter(x=>x!==id)})}>移除</button></div>
        </li>;})}</ol>
      </>}
      {!!g.itemIds.length && <button className="direct-primary" disabled={busy} onClick={()=>void practice()}>開始 Unit 內容練習（{g.itemIds.length} 題）</button>}
      {resume && <p><Link to={`/practice/direct?session=${resume.id}`}>繼續上次練習（第 {resume.index+1}／{resume.questionIds.length} 題）</Link><span className="direct-muted"> · 使用上次開練的清單</span></p>}
      <ol className="direct-items">{g.itemIds.map((id,index) => {const item=learningItems.find(i=>i.learningItemId===id);return <li key={id}>
        <details><summary>{index+1}. {item?.displayWord ?? item?.pattern ?? '項目待更新'} <span>{item?.targetMeaningZh}</span></summary>
          {item?.kind === 'grammar' ? <p>{item.explanationZh}</p> : <><p>教材收錄義：{item?.chapterMeaningsZh}</p><p>本題練習義：{item?.targetMeaningZh}</p><p>{item?.originalExample?.sentenceEn}</p><p>{item?.originalExample?.sentenceZh}</p></>}
        </details><div className="direct-item-actions"><button disabled={busy || index===0} aria-label={`上移第${index+1}項`} onClick={()=>move(index,-1)}>↑</button><button disabled={busy || index===g.itemIds.length-1} aria-label={`下移第${index+1}項`} onClick={()=>move(index,1)}>↓</button><button disabled={busy} aria-label={`移除第${index+1}項`} onClick={()=>void save({...g,itemIds:g.itemIds.filter(x=>x!==id)})}>移除</button></div>
      </li>;})}</ol>
      <h2>加入學習項目</h2><label>搜尋單字或文法<input value={query} onChange={e=>setQuery(e.target.value)} /></label>
      {!!query.trim() && <>{(words ?? []).filter(w=>!g.wordIds?.includes(w.wordId) && `${w.word} ${w.meaningZh}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0,30).map(w=><div className="direct-option-row" key={w.wordId}><span>{w.word} {w.meaningZh}</span><button disabled={busy} onClick={()=>void save({...g,wordIds:[...(g.wordIds ?? []),w.wordId]})}>加入字卡</button></div>)}</>}
      <p className="direct-muted">另可加入已審核的 LV3 Unit 1、Unit 2 單字與文法練習。</p>
      {available.slice(0,30).map(i=><div className="direct-option-row" key={i.learningItemId}><span>{i.displayWord ?? i.pattern} {i.targetMeaningZh}</span><button disabled={busy} onClick={()=>void save({...g,itemIds:[...g.itemIds,i.learningItemId]})}>加入</button></div>)}
      {available.length>30 && <p>另有 {available.length-30} 項，請輸入關鍵字縮小範圍。</p>}
    </>}
  </div>;
}
