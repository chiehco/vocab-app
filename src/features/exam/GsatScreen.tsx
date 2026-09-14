import GsatYearSelector from './GsatYearSelector';
import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import { progressDb } from '../../db/progressDb';
import { contentDb } from '../../db/contentDb';
import { downloadProgressBackup, exportProgress } from '../../backup/backup';
import { lookupWord } from '../direct/lookup';
import { activeQuestions, advanceGsat, editGsat, gsatYear, gsatYears, idsForYear, gsatPassages, gsatWrongIds, GSAT_REVISION, startGsat, submitGsat, validGsatSession } from './gsatStore';
import '../direct/direct.css';
import './gsat.css';
import { routeFigures } from './gsatFigures';
import { originalImages, yearMetadata } from './archive';
import OriginalPages from './OriginalPages';

export default function GsatScreen() {
  const [params,setParams] = useSearchParams();
  const id = params.get('session');
  const requestedYear = gsatYears.includes(params.get('year') ?? '') ? params.get('year')! : '115';
  const data = useLiveQuery(async () => ({
    session: id ? await progressDb.directSessions.get(id) : undefined,
    sessions: await progressDb.directSessions.orderBy('updatedAt').filter(s => s.revision === GSAT_REVISION).toArray(),
    attempts: await progressDb.directAttempts.toArray(), words: await contentDb.words.toArray(),
  }), [id]);
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const [meaning,setMeaning] = useState<ReturnType<typeof lookupWord>>();
  const [figuresReady,setFiguresReady] = useState<Record<string,boolean>>({});
  const lock = useRef(false), dialog = useRef<HTMLDialogElement>(null);
  const s = data?.session;
  const year = s && validGsatSession(s) ? gsatYear(s.questionIds[0]) : requestedYear;
  const yearIds = idsForYear(year);
  const yearPassages = gsatPassages.filter(p => gsatYear(p.passage_id) === year);
  const latest = data?.sessions.filter(s => validGsatSession(s) && gsatYear(s.questionIds[0]) === year).at(-1);
  const valid = s && validGsatSession(s);
  const qs = valid ? activeQuestions(s) : [];
  const isPassage = qs.length > 1;
  const passage = gsatPassages.find(p => p.passage_id === qs[0]?.passage_id);
  const pool = passage?.option_pool as Record<string,string> | null | undefined;
  const original = originalImages(year,passage?.sourcePages ?? qs.map(q=>q.sourcePage));
  const needsOriginal = !!passage?.needsOriginal;
  const originalMissing = needsOriginal && original.some(path=>!figuresReady[path]);
  const vocabularyCount = yearMetadata(year)?.vocabularyCount ?? 10;
  const missingFigures = originalMissing || qs.some(q => q.question_id === 'gsat-115-q38') && Object.keys(routeFigures).some(key => !figuresReady[key]);
  const attempts = data?.attempts ?? [];
  const submitted = qs.length > 0 && qs.every(q => attempts.some(a => a.id === `${s?.id}:${q.question_id}`));
  const first = attempts.filter(a => yearIds.includes(a.questionId) && a.firstAttempt);
  const wrong = gsatWrongIds(attempts, year);
  async function act(fn: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await fn(); } catch(e) { setError(e instanceof Error ? e.message : '未能保存，請重試。'); }
    finally { lock.current = false; setBusy(false); }
  }
  const begin = (ids = yearIds) => act(async () => { const s = await startGsat(ids); setParams({year,session:s.id}); });
  function lookup(word: string) {
    void act(async () => {
      if (s && !submitted) await editGsat(s.id,{lookup:word});
      setMeaning(lookupWord(word,data?.words)); dialog.current?.showModal();
    });
  }
  function textWords(text: string) {
    return text.split(/(\{\{\d+\}\}|[A-Za-zÀ-ÿ]+(?:[’'][A-Za-z]+)?)/g).map((t,i) =>
      t.startsWith('{{') ? <strong className="gsat-blank" key={i}>{t.replace('{{','（').replace('}}','）____')}</strong> :
      /^[A-Za-zÀ-ÿ]/.test(t) ? <button className="direct-word" key={i} disabled={busy} aria-label={`查字：${t}`} onClick={() => lookup(t)}>{t}</button> : t);
  }
  return <div className="direct-page gsat-page">
    <nav><Link to="/exam">← 學測專區</Link><Link to={`/exam/papers?year=${year}`}>年度與題型</Link></nav>
    <p className="direct-kicker">GSAT / {year}</p><h1>學測歷屆練習</h1>
    <p className="direct-muted">{year} 年第 1–{yearIds.length} 題 · 單選練習。原題與答案已核對，中文解析為另行撰寫。</p>
    {Number(year)<110&&<p className="direct-muted">此為106–109年舊題區，供補充練習；目前主要準備範圍為110–115年。</p>}
    {error && <p role="alert">{error}</p>}
    {!data ? <p>讀取進度中…</p> : !id ? <section>
      <GsatYearSelector year={year} onChange={next=>{setError('');setParams({year:next});}}/><h2>{year} 年學測</h2>
      <p><Link to={`/exam/written?year=${year}`}>{Number(year)>=111?'混合題・中譯英・作文':'中譯英・作文'} →</Link></p>
      {latest && <button className="direct-primary" disabled={busy} onClick={() => setParams({year,session:latest!.id})}>{latest.index < latest.questionIds.length ? '繼續上次作答' : '查看上次結果'}</button>}
      <p>詞彙題逐題確認；篇章題整組提交後看解析。可隨時離開，選項會自動保存。</p>
      <button className="direct-primary" disabled={busy} onClick={() => void begin()}>開始已核對 {yearIds.length} 題</button>
      <div className="gsat-actions"><button disabled={busy} onClick={() => void begin(yearIds.slice(0,vocabularyCount))}>詞彙題 · 1–{vocabularyCount}</button>{yearPassages.map(p => <button key={p.passage_id} disabled={busy} onClick={() => void begin(p.question_ids)}>{p.label}</button>)}</div>
      <p className="direct-muted">主要練習採110–115年；106–109年另存舊題區。混合題、翻譯與作文由同年度入口進入，各年進度分開保存。</p>
    </section> : !valid ? <p role="alert">找不到可續答的進度，請回年度與題型重新選擇。</p> : qs.length ? <>
      <h2>{isPassage ? passage?.label : `詞彙題 · 第 ${qs[0].number} 題`}</h2>
      <p className="direct-muted">{isPassage ? '整組提交後才揭答。提交前查文章或選項，整組題目都會記為使用提示。' : '提交前查字會記為使用提示。'}查字使用本機資料；未收錄的字會明確標示。</p>
      {original.length>0 && (needsOriginal ? <OriginalPages images={original} onReady={(path,ready)=>setFiguresReady(v=>({...v,[path]:ready}))}/> : <details><summary>對照官方原卷</summary><OriginalPages images={original}/></details>)}
      {passage && <article aria-label="題組文章" className="gsat-passage">{passage.text.split('\n\n').map((paragraph,i) => <p key={i}>{textWords(paragraph)}</p>)}</article>}
      {pool && <section aria-label="共用選項"><h3>共用選項 · 點英文可查字</h3>{Object.entries(pool).map(([key,value]) => <p className="gsat-pool-item" key={key}><b>{key} · </b>{textWords(value)}</p>)}</section>}
      {qs.map(q => { const a = attempts.find(a => a.id === `${s.id}:${q.question_id}`); return <section key={q.question_id} aria-label={`第 ${q.number} 題`} className="gsat-question">
        {isPassage && <h3>第 {q.number} 題</h3>}
        {q.stem && <p className="direct-stem">{textWords(q.stem)}</p>}
        {pool ? <label>第 {q.number} 題答案<select aria-label={`第 ${q.number} 題答案`} disabled={busy || submitted} value={s.choices[q.question_id] ?? ''} onChange={e => void act(() => editGsat(s.id,{questionId:q.question_id,choice:e.target.value}))}><option value="" disabled>選擇答案</option>{Object.entries(pool).map(([key,value]) => <option key={key} value={key}>{key} · {value}</option>)}</select></label> : <div role="group" aria-label={`第 ${q.number} 題選項`}>{Object.entries(q.options).map(([key,value]) => <div className="direct-option-row" key={key}>
          <button className="direct-option" disabled={busy || submitted} aria-pressed={s.choices[q.question_id] === key} onClick={() => void act(() => editGsat(s.id,{questionId:q.question_id,choice:key}))}>{key} · {value || (q.question_id === 'gsat-115-q38' ? '' : `原卷圖片 ${key}`)}{q.question_id === 'gsat-115-q38' && <img className="gsat-map" src={routeFigures[key]} alt={`第38題選項${key}：官方原卷路線圖`} onLoad={() => setFiguresReady(v => ({...v,[key]:true}))} onError={() => setFiguresReady(v => ({...v,[key]:false}))} />}</button>
          {value.trim() && q.question_id !== 'gsat-115-q38' && <button disabled={busy} aria-label={`查選項：${value}`} onClick={() => lookup(value)}>查字</button>}
        </div>)}</div>}
        {s.lookups[q.question_id]?.length > 0 && <p className="direct-muted">已保存提交前查字紀錄。</p>}
        {submitted && a && <div className={`direct-result ${a.correct ? 'is-correct' : 'is-wrong'}`} aria-label={`第 ${q.number} 題解析`}><h3>{a.correct ? '✓ 答對了' : `✗ 你的答案：${a.choice}`} · 正解 {q.answer.value}</h3><p>{q.explanationZh}</p><p>{q.distractorNotesZh}</p><small>{a.hintUsed ? '本次提交前曾查字' : '本次提交前未查字'}</small></div>}
      </section>; })}
      {missingFigures && <p role="status">本題組的原卷圖片尚未完整載入。請確認連線後重新整理，圖片齊全後才能提交本組。</p>}
      {!submitted ? <><p role="status">已選 {qs.filter(q => s.choices[q.question_id]).length} / {qs.length} 題</p><button className="direct-primary" disabled={busy || missingFigures || qs.some(q => !s.choices[q.question_id])} onClick={() => void act(() => submitGsat(s.id))}>{isPassage ? `提交整組 ${qs.length} 題` : '確認答案'}</button></> : <button className="direct-primary" disabled={busy} onClick={() => void act(() => advanceGsat(s.id))}>{s.index + qs.length >= s.questionIds.length ? '查看本輪結果' : '繼續下一題組'}</button>}
    </> : <section><h2>本輪完成</h2><p className="direct-score">{attempts.filter(a => a.sessionId === s.id && a.correct).length} / {s.questionIds.length}</p><p>正確題數／本輪題數</p><button disabled={busy} onClick={() => void begin(s.questionIds)}>再練本輪題目</button></section>}
    <footer><p>首次作答：{first.filter(a => a.correct).length} / {first.length} 題正確</p><p className="direct-muted">統計範圍為 {year} 年已核對 {yearIds.length} 題。{first.filter(a => a.hintUsed).length} 題首答曾查字。重練保留首答，不改變正式複習排程。</p>
      {wrong.length > 0 && <><button disabled={busy} onClick={() => void begin(wrong)}>重練待複習題組 · {wrong.length} 題</button><p className="direct-muted">依各題最近一次作答挑選；篇章任一題答錯，會連同整篇題目一起練習。</p></>}
      <button disabled={busy} onClick={() => void act(async () => downloadProgressBackup(await exportProgress()))}>匯出完整進度備份</button>
      <p className="direct-muted">試題來源：大考中心 {year} 年學測英文，單選題。詞彙、綜合測驗與文意選填每題 1 分，篇章結構與閱讀測驗每題 2 分；此處統計正確題數，並非整卷成績。</p>
    </footer>
    <dialog ref={dialog} aria-labelledby="gsat-lookup-title"><h2 id="gsat-lookup-title">{meaning?.word}</h2><p>{meaning?.meaning}</p><p className="direct-muted">{meaning?.source}</p><button autoFocus onClick={() => dialog.current?.close()}>關閉</button></dialog>
  </div>;
}
