import { useRef,useState } from 'react';
import { Link,useNavigate,useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { filterGroups,groupSize } from '../direct/groupFilter';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import ResilientBeastImage from '../wordbeast/ResilientBeastImage';
import { saveWordList,workspaceWords,sortWorkspaceWords } from './wordLists';
import { curriculumUnits } from '../direct/model';
import './words-workspace.css';

export default function WordsWorkspace(){
  const [params,setParams]=useSearchParams(),navigate=useNavigate();
  const words=useLiveQuery(()=>contentDb.words.toArray()),groups=useLiveQuery(()=>progressDb.customGroups.orderBy('updatedAt').reverse().toArray()),priorities=useLiveQuery(()=>contentDb.examPriorities.toArray());
  const groupId=params.get('group')??'',level=/^LV[1-6]$/.test(params.get('level')??'')?params.get('level')!:'all',query=params.get('q')??'',sort=params.get('sort')==='alpha'?'alpha':'exam';
  const group=groups?.find(g=>g.id===groupId);
  const [groupSearch,setGroupSearch]=useState(''),[groupLimit,setGroupLimit]=useState(20),[limit,setLimit]=useState(30),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),panel=useRef<HTMLDivElement>(null);
  const available=groupId&&!group?[]:workspaceWords(words??[],group,level,query);
  const matches=sort==='exam'?sortWorkspaceWords(available,priorities??[]):[...available].sort((a,b)=>a.word.localeCompare(b.word,'en'));
  const filteredGroups=filterGroups(groups??[],words??[],groupSearch,'all','recent',level);
  const title=group?.name??(groupId?'群組已不存在':'全部單字');
  const latestUnit=curriculumUnits[curriculumUnits.length-1];
  function choose(key:string,value:string){const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);setParams(next,{replace:true});setLimit(30);setError('');panel.current?.scrollTo({top:0});}
  async function openList(practice:boolean,startId?:string){if(lock.current||!matches.length)return;lock.current=true;setBusy(true);setError('');try{
    const list=await saveWordList(matches,`${title}${level==='all'?'':` · ${level}`}`,`/modes/words?${params.toString()}`);
    navigate(practice?`/quiz?list=${list.id}`:`/word/${startId??matches[0].wordId}?list=${list.id}`);
  }catch{setError('無法開始，請重試。');}finally{lock.current=false;setBusy(false);}}
  return <div className="words-workspace">
    <header className="words-top"><Link to="/" aria-label="回首頁">萬詞譜</Link><h1>單字</h1><Link to="/review">到期複習</Link></header>
    <nav className="level-tabs words-levels" aria-label="單字等級">{['all','LV1','LV2','LV3','LV4','LV5','LV6'].map(l=><button key={l} aria-pressed={level===l} onClick={()=>choose('level',l)}>{l==='all'?'全部':l}</button>)}</nav>
    <div className="words-columns">
      <aside className="words-sidebar" aria-label="自建群組列表">
        <label className="words-group-search"><span>我的群組</span><input aria-label="搜尋側欄群組" type="search" placeholder="找群組" value={groupSearch} onChange={e=>{setGroupSearch(e.target.value);setGroupLimit(20);}}/></label>
        <button className="words-group" aria-pressed={!groupId} onClick={()=>choose('group','')}><span>全部單字</span><small>{words?.length??0} 字</small></button>
        {filteredGroups.slice(0,groupLimit).map(g=>{const same=(groups??[]).filter(x=>x.name===g.name).sort((a,b)=>a.id.localeCompare(b.id));return <button key={g.id} className="words-group" aria-pressed={groupId===g.id} title={g.name} onClick={()=>choose('group',g.id)}><span>{g.name}</span><small>{groupSize(g)} 項{same.length>1&&` · 同名${same.findIndex(x=>x.id===g.id)+1}`}</small></button>;})}
        {!filteredGroups.length&&<p className="words-side-empty">{!groups?.length?'尚無群組':groupSearch?'查無群組':level==='all'?'查無群組':`${level} 尚無群組`}</p>}
        {filteredGroups.length>groupLimit&&<button className="words-more-groups" onClick={()=>setGroupLimit(groupLimit+20)}>更多群組</button>}
        <Link className="words-add" to="/groups?create=1">＋ 新增群組</Link>
        <Link className="words-manage" to="/groups?create=1">加入 LV1 Unit 01–15 群組</Link>
        <Link className="words-manage" to="/groups">管理群組</Link>
      </aside>
      <div className="words-content" ref={panel}>
        <div className="words-context"><h2>{title}</h2>{group&&<details><summary aria-label="群組管理選單">⋯</summary><div><Link to={`/groups?group=${encodeURIComponent(group.id)}`}>重新命名／刪除</Link><Link to={`/groups?group=${encodeURIComponent(group.id)}&create=1`}>匯入單字</Link></div></details>}</div>
        <label className="words-search"><input aria-label="搜尋目前單字" type="search" value={query} placeholder="英文或中文意思" onChange={e=>choose('q',e.target.value)}/></label>
        <div className="words-result"><span aria-live="polite">{level==='all'?'全部等級':level} · {matches.length} 字</span><select aria-label="單字排序" value={sort} onChange={e=>choose('sort',e.target.value)}><option value="exam">學測優先</option><option value="alpha">字母排序</option></select></div>
        <div className="words-actions"><button disabled={busy||!matches.length} onClick={()=>void openList(false)}>開始學習</button><button disabled={busy||!matches.length} onClick={()=>void openList(true)}>練習</button></div>
        {!!group?.itemIds.length&&<p className="words-support">顯示可用的原字卡。<Link to={`/groups?group=${encodeURIComponent(group.id)}`}>教材義項與文法 →</Link></p>}
        {error&&<p role="alert">{error}</p>}
        {!words||!groups?<p>載入字卡中…</p>:matches.length===0?<div className="words-empty"><h3>目前沒有單字</h3><p>{groupId&&!group?'這個群組可能已刪除，請從左側重新選擇。':'換個等級、群組或搜尋詞試試。'}</p></div>:<ul className="words-list">{matches.slice(0,limit).map(w=>{const src=getWordBeastAsset(w.wordId,w.word,w.imageWordId);return <li key={w.wordId}><button disabled={busy} onClick={()=>void openList(false,w.wordId)}><span className="words-thumb">{src?<ResilientBeastImage src={src} word={w.word} alt=""/>:w.word[0].toUpperCase()}</span><span className="words-copy"><strong>{w.word}</strong><span>{w.meaningZh}</span><small>{w.level}</small></span></button></li>;})}</ul>}
        {matches.length>limit&&<button className="words-more" onClick={()=>setLimit(limit+30)}>再顯示 {Math.min(30,matches.length-limit)} 字</button>}
        <footer className="words-tools"><Link to={`/units?level=${level==='all'?'LV1':level}&order=${sort==='alpha'?'alphabet':'exam'}`}>每 30 字分組</Link><Link to={`/vocabulary?level=${latestUnit.level}&unit=${latestUnit.unit}`}>教材字卡 · {curriculumUnits.map(u=>u.name).join('、')}</Link><Link to="/placement">程度測驗</Link></footer>
      </div>
    </div>
  </div>;
}
