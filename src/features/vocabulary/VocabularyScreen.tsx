import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SpeakerButton from '../../components/SpeakerButton';
import { curriculumUnits, findUnit, templateGroup, unitsForLevel } from '../direct/model';
import { saveGroup, startSession } from '../direct/store';
import { reviewedExample, practiceIds } from './model';
import '../direct/direct.css';
import './vocabulary.css';

const LEVELS = ['LV1','LV2','LV3','LV4','LV5','LV6'];
const ASSET_BASE = import.meta.env.BASE_URL;

export default function VocabularyScreen(){
  const [params,setParams]=useSearchParams(),navigate=useNavigate();
  const level=LEVELS.includes(params.get('level')??'')?params.get('level')!:'LV3';
  const levelUnits=unitsForLevel(level);
  const requestedUnit=Number.parseInt(params.get('unit')??'',10);
  const current=findUnit(requestedUnit,level)??levelUnits[0];
  const unit=current?.unit??1;
  const curriculumItems=current?.items??[];
  const vocabCount=curriculumItems.filter(i=>i.kind==='vocabulary').length,grammarCount=curriculumItems.length-vocabCount;
  const kind=params.get('kind')==='grammar'?'grammar':'vocabulary';
  const [query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const items=curriculumItems.filter(i=>i.kind===kind);
  const matches=items.filter(i=>`${i.displayWord??i.pattern} ${i.chapterMeaningsZh??i.explanationZh}`.toLowerCase().includes(query.toLowerCase()));
  const index=Math.max(0,matches.findIndex(i=>i.learningItemId===params.get('item'))),item=matches[index];
  const example=item?reviewedExample(item):undefined;
  const related=item?.displayWord&&current?current.relatedNotes.filter(n=>n.parentWord===item.displayWord):[];
  const usageLabel=level==='LV3'?'文法與搭配':'用法與搭配';
  function choose(values:Record<string,string>){setError('');setParams({unit:String(unit),...values});}
  function show(id:string){choose({level,kind,item:id});}
  async function practice(){if(busy||!item||!current)return;setBusy(true);setError('');try{
    const scope=practiceIds(items),batch=practiceIds(matches.slice(index,index+10));
    const s=await startSession(batch,`${current.name} · ${kind==='grammar'?usageLabel:'詞彙'}自由練習`,undefined,scope);
    navigate(`/practice/direct?session=${s.id}`);
  }catch{setError('無法開始練習，請重試。');}finally{setBusy(false);}}
  async function createGroup(){if(busy||!current)return;setBusy(true);setError('');try{const g=templateGroup(current.templateId);await saveGroup(g);navigate(`/groups?group=${g.id}`);}catch{setError('群組未能保存，請重試。');}finally{setBusy(false);}}
  return <div className="direct-page vocab-page">
    <nav><Link to="/modes/words">← 單字模式</Link><Link to="/groups">我的群組</Link></nav>
    <p className="direct-kicker">單字模式 · 教材</p><h1>教材字卡</h1>
    <p className="direct-muted">直接看字卡、中文意思與例句，再依需要自由練習。</p>
    <div className="vocab-levels" aria-label="選擇等級">{LEVELS.map(l=><button key={l} aria-pressed={level===l} onClick={()=>{setQuery('');choose({level:l});}}>{l}</button>)}</div>
    {!current?<section><h2>{level} 教材內容整理中</h2><p>單元、完整義項與原創例句核對完成後開放。</p><button onClick={()=>{const first=curriculumUnits[0];choose({level:first.level,unit:String(first.unit)});}}>先看 {curriculumUnits[0].name}</button></section>:<>
      <label>教材單元<select aria-label="教材單元" value={unit} onChange={e=>{setQuery('');choose({level,unit:e.target.value});}}>{levelUnits.map(u=><option key={u.templateId} value={u.unit}>Unit {u.unit}</option>)}</select></label>
      <h2>{current.name}</h2><p className="direct-muted">已核對 {vocabCount} 個詞彙、{grammarCount} 項{usageLabel}。{levelUnits.length<2?'其他 Unit 整理中。':''}</p>
      <div className="vocab-levels"><button aria-pressed={kind==='vocabulary'} onClick={()=>{setQuery('');choose({level,kind:'vocabulary'});}}>詞彙字卡（{vocabCount}）</button><button aria-pressed={kind==='grammar'} onClick={()=>{setQuery('');choose({level,kind:'grammar'});}}>{usageLabel}（{grammarCount}）</button></div>
      <details className="vocab-find"><summary>搜尋或跳到指定項目</summary>
        <label>搜尋本類項目<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="輸入英文或中文" /></label>
        {item&&<label>跳到項目<select aria-label="跳到項目" value={item.learningItemId} onChange={e=>show(e.target.value)}>{matches.map((i,n)=><option key={i.learningItemId} value={i.learningItemId}>{n+1}. {i.displayWord??i.pattern}</option>)}</select></label>}
      </details>
      {item?<>
        <article className="vocab-card" aria-label="學習字卡">
          <p className="direct-kicker">{index+1} / {matches.length} · 教材第 {item.sourcePage} 頁</p>
          <h2>{item.displayWord??item.pattern}</h2>
          {item.displayWord&&<SpeakerButton text={item.displayWord}/>}
          {kind==='vocabulary'?<><p className="vocab-meaning">{item.sensePos} {item.chapterMeaningsZh}</p>
            {item.illustration&&<figure className="vocab-illustration">
              <img src={`${ASSET_BASE}${item.illustration.path}`} alt={item.illustration.captionZh} width="768" height="768" loading="eager" decoding="async"/>
              <figcaption><p lang="en">{item.illustration.captionEn}</p><p lang="zh-Hant">{item.illustration.captionZh}</p></figcaption>
            </figure>}
            {example?<><h3>情境例句 · {item.targetMeaningZh}</h3><p className="direct-stem">{example.sentenceEn}</p><p>{example.sentenceZh}</p><SpeakerButton text={example.sentenceEn}/></>:<p>例句待核對。</p>}
            {related.length>0&&<div className="vocab-related"><h3>相關詞</h3><ul>{related.map(n=><li key={`${n.word}:${n.meaningZh}`}><b>{n.word}</b><span>{n.meaningZh}</span></li>)}</ul></div>}
          </>:<><p className="vocab-meaning">{item.explanationZh}</p>
            {example&&<><h3>情境例句</h3><p className="direct-stem">{example.sentenceEn}</p><p>{example.sentenceZh}</p><SpeakerButton text={example.sentenceEn}/></>}
          </>}
        </article>
        <div className="vocab-levels"><button disabled={index===0} onClick={()=>show(matches[index-1].learningItemId)}>上一張</button><button disabled={index===matches.length-1} onClick={()=>show(matches[index+1].learningItemId)}>下一張</button></div>
        <button className="direct-primary" disabled={busy} onClick={()=>void practice()}>從這裡自由練習（{Math.min(10,matches.length-index)} 題）</button>
        <p className="direct-muted">瀏覽字卡不代表已熟悉；練習保留首答，不改變單字複習排程。</p>
      </>:<p role="status">找不到符合的項目，請換個關鍵字。</p>}
      <footer><button disabled={busy} onClick={()=>void createGroup()}>以完整 Unit 建立我的群組（{curriculumItems.length} 項）</button><p className="direct-muted">建立後可改名、增刪與排序。</p></footer>
    </>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
