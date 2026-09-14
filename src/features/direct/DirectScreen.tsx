import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { downloadProgressBackup, exportProgress } from '../../backup/backup';
import { practiceQuestions as allQuestions, sessionMode, questions, REVISION, wrongQuestionIds } from './model';
import type { DirectSession } from './model';
import { startSession, updateQuestion, submitAnswer, nextQuestion, switchPracticeMode } from './store';
import { lookupWord } from './lookup';
import './direct.css';

export default function DirectScreen() {
  const [params,setParams] = useSearchParams();
  const sessionId=params.get('session');
  const data = useLiveQuery(async () => ({ session: sessionId ? await progressDb.directSessions.get(sessionId) : await progressDb.directSessions.orderBy('updatedAt').filter(s => s.revision === REVISION).last(), attempts: await progressDb.directAttempts.toArray(), words: await contentDb.words.toArray() }),[sessionId]);
  const [meaning, setMeaning] = useState<ReturnType<typeof lookupWord>>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const s = data?.session;
  const mode = s ? sessionMode(s) : 'basic';
  const hasVocabulary = s?.questionIds.some(id => id.includes('CLOZE-'));
  const q = allQuestions.find(q => q.questionId === s?.questionIds[s.index]);
  const a = data?.attempts.find(a => a.id === `${s?.id}:${q?.questionId}`);
  const scope=s?.scopeQuestionIds ?? s?.questionIds;
  const first = data?.attempts.filter(a => a.firstAttempt && allQuestions.some(q => q.questionId === a.questionId) && (!scope || scope.includes(a.questionId))) ?? [];
  async function openSession(create: Promise<DirectSession>) { const next=await create;setParams({session:next.id}); }
  async function act(action: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch { setError('未能儲存，請重試。若空間不足，請先匯出備份。'); }
    finally { lock.current = false; setBusy(false); }
  }
  function lookup(word: string) {
    void act(async () => {
      if (s && q && !a) await updateQuestion(s.id, q.questionId, { lookup: word });
      setMeaning(lookupWord(word, data?.words));
      dialog.current?.showModal();
    });
  }
  const wrong = wrongQuestionIds(data?.attempts ?? []).filter(id=>!scope || scope.includes(id));
  return <div className="direct-page">
    <nav><Link to="/exam">← 學測專區</Link><Link to="/groups">我的群組</Link></nav>
    <p className="direct-kicker">教材練習</p><h1>{s?.title ?? '新情境練習'}</h1>
    <p className="direct-muted">{s?.questionIds.some(id=>!questions.some(q=>q.questionId===id)) || s?.groupId ? `單元${mode === 'basic' ? '基礎練習：四選一與文法搭配' : '進階練習：自行填入目標詞，文法保留選項'}。可隨時離開，下次續答。` : '六題新編情境題，尚未校準學測難度。'}點英文查中文，作答後看解析。</p>
    {s && hasVocabulary && <section aria-label="練習難度"><div className="direct-modes">
      <button disabled={busy} aria-pressed={mode === 'basic'} onClick={() => void act(() => openSession(switchPracticeMode(s.id, 'basic')))}>基礎・四選一</button>
      <button disabled={busy} aria-pressed={mode === 'advanced'} onClick={() => void act(() => openSession(switchPracticeMode(s.id, 'advanced')))}>進階・填單字</button>
    </div><p className="direct-muted">切換時各自續答；選字與填字分開記錄成績。</p></section>}
    {error && <p role="alert">{error}</p>}
    {!data ? <p>讀取進度中…</p> : !s || s.revision !== REVISION ? <button disabled={busy} className="direct-primary" onClick={() => void act(() => openSession(startSession()))}>開始作答 · 6 題</button> : q ? <>
      <p className="direct-kicker">{s.index + 1} / {s.questionIds.length}</p>
      <h2 className="direct-stem">{q.stem.split(/([A-Za-z]+(?:'[A-Za-z]+)?)/g).map((token,i) => /^[A-Za-z]/.test(token) ? <button disabled={busy} key={i} className="direct-word" aria-label={`查字：${token}`} onClick={() => lookup(token)}>{token}</button> : token)}</h2>
      <p className="direct-muted">{s.lookups[q.questionId]?.length ? '本題已使用提示，會保留紀錄。' : '提交前查字會標記為使用提示。'}</p>
      {q.sentenceEn && <p>目標義：{q.targetMeaningZh}</p>}
      {q.sourceType === 'original_target_word_choice' && <p className="direct-muted">依中文目標義，選出適合填入句子的單字。</p>}
      {!q.options.length && <><p className="direct-muted">請填本單元目標詞。系統只比對目標詞，不判定其他同義表達；大小寫不影響結果。</p><label>填入目標詞<input key={`${s.id}:${q.questionId}`} defaultValue={s.choices[q.questionId] ?? ''} disabled={busy || !!a} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={120} onChange={e=> {void updateQuestion(s.id,q.questionId,{choice:e.target.value}).catch(()=>setError('未能保存輸入，請重試。'));}} /></label></>}
      {!q.options.length && !a && <><button disabled={busy} onClick={() => void act(() => updateQuestion(s.id, q.questionId, {lookup:'[首字母提示]'}))}>看首字母提示</button>{s.lookups[q.questionId]?.includes('[首字母提示]') && <p>首字母：{q.answer[0]}…</p>}</>}
      <div role="group" aria-label="答案選項">{q.options.map(o => <div className="direct-option-row" key={o.id}>
        <button className="direct-option" disabled={busy || !!a} aria-pressed={s.choices[q.questionId] === o.id} onClick={() => void act(() => updateQuestion(s.id,q.questionId,{ choice:o.id }))}>{o.id} · {o.text}</button>
        {/^[A-Za-z]/.test(o.text) && <button disabled={busy} aria-label={`查選項：${o.text}`} onClick={() => lookup(o.text)}>查字</button>}
      </div>)}</div>
      {!a ? <button className="direct-primary" disabled={busy || !s.choices[q.questionId]?.trim()} onClick={() => void act(() => submitAnswer(s.id,q.questionId))}>確認答案</button> : <section className="direct-result">
        <h2>{a.correct ? '答對了' : `${q.options.length ? '本題答案' : '本題目標詞'}：${q.options.find(o=>o.id===q.answer)?.text ?? q.answer}`}</h2><p>{q.targetWord} — {q.targetMeaningZh}</p>
        {q.sentenceEn && <><p>你的答案：{q.options.find(o=>o.id===a.choice)?.text ?? a.choice}</p><p>{q.sentenceEn}</p><p>{q.sentenceZh}</p></>}
        <p className="direct-muted">{a.hintUsed ? '本次作答使用過提示' : '本次作答未使用提示'}</p>
        {(q.sourceType === 'new_grammar_authored' || q.sourceType === 'original_usage_choice' ? q.options.filter(o=>o.id===q.answer) : q.options).map(o => <p key={o.id}>{o.id} · {o.rationaleZh}</p>)}
        <button className="direct-primary" disabled={busy} onClick={() => void act(() => nextQuestion(s.id))}>{s.index === s.questionIds.length - 1 ? '查看本輪結果' : '下一題'}</button>
      </section>}
    </> : <section><h2>本輪完成</h2><p className="direct-score">{data.attempts.filter(a => a.sessionId === s.id && a.correct).length} / {s.questionIds.length}</p>
      {wrong.length > 0 && <button className="direct-primary" disabled={busy} onClick={() => void act(() => openSession(startSession(wrong,s.title,s.groupId,scope,mode)))}>重練錯題（{wrong.length}）</button>}
      <button disabled={busy} onClick={() => void act(() => openSession(startSession(s.questionIds,s.title,s.groupId,scope,mode)))}>再練本輪題目</button>
    </section>}
    <footer><p><Link to="/vocabulary">返回單字字卡</Link></p><p>{hasVocabulary ? (mode === 'basic' ? '基礎' : '進階') : ''}首次作答：{first.filter(a => a.correct).length} / {first.length} 題正確</p><p className="direct-muted">重練保留首答；本練習不改變正式複習排程。查字使用本機資料，不呼叫翻譯 API。</p>
      <button disabled={busy} onClick={() => void act(async () => downloadProgressBackup(await exportProgress()))}>匯出完整進度備份</button>
      {s?.groupId && <p><button disabled={busy} onClick={() => void act(() => openSession(startSession()))}>開始新情境六題</button></p>}
    </footer>
    <dialog ref={dialog} aria-labelledby="direct-lookup-title"><h2 id="direct-lookup-title">{meaning?.word}</h2><p>{meaning?.meaning}</p><p className="direct-muted">{meaning?.source}</p><button autoFocus onClick={() => dialog.current?.close()}>關閉</button></dialog>
  </div>;
}
