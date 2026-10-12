import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Grade } from '../../db/types';
import { useToday } from '../../hooks/useToday';
import { useCardPronunciation } from '../../hooks/useCardPronunciation';
import { ReviewFlashcard } from '../review/ReviewScreen';
import { useUpcomingIllustrations } from '../wordbeast/useUpcomingIllustrations';
import { isTownKey, nextTownStudy, pickTownStudy, prepareTownStudyOptions, replanTownStudy, resolveTownStudy, saveTownStudy, townStudyUrl } from './townStudy';
import './town.css';

export default function TownStudyScreen() {
  const {level,unit}=useParams(), town=`${level}/${unit}`;
  const [params]=useSearchParams(), id=params.get('session') ?? '';
  const navigate=useNavigate(), today=useToday();
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), lock=useRef(false);
  const result=useLiveQuery(async()=>{
    try{return {data:await resolveTownStudy(id)};}
    catch(error){return {error:error instanceof Error ? error.message : '日課暫時讀不到，請稍後重試。'};}
  },[id,today]);
  const data=result?.data, round=data?.round, index=round?.index ?? 0, item=data?.queue[index];
  const valid=isTownKey(town) && (!round || round.town===town);
  const binding=data?.scope.bindings.find(binding=>binding.wordId===item?.wordRecord.wordId);
  const townUrl=`/town/${town}${binding ? `?item=${encodeURIComponent(binding.id)}` : ''}`;
  useCardPronunciation(item?.wordRecord.word, `${id}:${index}`);
  useUpcomingIllustrations(data?.queue.map(item=>item.wordRecord),index);
  async function act(action:()=>Promise<unknown>) {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{await action();}catch(error){setError(error instanceof Error?error.message:'暫時無法保存，請再試一次。');}
    finally{lock.current=false;setBusy(false);}
  }
  useEffect(()=>{
    if(valid && round && item && data?.options===undefined)void prepareTownStudyOptions(id,index).catch(error=>setError(error instanceof Error?error.message:'選項暫時讀不到，請重試。'));
  },[valid,round,item,data?.options,id,index]);
  if(!valid)return <div className="town-page"><h1>這輪不屬於目前小鎮</h1><Link to="/">回首頁</Link></div>;
  if(!result)return <div className="town-page"><p role="status">正在恢復本輪學習…</p></div>;
  if(!data || !round)return <div className="town-page"><h1>日課暫時讀不到</h1><p role="alert">{result.error}</p><Link to={townUrl}>回小鎮</Link></div>;
  return <div className="seal-review town-study-flow">
    <header className="seal-review-header"><Link to={townUrl}>← 回小鎮 · 保留本輪進度</Link><span>{level} · 今日學習</span></header>
    <div className="town-study-status">
      <p>{Math.min(index+(data.saved?1:0),round.items.length)}／{round.items.length} 字已保存</p>
      {error && <p role="alert" className="town-error">{error}</p>}
      {(round.day!==today || error.includes('額度已用完')) && <><p>原輪次與已保存紀錄會保留，可依今天剩餘額度重新安排。</p><button className="town-secondary" disabled={busy} onClick={()=>void act(async()=>{if(isTownKey(town))navigate(townStudyUrl(await replanTownStudy(town,id)));})}>重新安排今日學習 →</button></>}
    </div>
    {!item ? <section className="town-page town-practice-complete">
      <h1>{round.items.length ? '本輪學習已完成' : '今天的安排已完成'}</h1>
      <p>{round.items.length ? '本輪的學習紀錄已保存，回小鎮看看成果。' : '目前沒有可排的學新或複習。明天再來查看安排，也可以選字補練。'}</p>
      <Link className="town-primary" to={townUrl}>回小鎮看小屋 →</Link>
    </section> : round.day===today && data.saved ? <section className="town-page town-study-saved" aria-label="本題保存結果">
      <p role="status">學習紀錄已保存</p><h1>{item.wordRecord.word}</h1><p>{item.wordRecord.meaningZh}</p>
      <p>{data.saved.mode==='known' ? '已保存已會標記，沿用一般複習安排。' : data.saved.grade===0 ? '還需要複習，這個字的小屋也會保留。' : '這次學習已完成，小屋已落成。'}</p>
      {item.isRecap && <p className="town-subtle">同日回顧沿用原本的複習時間。</p>}
      <div className="town-study-result-actions"><Link className="town-primary" to={townUrl}>回小鎮看小屋 →</Link><button className="town-secondary" disabled={busy} onClick={()=>void act(()=>nextTownStudy(id,index))}>{index+1<round.items.length ? '下一張 →' : '完成本輪 →'}</button></div>
    </section> : round.day===today && data.options!==undefined ? <>
      <p className="town-study-status town-subtle">保存後可以回小鎮看成果，或繼續下一張。</p>
      <ReviewFlashcard key={`${id}:${index}`} item={item} flipped={!!round.flipped[index]} choice={round.choices[index] ?? null} options={data.options} saving={busy} position={index+1} saveBeforeNext
        onPick={word=>void act(()=>pickTownStudy(id,index,word))} onFlip={()=>void act(()=>pickTownStudy(id,index))}
        onGrade={(grade:Grade)=>void act(()=>saveTownStudy(id,index,grade))} onKnown={()=>void act(()=>saveTownStudy(id,index,3,true))} />
    </> : round.day===today ? <p className="town-study-status" role="status">正在恢復本題選項…</p> : null}
  </div>;
}
