import { useRef,useState } from 'react';
import { Link,useNavigate,useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { groupSize } from '../direct/groupFilter';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import ResilientBeastImage from '../wordbeast/ResilientBeastImage';
import { ScopePicker } from '../../components/ScopePicker';
import { availableTracks,publisherName,resolveTextbookScope,textbookUnits,trackInfo,unitsFor,unitTitle,type TextbookScope,type TextbookTrack } from '../vocabulary/textbookCatalog';
import { saveWordList,workspaceWords,sortWorkspaceWords } from './wordLists';
import './words-workspace.css';

type Source='all'|TextbookTrack|'group';
const LEVELS=['all','LV1','LV2','LV3','LV4','LV5','LV6'];

/**
 * 單字工作區（2026-10-07 改版）：上方切換來源——全部單字（官方 LV 分級）、7000 單／課本（出版社→等級→單元）、
 * 我的群組；下方是同一份單字卡格。舊網址 ?group= 與 ?level= 照舊可用。
 */
export default function WordsWorkspace(){
  const [params,setParams]=useSearchParams(),navigate=useNavigate();
  const words=useLiveQuery(()=>contentDb.words.toArray()),groups=useLiveQuery(()=>progressDb.customGroups.orderBy('updatedAt').reverse().toArray()),priorities=useLiveQuery(()=>contentDb.examPriorities.toArray());
  const tracks=availableTracks();
  const requested=params.get('src');
  const source:Source=requested==='group'||(!requested&&params.get('group'))?'group':tracks.some(t=>t.id===requested)?requested as TextbookTrack:'all';
  const query=params.get('q')??'',sort=params.get('sort')==='alpha'?'alpha':'exam';
  const [limit,setLimit]=useState(30),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false);

  // 全部單字：官方 LV；7000 單／課本：出版社→等級→單元；群組：群組 id
  const level=source==='all'&&LEVELS.includes(params.get('level')??'')?params.get('level')!:'all';
  const scope=source==='7000'||source==='textbook'?resolveTextbookScope({track:source,publisher:params.get('pub'),volume:params.get('level')}):undefined;
  const trackUnits=scope?unitsFor(scope):[];
  const unit=trackUnits.find(u=>u.unit===Number(params.get('unit')));
  const groupId=source==='group'?params.get('group')||groups?.[0]?.id||'':'';
  const group=groups?.find(g=>g.id===groupId);

  const pool=scope?{id:'',name:'',itemIds:[],wordIds:[...new Set((unit?[unit]:trackUnits).flatMap(u=>u.wordIds))],templateId:null,templateRevision:null,updatedAt:0}:group;
  const available=source==='group'&&!group?[]:workspaceWords(words??[],pool,level,query);
  const matches=sort==='exam'?sortWorkspaceWords(available,priorities??[]):[...available].sort((a,b)=>a.word.localeCompare(b.word,'en'));
  const title=scope?`${publisherName(scope.publisher)} ${scope.volume}${unit?` ${unitTitle(unit)}`:''}`:source==='group'?group?.name??(groupId?'群組已不存在':'選一個群組'):`全部單字${level==='all'?'':` · ${level}`}`;

  function update(changes:Record<string,string>){
    const next=new URLSearchParams(params);
    for(const [key,value] of Object.entries(changes)){if(value)next.set(key,value);else next.delete(key);}
    setParams(next,{replace:true});setLimit(30);setError('');
  }
  function chooseSource(next:Source){update({src:next==='all'?'':next,level:'',pub:'',unit:'',group:next==='group'?groups?.[0]?.id??'':''});}
  function chooseScope(next:TextbookScope){update({level:next.volume,pub:next.publisher==='ivy'?'':next.publisher,unit:''});}
  async function openList(practice:boolean,startId?:string){if(lock.current||!matches.length)return;lock.current=true;setBusy(true);setError('');try{
    const list=await saveWordList(matches,title,`/modes/words?${params.toString()}`);
    navigate(practice?`/quiz?list=${list.id}`:`/word/${startId??matches[0].wordId}?list=${list.id}`);
  }catch{setError('無法開始，請重試。');}finally{lock.current=false;setBusy(false);}}

  const sources:{id:Source;label:string}[]=[{id:'all',label:'全部單字'},...tracks.map(t=>({id:t.id,label:t.label})),{id:'group',label:'我的群組'}];
  return <div className="words-workspace">
    <header className="words-top"><Link to="/" aria-label="回首頁">萬詞譜</Link><h1>單字</h1><Link to="/review?due=1">今日複習</Link></header>
    <div className="scope-segment words-sources" role="group" aria-label="單字來源">{sources.map(s=><button type="button" key={s.id} aria-pressed={source===s.id} onClick={()=>chooseSource(s.id)}>{s.label}</button>)}</div>

    <section className="words-filters" aria-label="篩選">
      {source==='all'&&<div className="level-tabs words-levels" role="group" aria-label="官方詞表等級">{LEVELS.map(l=><button key={l} aria-pressed={level===l} onClick={()=>update({level:l==='all'?'':l})}>{l==='all'?'全部':l}</button>)}</div>}
      {scope&&<>
        <ScopePicker scope={scope} units={textbookUnits.filter(u=>u.track===scope.track)} onChange={chooseScope}/>
        <div className="scope-layer"><span className="scope-label" id="words-unit">{trackInfo(scope.track).unitLabel}</span>
          <div className="scope-chips words-chip-row" role="group" aria-labelledby="words-unit">
            <button type="button" aria-pressed={!unit} onClick={()=>update({unit:''})}>全部</button>
            {trackUnits.map(u=><button type="button" key={u.unit} aria-pressed={unit?.unit===u.unit} onClick={()=>update({unit:String(u.unit)})}>{unitTitle(u)}</button>)}
          </div></div>
      </>}
      {source==='group'&&(!groups?<p className="words-muted">正在讀取群組…</p>:groups.length===0?<div className="words-empty"><h3>建立你的第一個群組</h3><p>把要考的字收在一起，看字卡、做題目、玩遊戲都能只用這些字。</p><Link className="words-cta" to="/groups?create=1">建立群組</Link></div>:<>
        <div className="scope-chips words-chip-row" role="group" aria-label="選擇群組">{groups.map(g=><button type="button" key={g.id} aria-pressed={groupId===g.id} title={g.name} onClick={()=>update({group:g.id})}>{g.name}<small>{groupSize(g)}</small></button>)}</div>
        <p className="words-group-links"><Link to="/groups?create=1">＋ 新增群組</Link><Link to={group?`/groups?group=${encodeURIComponent(group.id)}`:'/groups'}>{group?'編輯這個群組':'管理群組'}</Link></p>
      </>)}
    </section>

    {!(source==='group'&&groups?.length===0)&&<section className="words-summary" aria-label="目前範圍">
      <div className="words-summary-head"><div><h2>{title}</h2><span aria-live="polite">{matches.length} 個單字</span></div>
        <select aria-label="單字排序" value={sort} onChange={e=>update({sort:e.target.value==='alpha'?'alpha':''})}><option value="exam">學測優先</option><option value="alpha">字母排序</option></select></div>
      <div className="words-actions"><button disabled={busy||!matches.length} onClick={()=>void openList(false)}>看字卡</button><button disabled={busy||!matches.length} onClick={()=>void openList(true)}>做題目</button></div>
    </section>}
    {!!group?.itemIds.length&&<p className="words-muted">顯示可用的原字卡。<Link to={`/groups?group=${encodeURIComponent(group.id)}`}>教材義項與文法 →</Link></p>}
    {error&&<p role="alert">{error}</p>}
    <label className="words-search"><input aria-label="搜尋目前單字" type="search" value={query} placeholder="搜尋英文或中文意思" onChange={e=>update({q:e.target.value})}/></label>

    {!words||!groups?<p className="words-muted">載入字卡中…</p>:source==='group'&&groups.length===0?null:matches.length===0?<div className="words-empty"><h3>目前沒有單字</h3><p>{groupId&&!group?'這個群組可能已刪除，請重新選擇。':'換個範圍或搜尋詞試試。'}</p></div>
      :<ul className="words-list">{matches.slice(0,limit).map(w=>{const src=getWordBeastAsset(w.wordId,w.word,w.imageWordId);return <li key={w.wordId}><button disabled={busy} onClick={()=>void openList(false,w.wordId)}>
        <span className="words-thumb">{src?<ResilientBeastImage src={src} word={w.word} alt="" loading="lazy"/>:<b aria-hidden="true">{w.word[0].toUpperCase()}</b>}</span>
        <span className="words-copy"><strong>{w.word}</strong><span>{w.meaningZh}</span><small>{w.level}</small></span></button></li>;})}</ul>}
    {matches.length>limit&&<button className="words-more" onClick={()=>setLimit(limit+30)}>再顯示 {Math.min(30,matches.length-limit)} 個</button>}
    <footer className="words-tools"><Link to="/textbook">選單元</Link><Link to={`/units?level=${level==='all'?'LV1':level}&order=${sort==='alpha'?'alphabet':'exam'}`}>官方詞表每 30 字分組</Link><Link to="/placement">程度測驗</Link></footer>
  </div>;
}
