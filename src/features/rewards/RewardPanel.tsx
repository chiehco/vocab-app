import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { progressDb } from '../../db/progressDb';
import { challengeRule, qualifiedWords, taiwanDate, rewardWord } from './model';
import { claimDailyCheckIn } from './store';
import './rewards.css';

function useClock() {
  const [now,setNow] = useState(Date.now);
  useEffect(() => {const timer = setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);},[]);
  return now;
}

export default function RewardPanel({roundId,roundPreview,compact=false,resetKey}:{roundId?:string;roundPreview?:{challenge:'meaning-v2';distinctWordCount:number};compact?:boolean;resetKey?:string|number}) {
  const now = useClock(), date = taiwanDate(now);
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const lock = useRef(false);
  const data = useLiveQuery(async()=>({wallet:await progressDb.rewardWallet.get('local'), claimed:!!await progressDb.rewardLedger.get(`check-in:${date}`),
    history:await progressDb.rewardLedger.orderBy('createdAt').reverse().limit(10).toArray(),
    round:roundId ? await progressDb.rewardRounds.get(roundId) : undefined,
    entries:roundId ? await progressDb.rewardLedger.where('roundId').equals(roundId).toArray() : []}),[roundId,date]);
  const round = data?.round, rule=challengeRule(round ? round.challenge : roundPreview?.challenge);
  const correctWords=round ? qualifiedWords(round,data?.entries ?? []) : new Set<string>();
  const seconds = round && rule ? Math.min(rule.windowMs/1000,Math.max(0,Math.ceil((round.startedAt+rule.windowMs-now)/1000))) : undefined;
  const bonus=data?.entries.find(event=>event.kind==='round-bonus');
  const availableWords=round?.distinctWordCount ?? roundPreview?.distinctWordCount;
  async function checkIn() {
    if (lock.current) return;
    lock.current = true; setBusy(true);setError('');
    try {await claimDailyCheckIn();} catch {setError('打卡尚未保存，沒有發放金幣；請再試一次。');}
    finally {lock.current=false;setBusy(false);}
  }
  const claimButton=<button disabled={!data || busy || data.claimed} onClick={()=>void checkIn()}>{data?.claimed ? '今日已領 30' : busy ? '保存打卡中…' : '每日打卡 +30'}</button>;
  const explanation=<>
    <p className="reward-note">台灣日期 {date} · 每天按一次領取。客觀答題保存後：答對 +5，答錯 +1。</p>
    {rule ? <>
      <p className="reward-note">{rule.label}加成：{rule.windowMs===30_000 ? '30 秒' : '3 分鐘'}內答對 {rule.words} 個不同字，額外 +{rule.amount}；每輪一次。</p>
      <p className="reward-note">{bonus ? `本輪${rule.label}加成已領 +${bonus.amount}` : `本輪不同答對字 ${correctWords.size} / ${rule.words} · ${seconds===undefined ? '第一題客觀題呈現起計時' : seconds===0 ? '本輪加成時間已到，仍可領基礎答題金幣' : `剩 ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}`}
        {availableWords!==undefined && availableWords<rule.words && <><br />本輪最多 {availableWords} 個不同字，不足 {rule.words} 字；可逐題領基礎金幣，無法達成本輪加成。</>}
        {roundPreview && <><br />沒有選項的翻卡自評不計答題金幣，也不計加成。</>}</p>
    </> : round ? <p className="reward-note">{round.challenge===undefined ? '舊輪次保留原紀錄，後續只領基礎金幣；新輪次才使用新版加成。' : '本輪題型只領基礎答題金幣，不參加辨義或填空加成。'}{bonus && ` 原有加成 +${bonus.amount} 已保留。`}</p>
      : !roundId && <p className="reward-note">辨義：30 秒答對 10 字額外 +30；填空：3 分鐘答對 15 字額外 +60。各輪一次，依實際題量與作答計算。</p>}
    {!!data?.history.length && <details><summary>最近金幣紀錄</summary><ol>{data.history.map(event=><li key={event.id}>+{event.amount} · {event.kind==='daily-check-in' ? `${event.taiwanDate} 打卡` : event.kind==='round-bonus' ? `額外${challengeRule(event.challenge)?.label ?? '舊版'}加成` : `基礎答題（${event.correct ? '答對' : '答錯'}）`} · {new Date(event.createdAt).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false})}</li>)}</ol></details>}
  </>;
  return <section className={`reward-panel${compact ? ' reward-panel-compact' : ''}`} aria-label="遊戲金幣">
    {compact ? <>
      <div className="reward-compact-heading">
        <details key={resetKey} className="reward-explanation"><summary>獎勵說明</summary><div>{claimButton}{explanation}</div></details>
        <p className="reward-coin-count" aria-label={`遊戲金幣 ${data ? data.wallet?.balance ?? 0 : '讀取中'}`}><span aria-hidden="true">◉</span><strong>{data ? data.wallet?.balance ?? 0 : '…'}</strong></p>
      </div>
      {rule && <div className="reward-countdown"><label htmlFor={`reward-time-${roundId}`}>
        {bonus ? '本輪加成已領' : seconds===undefined ? '本輪加成 · 尚未計時' : seconds===0 ? '加成時間已到' : `本輪加成 · 剩 ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}
        <span>{correctWords.size} / {rule.words} 字</span></label>
        <progress id={`reward-time-${roundId}`} max={rule.windowMs/1000} value={seconds ?? rule.windowMs/1000} aria-label="本輪加成剩餘時間" aria-valuetext={seconds===undefined ? '第一題客觀題呈現起計時' : `剩餘 ${seconds} 秒`}/>
      </div>}
    </> : <><div className="reward-wallet-row"><p>遊戲金幣 <strong>{data ? data.wallet?.balance ?? 0 : '…'}</strong></p>{claimButton}</div>{explanation}</>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

export function RewardReceipt({answerId,roundId,word,correct}:{answerId:string;roundId:string;word:string;correct:boolean}) {
  const data=useLiveQuery(async()=>({answer:await progressDb.rewardLedger.get(answerId),bonus:await progressDb.rewardLedger.get(`bonus:${roundId}`),wallet:await progressDb.rewardWallet.get('local')}),[answerId,roundId]);
  if (!data) return <p className="reward-note">讀取金幣紀錄中…</p>;
  const historical = data.answer && (data.answer.correct!==correct || data.answer.word!==rewardWord(word));
  return <p className="reward-receipt" role="status">{data.answer ? historical ? `本題先前已領基礎 +${data.answer.amount}，這次未重發。` : `本題基礎金幣 +${data.answer.amount}，已保存。` : '這是先前保存的答案，未補發金幣。'}{data.bonus && ` 本輪額外${challengeRule(data.bonus.challenge)?.label ?? '舊版'}加成已領 +${data.bonus.amount}。`} 金幣餘額 {data.wallet?.balance ?? 0}。</p>;
}
