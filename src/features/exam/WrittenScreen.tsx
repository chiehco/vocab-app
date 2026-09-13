import GsatYearSelector from './GsatYearSelector';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../db/progressDb';
import { contentDb } from '../../db/contentDb';
import { downloadProgressBackup, exportProgress } from '../../backup/backup';
import { lookupWord } from '../direct/lookup';
import { mixedPassage, wordCount, writtenGroups, writtenQuestions, WRITTEN_REVISION } from './writtenModel';
import { assessWritten, editWritten, startWritten, submitWritten } from './writtenStore';
import mixedImage from './assets/gsat115-mixed.png';
import essayImage from './assets/gsat115-essay.png';
import rubricPdf from './assets/gsat115-rubric.pdf';
import '../direct/direct.css';
import './gsat.css';
import { examArchive, originalImages, yearMetadata, examAsset } from './archive';
import { gsatYears } from './gsatStore';
import OriginalPages from './OriginalPages';

export default function WrittenScreen(){
  const [params,setParams]=useSearchParams();const id=params.get('session');
  const data=useLiveQuery(async()=>({session:id?await progressDb.writtenSessions.get(id):undefined,
    sessions:await progressDb.writtenSessions.orderBy('updatedAt').reverse().toArray(),submissions:await progressDb.writtenSubmissions.toArray(),words:await contentDb.words.toArray()}),[id]);
  const [busy,setBusy]=useState(false),[pending,setPending]=useState(0),[error,setError]=useState(''),[saveError,setSaveError]=useState(false),[blank,setBlank]=useState(false);
  const [imageReady,setImageReady]=useState<Record<string,boolean>>({});
  const lock=useRef(false),writes=useRef(0),dialog=useRef<HTMLDialogElement>(null);
  const [meaning,setMeaning]=useState<ReturnType<typeof lookupWord>>();
  const s=data?.session,g=writtenGroups.find(g=>g.id===s?.groupId);
  const year=g?.year??(gsatYears.includes(params.get('year')??'')?params.get('year')!:'115');
  const yearQuestions=writtenQuestions.filter(q=>q.question_id.startsWith(`gsat-${year}-`));
  const original=originalImages(year,g?.sourcePages);
  const originalMissing=original.some(path=>!imageReady[path]);
  const newPassage=examArchive.writtenPassages.find(p=>p.passage_id===g?.passageId);
  const qs=writtenQuestions.filter(q=>g?.ids.includes(q.question_id));
  const rows=data?.submissions.filter(a=>a.sessionId===s?.id)??[];
  const submitted=rows.length>0,valid=s?.revision===WRITTEN_REVISION;
  const image=g?.id==='mixed'?mixedImage:g?.id==='essay'?essayImage:undefined;
  const first=data?.submissions.filter(a=>a.firstAttempt&&a.questionId.startsWith(`gsat-${year}-`))??[];
  async function act(fn:()=>Promise<unknown>){if(lock.current||writes.current)return;lock.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'操作失敗，請重試。');}finally{lock.current=false;setBusy(false);}}
  async function start(groupId:string){const next=await startWritten(groupId);setBlank(false);setSaveError(false);setParams({year,session:next.id});}
  function saveText(questionId:string,answer:string){
    if(!s)return;writes.current++;setPending(writes.current);setSaveError(false);
    void editWritten(s.id,{questionId,answer}).catch(()=>{setSaveError(true);setError('未能保存文字，請修改或重新輸入後再提交。');}).finally(()=>{writes.current--;setPending(writes.current);});
  }
  function lookup(word:string){void act(async()=>{if(s&&!submitted)await editWritten(s.id,{lookup:word});setMeaning(lookupWord(word,data?.words));dialog.current?.showModal();});}
  function words(text:string){return text.split(/(\{\{\d+\}\}|[A-Za-z]+(?:[’'][A-Za-z]+)?)/g).map((t,i)=>t.startsWith('{{')?<strong key={i}>{t.replace('{{','（').replace('}}','）____')}</strong>:/^[A-Za-z]/.test(t)?<button disabled={busy||pending>0} key={i} className="direct-word" aria-label={`查字：${t}`} onClick={()=>lookup(t)}>{t}</button>:t);}
  function scores(q:typeof writtenQuestions[number]){return Array.from({length:q.points*(q.question_type==='translation'?2:1)+1},(_,i)=>i/(q.question_type==='translation'?2:1));}
  return <div className="direct-page gsat-page">
    <nav><Link to={`/exam/papers?year=${year}`}>← 單選題</Link><Link to={`/exam/written?year=${year}`}>非選題目與紀錄</Link></nav>
    <p className="direct-kicker">GSAT / {year}</p><h1>{g?.title??'混合題・翻譯・作文'}</h1>
    <p className="direct-muted">保存原答，提交後對照官方參考，自評或待老師確認。自評不等於官方閱卷分數，不改變複習排程。</p>
    {Number(year)<110&&<p className="direct-muted">此為106–109年舊題區，供補充練習；目前主要準備範圍為110–115年。</p>}
    {error&&<p role="alert">{error}</p>}
    {!data?<p>讀取進度中…</p>:!id?<>
      <GsatYearSelector year={year} onChange={next=>{setError('');setParams({year:next});}}/>
      {writtenGroups.filter(group=>group.year===year).map(group=><section key={group.id}><h2>{group.title}</h2><button disabled={busy} onClick={()=>void act(()=>start(group.id))}>開始{group.title}</button>{data.sessions.filter(s=>s.groupId===group.id).map(session=><p key={session.id}><button disabled={busy} onClick={()=>{setBlank(false);setParams({year,session:session.id});}}>{data.submissions.some(a=>a.sessionId===session.id)?'查看原答與自評':'繼續草稿'} · {new Date(session.createdAt).toLocaleString('zh-TW')}</button></p>)}</section>)}
      <p>首次已提交 {first.length} 題：客觀多選 {first.filter(a=>a.autoScore!==undefined).length} 題、自評 {first.filter(a=>a.autoScore===undefined&&a.assessments.at(-1)?.score!=null).length} 題、待確認 {first.filter(a=>a.autoScore===undefined&&a.assessments.at(-1)?.score==null).length} 題。</p>
    </>:!valid||!g?<p>找不到可續寫的紀錄，請返回題目清單。</p>:<>
      {original.length>0&&<OriginalPages images={original} onReady={(path,ready)=>setImageReady(v=>({...v,[path]:ready}))}/>}
      {newPassage&&<article aria-label="混合題文章" className="gsat-passage">{newPassage.text.split('\n\n').map((p,i)=><p key={i}>{words(p)}</p>)}</article>}
      {g.id==='mixed'&&<article aria-label="混合題文章" className="gsat-passage">{mixedPassage.text.split('\n\n').map((p,i)=><p key={i}>{words(p)}</p>)}</article>}
      {g.id==='mixed'&&<img className="gsat-map" src={image} alt="官方原卷：Wonder Village街區圖" onLoad={()=>setImageReady(v=>({...v,[image!]:true}))} onError={()=>setImageReady(v=>({...v,[image!]:false}))}/>}
      {qs.map(q=>{const a=rows.find(a=>a.questionId===q.question_id),firstAnswer=first.find(a=>a.questionId===q.question_id);return <section className="gsat-question" key={`${s.id}:${q.question_id}`} aria-label={q.number?`第 ${q.number} 題`:'寫作題'}>
        <h2>{q.number?`第 ${q.number} 題` : g.title} · {q.points} 分</h2>
        {q.instruction&&<p>{q.instruction}</p>}
        <p className="direct-stem">{words(q.stem)}</p>
        {q.question_type==='essay'&&year==='115'&&<><img className="gsat-map" src={essayImage} alt="官方原卷：寵物與家庭生活作文圖片" onLoad={()=>setImageReady(v=>({...v,[essayImage]:true}))} onError={()=>setImageReady(v=>({...v,[essayImage]:false}))}/><p className="direct-muted">請分兩段、至少120個英文單詞。字數僅供參考，不自動決定評分。</p></>}
        {q.number===49?<div role="group" aria-label="第49題多選選項">{Object.entries(q.options!).map(([key,value])=><label className="written-check" key={key}><input type="checkbox" checked={(s.answers[q.question_id]??'').includes(key)} disabled={busy||pending>0||submitted} onChange={e=>void act(()=>editWritten(s.id,{questionId:q.question_id,answer:e.target.checked?[...(s.answers[q.question_id]??''),key].sort().join(''):(s.answers[q.question_id]??'').replace(key,'')}))}/>{key} · {value}</label>)}</div>:
          <label>你的答案<textarea aria-label={`作答：${q.question_id}`} defaultValue={s.answers[q.question_id]??''} disabled={busy||submitted} rows={q.question_type==='essay'?12:q.question_type==='translation'?4:2} maxLength={20000} autoComplete="off" spellCheck={false} onChange={e=>saveText(q.question_id,e.target.value)}/></label>}
        {q.question_type==='essay'&&<p>英文單詞參考數：{wordCount(s.answers[q.question_id]??'')}</p>}
        {submitted&&a&&<div className="direct-result" aria-label={`回饋：${q.question_id}`}><p>提交原答：{a.rawAnswer||'（空白）'}</p><p className="direct-muted">{a.lookedUpWords.length?'提交前曾查字':'提交前未查字'} · {a.firstAttempt?'首次作答':'重練，首次原答另行保留'}</p>
          {q.number===49?<><h3>客觀多選得分：{Number(a.autoScore!.toFixed(2))} / {q.points}</h3><p>正確選項：{(q.answerKey??'ADE').split('').join('、')}。</p><p>{q.rubricText??'錯選或漏選1項得8/3分，2項得4/3分，3項以上或空白為0分；畫面小數為近似值。'}</p><p>{q.explanationZh}</p></>:
          <><h3>{q.referenceLabel??'官方參考與評分規準'}</h3>{(q.referenceText??q.answer.official)&&<p>{q.referenceText??q.answer.official}</p>}
            <p>{q.rubricText??(q.question_type==='translation'?'這是官方參考的一種完整表達，並非唯一譯法。每題4分，每錯原則扣0.5分；相同拼字或文法錯誤只扣一次，句首大寫與標點亦有扣分規定。':q.question_type==='essay'?'作文依內容、組織、文法句構、字彙拼字整體評閱。字數明顯不足或未分段，各扣總分1分。空白、完全離題或抄題等情形可為0分。':'選字與字形均正確2分；字形或拼字錯誤1分；空白、答案錯誤或無關0分。')}</p>
            {q.question_type==='essay'&&<ul><li>內容：是否切題，並有具體細節？</li><li>組織：是否依原題要求安排段落、前後連貫？</li><li>文法句構：是否清楚且適切？</li><li>字彙拼字：用字、拼字及標點是否正確？</li></ul>}
            <label>自評（不是官方成績）<select aria-label={`自評：${q.question_id}`} value={a.assessments.at(-1)?.score??'pending'} disabled={busy||pending>0} onChange={e=>void act(()=>assessWritten(a.id,e.target.value==='pending'?null:Number(e.target.value)))}><option value="pending">待老師確認</option>{scores(q).map(score=><option value={score} key={score}>{score} / {q.points} 分（自評）</option>)}</select></label>
            {a.assessments.length>0&&<details><summary>自評修改紀錄（{a.assessments.length}）</summary>{a.assessments.map(v=><p key={v.at}>{new Date(v.at).toLocaleString('zh-TW')} · {v.score===null?'待老師確認':`${v.score} 分（自評）`}</p>)}</details>}
          </>}
          {!a.firstAttempt&&firstAnswer&&<details><summary>查看首次原答</summary><p>{firstAnswer.rawAnswer||'（空白）'}</p></details>}
        </div>}
      </section>;})}
      {!submitted?<><p role="status">{pending?'正在保存草稿…':saveError?'草稿未保存，請重試。':'草稿已自動保存'}</p><p className="direct-muted">提交前查字會記在本題組。提交後保存原答，再顯示參考內容。</p>
        {qs.some(q=>!s.answers[q.question_id]?.trim())&&<label className="written-check"><input type="checkbox" checked={blank} onChange={e=>setBlank(e.target.checked)}/>確認將未填題目留白提交</label>}
        {(originalMissing||image&&!imageReady[image])&&<p>原卷圖片尚未載入，請連線後重新整理。</p>}
        <button className="direct-primary" disabled={busy||pending>0||saveError||originalMissing||!!image&&!imageReady[image]||!blank&&qs.some(q=>!s.answers[q.question_id]?.trim())} onClick={()=>void act(()=>submitWritten(s.id,blank))}>{g.ids.length>1?`提交整組 ${g.ids.length} 題`:'提交原答'}</button>
      </>:<><p>本輪：客觀多選 {rows.filter(a=>a.autoScore!==undefined).length} 題、自評 {rows.filter(a=>a.autoScore===undefined&&a.assessments.at(-1)?.score!=null).length} 題、待確認 {rows.filter(a=>a.autoScore===undefined&&a.assessments.at(-1)?.score==null).length} 題。待確認不算答錯。</p><button className="direct-primary" disabled={busy} onClick={()=>void act(()=>start(g.id))}>重新練習，保留原答</button></>}
    </>}
    <footer>{first.length===yearQuestions.length&&<p><a href={year==='115'?rubricPdf:examAsset(yearMetadata(year)!.rubricPdf)} target="_blank" rel="noreferrer">查看完整官方非選擇題參考與評分原則（PDF）</a></p>}<button disabled={busy||pending>0} onClick={()=>void act(async()=>downloadProgressBackup(await exportProgress()))}>匯出完整進度備份</button><p className="direct-muted">試題及參考：大考中心 {year} 年學測英文。各題提交後顯示該題參考；全部首次作答完成後提供完整PDF，避免先看到其他題答案。本頁不使用AI批改或評分API。</p></footer>
    <dialog ref={dialog}><h2>{meaning?.word}</h2><p>{meaning?.meaning}</p><p>{meaning?.source}</p><button autoFocus onClick={()=>dialog.current?.close()}>關閉</button></dialog>
  </div>;
}
