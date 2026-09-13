import { useState } from 'react';
import type { CustomGroup } from './model';
import type { WordRecord } from '../../db/types';
import { filterGroups, groupPreview, groupSize, type GroupKind, type GroupOrder } from './groupFilter';

export default function GroupPicker({groups,words,value,onChange,disabled=false,label='選擇群組'}:{groups:CustomGroup[];words:WordRecord[];value:string;onChange:(id:string)=>void;disabled?:boolean;label?:string}) {
  const [query,setQuery]=useState(''),[kind,setKind]=useState<GroupKind>('all'),[order,setOrder]=useState<GroupOrder>('recent'),[page,setPage]=useState(0);
  const matches=filterGroups(groups,words,query,kind,order);
  const pages=Math.max(1,Math.ceil(matches.length/10)),current=Math.min(page,pages-1);
  const selected=groups.find(g=>g.id===value);
  return <section className="group-picker" aria-label={label}>
    <h2>{label}</h2>
    <label>搜尋群組<input type="search" value={query} disabled={disabled} placeholder="群組名稱、LV 或內含單字" onChange={e=>{setQuery(e.target.value);setPage(0);}} /></label>
    <div className="group-picker-filters">
      <label>群組類型<select value={kind} disabled={disabled} onChange={e=>{setKind(e.target.value as GroupKind);setPage(0);}}><option value="all">全部類型</option><option value="cards">含原字卡</option><option value="curriculum">含教材內容</option><option value="empty">空白群組</option></select></label>
      <label>群組排序<select value={order} disabled={disabled} onChange={e=>{setOrder(e.target.value as GroupOrder);setPage(0);}}><option value="recent">最近更新</option><option value="name">名稱 A–Z</option></select></label>
    </div>
    <p className="direct-muted" aria-live="polite">符合 {matches.length}／共 {groups.length} 組{selected && ` · 已選：${selected.name}`}</p>
    {!groups.length ? <p>還沒有群組，可在下方建立或匯入。</p> : !matches.length ? <p>沒有符合的群組，請更換關鍵字或類型。</p> : <ul className="group-picker-list">{matches.slice(current*10,current*10+10).map(g=>{
      const same=groups.filter(x=>x.name===g.name).sort((a,b)=>a.id.localeCompare(b.id));
      return <li key={g.id}><button type="button" disabled={disabled} aria-pressed={value===g.id} onClick={()=>onChange(g.id)}>
        <strong>{g.name}{same.length>1 && `（同名 ${same.findIndex(x=>x.id===g.id)+1}）`}</strong>
        <span>{groupSize(g)} 項 · 更新 {new Date(g.updatedAt).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
        <small>{groupPreview(g,words) || '空白群組'}</small>
      </button></li>;
    })}</ul>}
    {pages>1 && <nav aria-label="群組分頁"><button type="button" disabled={disabled||current===0} onClick={()=>setPage(current-1)}>上一頁群組</button><span>{current+1}／{pages}</span><button type="button" disabled={disabled||current===pages-1} onClick={()=>setPage(current+1)}>下一頁群組</button></nav>}
  </section>;
}
