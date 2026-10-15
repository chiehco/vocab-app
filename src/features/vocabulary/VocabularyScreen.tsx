import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SpeakerButton from '../../components/SpeakerButton';
import { curriculumUnits, findUnit, templateGroup, unitsForLevel } from '../direct/model';
import { saveGroup, startScopeSession } from '../direct/store';
import { reviewedExample, practiceIds } from './model';
import '../direct/direct.css';
import './vocabulary.css';
import { useStudyBookmark } from '../modes/useStudyBookmark';
import { textbookLevels, textbookPath } from './textbookCatalog';
import { isUnitPublished, unitReleaseHold } from './unitReleasePolicy';

const LEVELS = textbookLevels.filter(level => level !== 'LV1');
const ASSET_BASE = import.meta.env.BASE_URL;

export default function VocabularyScreen(){
  const [params,setParams]=useSearchParams(),navigate=useNavigate();
  const level=LEVELS.includes(params.get('level')??'')?params.get('level')!:'LV3';
  const levelUnits=unitsForLevel(level).filter(u=>isUnitPublished(u.level,u.unit));
  const requestedUnit=Number.parseInt(params.get('unit')??'',10);
  const hold=unitReleaseHold(level,requestedUnit);
  const current=hold?undefined:findUnit(requestedUnit,level)??levelUnits[0];
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
  const saveFailed = useStudyBookmark(item && current ? {
    href: `/vocabulary?${new URLSearchParams({level,unit:String(unit),kind,item:item.learningItemId})}`,
    title: current.name, position: items.findIndex(i => i.learningItemId===item.learningItemId)+1, total: items.length,
  } : undefined);
  const usageLabel=level==='LV3'?'文法與搭配':'用法與搭配';
  const textOnly=current?.deliveryMode==='text_only';
  function choose(values:Record<string,string>){setError('');setParams({unit:String(unit),...values});}
  function show(id:string){choose({level,kind,item:id});}
  async function practice(){if(busy||!item||!current)return;setBusy(true);setError('');try{
    const scope=practiceIds(items);
    const s=await startScopeSession(scope,`${current.name} · ${kind==='grammar'?usageLabel:'詞彙'}自由練習`);
    navigate(`/practice/direct?session=${s.id}`);
  }catch{setError('無法開始練習，請重試。');}finally{setBusy(false);}}
  async function createGroup(){if(busy||!current)return;setBusy(true);setError('');try{const g=templateGroup(current.templateId);await saveGroup(g);navigate(`/groups?group=${g.id}`);}catch{setError('群組未能保存，請重試。');}finally{setBusy(false);}}
  return <div className="direct-page vocab-page">
    <nav><Link to={hold?`/textbook?level=${level}`:textbookPath(level,unit)}>← 課本單元</Link><Link to="/">首頁</Link></nav>
    <p className="direct-kicker">單字模式 · 教材</p><h1>教材字卡</h1>
    <p className="direct-muted">直接看字卡、中文意思與例句，再依需要自由練習。</p>
    <div className="level-tabs vocab-levels" aria-label="選擇等級">{LEVELS.map(l=><button key={l} aria-pressed={level===l} onClick={()=>{setQuery('');choose({level:l});}}>{l}</button>)}</div>
    {hold?<section aria-label="來源待補"><h2>來源待補</h2><p role="status">{hold.message}</p><Link className="direct-primary" to={`/textbook?level=${level}`}>返回選單元</Link></section>:!current?<section><h2>{level} 教材內容整理中</h2><p>單元、完整義項與原創例句核對完成後開放。</p><button onClick={()=>{const first=curriculumUnits[0];choose({level:first.level,unit:String(first.unit)});}}>先看 {curriculumUnits[0].name}</button></section>:<>
      <label>教材單元<select aria-label="教材單元" value={unit} onChange={e=>{setQuery('');choose({level,unit:e.target.value});}}>{levelUnits.map(u=><option key={u.templateId} value={u.unit}>Unit {u.unit}</option>)}</select></label>
      <h2>{current.name}</h2><p className="direct-muted">已核對 {vocabCount} 個詞彙、{grammarCount} 項{usageLabel}。{levelUnits.length<2?'其他 Unit 整理中。':''}</p>
      {textOnly&&<p className="direct-muted">文字教材：主詞與延伸詞依教材順序；相關補充詞另列，保留來源頁碼。例句與教材題目整理中。</p>}
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
            {(item.meaningSource==='existing_dictionary'||level==='LV6'&&item.meaningSource==='textbook_transcription'&&item.sourceRole==='printed_related_word')&&<p className="direct-muted">教材相關補充詞 · {item.meaningSource==='existing_dictionary'?'這裡顯示既有一般字義':'教材收錄義'}{item.printedLabel&&` · 書上標記：${item.printedLabel}`}</p>}
            {!item.officialWordId&&textOnly&&<p className="direct-muted">教材補充詞，尚未連到一般字卡。</p>}
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
        {practiceIds(items).length>0?<><button className="direct-primary" disabled={busy} onClick={()=>void practice()}>做題目（整單元 {practiceIds(items).length} 題）</button>
        <p className="direct-muted">範圍涵蓋本單元全部{kind==='grammar'?usageLabel:'詞彙'}，不受目前字卡或搜尋影響；未練過的優先。可隨時離開續答。</p></>:<Link className="direct-primary" to={textbookPath(level,unit)}>回單元頁做一般單字練習</Link>}
      </>:<p role="status">找不到符合的項目，請換個關鍵字。</p>}
      <footer><button disabled={busy} onClick={()=>void createGroup()}>以完整 Unit 建立我的群組（{curriculumItems.length} 項）</button><p className="direct-muted">建立後可改名、增刪與排序。</p></footer>
    </>}
    {error&&<p role="alert">{error}</p>}
    {saveFailed&&<p role="alert">學習位置尚未保存，請確認儲存空間後重新整理。</p>}
  </div>;
}
