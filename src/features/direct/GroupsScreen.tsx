import GroupPicker from './GroupPicker';
import { groupPreview, groupSize } from './groupFilter';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../db/progressDb';
import { learningItems, templateGroup } from './model';
import type { CustomGroup } from './model';
import { deleteGroup, getOrCreateTemplateGroup, restoreGroup, saveGroup, startGroupSession } from './store';
import './direct.css';
import { contentDb } from '../../db/contentDb';
import GroupImportPanel from './GroupImportPanel';
import { resolveGroupWords } from './groupScope';
import { addLV1ReviewedGroups, lv1ReviewedGroups } from './lv1ReviewedGroups';
import { ScopePicker, UnitTiles } from '../../components/ScopePicker';
import { resolveTextbookScope, unitsFor, type TextbookScope, type TextbookUnit } from '../vocabulary/textbookCatalog';

/**
 * 我的群組（2026-10-07 改版）：沒選群組時是「清單＋建立」，選了群組是「群組內容」。
 * 排序、移除、改名、刪除都收在「編輯」裡，平常只看內容與練習入口。
 */
export default function GroupsScreen() {
  const navigate = useNavigate();
  const [params,setParams]=useSearchParams();
  const groups = useLiveQuery(() => progressDb.customGroups.orderBy('updatedAt').reverse().toArray());
  const words = useLiveQuery(() => contentDb.words.toArray());
  const selected = params.get('group') ?? '';
  const [name,setName] = useState('');
  const [query,setQuery] = useState('');
  const [error,setError] = useState('');
  const [deleted,setDeleted] = useState<CustomGroup>();
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [editing,setEditing] = useState(false);
  const [unitScope,setUnitScope] = useState<TextbookScope | undefined>(() => resolveTextbookScope({}));
  const g = groups?.find(g => g.id === selected);
  // Unit 項目對到主表的字也算進去，遊戲與測驗都用這份範圍
  const scopeWords = g ? resolveGroupWords(g, words ?? []) : [];
  const savedName=g?.name;
  useEffect(()=>{if(savedName!==undefined)setName(savedName);},[savedName]);
  useEffect(()=>{setEditing(false);setQuery('');},[selected]);
  const sessions=useLiveQuery(()=>progressDb.directSessions.orderBy('updatedAt').reverse().toArray());
  const resume=sessions?.find(s=>s.groupId===g?.id && s.index<s.questionIds.length);

  function open(id: string, extra: Record<string,string> = {}) { setParams(id ? {group:id,...extra} : {}, {replace:!id}); }
  async function remove() {
    if(!g || busy || !window.confirm('刪除「'+g.name+'」？\n'+groupSize(g)+' 項：'+groupPreview(g,words??[])+'\n只移除這個群組；字卡、學習進度與已開始的練習都會保留。'))return;
    setBusy(true);setError('');
    try { const removed=await deleteGroup(g.id);setDeleted(removed);open('');setNotice('已刪除「'+removed.name+'」。'); }
    catch {setError('未能刪除群組，請重試。');}finally{setBusy(false);}
  }
  async function undoDelete() {
    if(!deleted||busy)return;setBusy(true);setError('');
    try {await restoreGroup(deleted);open(deleted.id);setNotice('已復原「'+deleted.name+'」。');setDeleted(undefined);}
    catch {setError('無法復原，群組可能已存在；目前群組未被覆蓋。');}finally{setBusy(false);}
  }
  async function practice() { if(!g)return;setBusy(true);setError('');try {const s=await startGroupSession(g.id);navigate(`/practice/direct?session=${s.id}`);}catch {setError('未能開始練習，請確認群組至少有一個項目後再重試。');}finally {setBusy(false);} }
  async function save(group: CustomGroup, select = true) { setBusy(true); setError(''); try { await saveGroup(group); if(select && group.id!==selected) open(group.id); } catch { setError('未能儲存。名稱不可空白，請重試。'); } finally { setBusy(false); } }
  /** 從單元建立：已建立的模板直接開啟，不重複新增或覆蓋個人編輯。 */
  async function addUnit(unit: TextbookUnit) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (unit.partial) {
        const result = await addLV1ReviewedGroups([unit.unit]);
        open(result.groups[0].id);
        setNotice(result.added ? `已建立「${result.groups[0].name}」。` : '這個單元的群組已存在，已開啟；沒有重複新增或覆蓋內容。');
      } else {
        const { group, added } = await getOrCreateTemplateGroup(unit.unit, unit.level);
        open(group.id);
        setNotice(added ? `已建立「${group.name}」。` : '這個單元的群組已存在，已開啟；沒有重複新增或覆蓋內容。');
      }
    } catch (error) { setError(error instanceof Error ? error.message : '未能建立群組，請重試。'); }
    finally { setBusy(false); }
  }
  async function addAllReviewed() {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await addLV1ReviewedGroups();
      setNotice(result.added ? `已新增 ${result.added} 個 Unit 群組；既有群組與個人修改均保留。` : '這些群組都已存在，沒有重複新增或覆蓋內容。');
    } catch (error) { setError(error instanceof Error ? error.message : '未能加入群組，請重試。'); }
    finally { setBusy(false); }
  }
  function move(index:number,delta:number) { if (!g) return; const ids=[...g.itemIds]; [ids[index],ids[index+delta]]=[ids[index+delta],ids[index]]; void save({...g,itemIds:ids}); }
  function moveWord(index:number,delta:number) { if (!g?.wordIds) return; const ids=[...g.wordIds]; [ids[index],ids[index+delta]]=[ids[index+delta],ids[index]]; void save({...g,wordIds:ids}); }
  const available = learningItems.filter(i => !g?.itemIds.includes(i.learningItemId) && `${i.displayWord ?? i.pattern} ${i.targetMeaningZh ?? i.explanationZh}`.toLowerCase().includes(query.toLowerCase()));
  const status = <>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {deleted && <button disabled={busy} onClick={()=>void undoDelete()}>復原刪除「{deleted.name}」</button>}</>;

  if (selected && groups && !g) return <div className="direct-page groups-page">
    <nav><Link to="/groups">← 所有群組</Link></nav>
    <h1>找不到這個群組</h1><p className="direct-muted">它可能已被刪除。</p>{status}
  </div>;

  if (g) return <div className="direct-page groups-page">
    <nav><Link to="/groups">← 所有群組</Link><button type="button" className="groups-edit-toggle" aria-pressed={editing} onClick={()=>setEditing(!editing)}>{editing?'完成':'編輯'}</button></nav>
    <header className="groups-hero">
      <h1>{g.name}</h1>
      <p className="direct-muted">{groupSize(g)} 項{scopeWords.length !== groupSize(g) && ` · ${scopeWords.length} 張可用字卡`}</p>
      {lv1ReviewedGroups.filter(unit=>unit.templateId===g.templateId).map(unit=><p key={unit.templateId} className="direct-muted"><a href={`${import.meta.env.BASE_URL}${unit.galleryPath}`}>查看這個 Unit 的 {unit.pairCount} 組已審閱圖句{unit.supplements.length > 0 && `（含 ${unit.supplements.length} 個補充詞）`}</a></p>)}
      {scopeWords[0] && <Link className="groups-primary" to={`/word/${scopeWords[0].wordId}?group=${encodeURIComponent(g.id)}`}>依序看字卡</Link>}
      {!!g.itemIds.length && <button className="groups-secondary" disabled={busy} onClick={()=>void practice()}>開始 Unit 內容練習（{g.itemIds.length} 題）</button>}
      {resume && <p><Link to={`/practice/direct?session=${resume.id}`}>繼續上次練習（第 {resume.index+1}／{resume.questionIds.length} 題）</Link><span className="direct-muted"> · 使用上次開練的清單</span></p>}
      {!!scopeWords.length && <div className="groups-play" aria-label="用這個群組練習">
        <Link to={`/quiz?group=${encodeURIComponent(g.id)}`}>單字自由練習</Link>
        <Link to={`/arena/spell-barrage?group=${encodeURIComponent(g.id)}`}>字母轟炸</Link>
        <Link to={`/arena/meaning-karuta?group=${encodeURIComponent(g.id)}`}>搶義花牌</Link>
        <Link to={`/slash?group=${encodeURIComponent(g.id)}`}>千單斬</Link>
      </div>}
    </header>
    {status}
    {editing && <section className="groups-edit" aria-label="編輯群組">
      <form onSubmit={e => {e.preventDefault();void save({...g,name:name.trim()});}}><label>群組名稱<input value={name} maxLength={80} onChange={e => setName(e.target.value)} /></label><button disabled={busy || !name.trim() || name.trim()===g.name}>儲存名稱</button></form>
    </section>}
    {!!g.wordIds?.length && <>
      <h2>字卡</h2>
      <ol className="direct-items">{g.wordIds.map((id,index) => {const word=words?.find(w=>w.wordId===id);return <li key={id}>
        {word ? <Link to={`/word/${id}?group=${encodeURIComponent(g.id)}`}><b>{word.word}</b> <span className="direct-muted">{word.meaningZh}</span></Link> : <span>此字卡目前無法使用</span>}
        {editing && <div className="direct-item-actions"><button disabled={busy || index===0} aria-label={`上移單字第${index+1}項`} onClick={()=>moveWord(index,-1)}>↑</button><button disabled={busy || index===g.wordIds!.length-1} aria-label={`下移單字第${index+1}項`} onClick={()=>moveWord(index,1)}>↓</button><button disabled={busy} aria-label={`移除單字第${index+1}項`} onClick={()=>void save({...g,wordIds:g.wordIds!.filter(x=>x!==id)})}>移除</button></div>}
      </li>;})}</ol>
    </>}
    {!!g.itemIds.length && <>
      <h2>教材項目</h2>
      <ol className="direct-items">{g.itemIds.map((id,index) => {const item=learningItems.find(i=>i.learningItemId===id);return <li key={id}>
        <details><summary>{item?.displayWord ?? item?.pattern ?? '項目待更新'} <span>{item?.targetMeaningZh}</span></summary>
          {item?.kind === 'grammar' ? <p>{item.explanationZh}</p> : <><p>教材收錄義：{item?.chapterMeaningsZh}</p><p>本題練習義：{item?.targetMeaningZh}</p><p>{item?.originalExample?.sentenceEn}</p><p>{item?.originalExample?.sentenceZh}</p></>}
        </details>
        {editing && <div className="direct-item-actions"><button disabled={busy || index===0} aria-label={`上移第${index+1}項`} onClick={()=>move(index,-1)}>↑</button><button disabled={busy || index===g.itemIds.length-1} aria-label={`下移第${index+1}項`} onClick={()=>move(index,1)}>↓</button><button disabled={busy} aria-label={`移除第${index+1}項`} onClick={()=>void save({...g,itemIds:g.itemIds.filter(x=>x!==id)})}>移除</button></div>}
      </li>;})}</ol>
    </>}
    {!groupSize(g) && <p className="direct-muted">這個群組還是空的。按「編輯」加入單字。</p>}
    {editing && <section className="groups-edit" aria-label="加入學習項目">
      <h2>加入學習項目</h2><label>搜尋單字或文法<input value={query} onChange={e=>setQuery(e.target.value)} /></label>
      {!!query.trim() && <>{(words ?? []).filter(w=>!g.wordIds?.includes(w.wordId) && `${w.word} ${w.meaningZh}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0,30).map(w=><div className="direct-option-row" key={w.wordId}><span>{w.word} {w.meaningZh}</span><button disabled={busy} onClick={()=>void save({...g,wordIds:[...(g.wordIds ?? []),w.wordId]})}>加入字卡</button></div>)}</>}
      <p className="direct-muted">另可加入已審核的教材單字與文法練習。</p>
      {available.slice(0,30).map(i=><div className="direct-option-row" key={i.learningItemId}><span>{i.displayWord ?? i.pattern} {i.targetMeaningZh}</span><button disabled={busy} onClick={()=>void save({...g,itemIds:[...g.itemIds,i.learningItemId]})}>加入</button></div>)}
      {available.length>30 && <p>另有 {available.length-30} 項，請輸入關鍵字縮小範圍。</p>}
      <button className="group-delete" disabled={busy} onClick={()=>void remove()}>刪除此群組</button>
    </section>}
  </div>;

  return <div className="direct-page groups-page"><nav><Link to="/modes/words?src=group">← 單字</Link><Link to="/textbook">選單元</Link></nav>
    <h1>我的群組</h1><p className="direct-muted">把要一起學的字收在一起：看字卡、做題目、玩遊戲都能只用這些字。</p>
    {status}
    {groups && groups.length > 0 && <GroupPicker groups={groups} words={words??[]} value={selected} disabled={busy} label="選一個群組" onChange={id=>open(id)} />}
    <details className="group-create" open={params.get('create')==='1' || groups?.length===0}><summary>建立新群組</summary>
      {unitScope && <section aria-label="從單元建立">
        <h2>從單元建立</h2>
        <p className="direct-muted">點一個單元，就把它整個收成群組。已經建過的單元會直接開啟，不會重複。</p>
        <ScopePicker scope={unitScope} onChange={setUnitScope} />
        <UnitTiles units={unitsFor(unitScope)} onSelect={u=>void addUnit(u)} detail={u=>u.partial?`${u.wordIds.length} 張字卡 · 部分內容`:`${u.count} 個詞彙`} />
        {unitsFor(unitScope).some(u=>u.partial) && <button disabled={busy || !words || !groups} onClick={()=>void addAllReviewed()}>LV1 已審閱單元全部建立（{lv1ReviewedGroups.length} 個）</button>}
      </section>}
      <h2>匯入單字表</h2>
      <GroupImportPanel words={words} groups={groups ?? []} onSaved={group => open(group.id)} />
      <h2>空白群組</h2>
      <button disabled={busy} onClick={() => void save({...templateGroup(),name:'我的群組',itemIds:[],templateId:null,templateRevision:null})}>建立空白群組</button>
    </details>
  </div>;
}
