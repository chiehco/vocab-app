import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { downloadProgressBackup, exportProgress } from '../../backup/backup';
import { practiceQuestions as allQuestions, sessionMode, questions, REVISION, wrongQuestionIds, curriculumUnits, canonicalQuestionId, questionForMode, firstTargetAttempts } from './model';
import type { DirectSession } from './model';
import { startSession, startScopeSession, startReviewSession, updateQuestion, submitAnswer, nextQuestion, switchPracticeMode } from './store';
import { lookupWord } from './lookup';
import './direct.css';
import { practiceIds } from '../vocabulary/model';
import { directTownItem } from '../town/townPractice';
import RewardPanel, { RewardReceipt } from '../rewards/RewardPanel';
import { directRoundId } from '../rewards/model';
import { useRewardRound } from '../rewards/useRewardRound';
import { directRewardWord, directRoundChallenge } from '../rewards/directScope';
import { optionExplanation } from './optionExplanation';

export default function DirectScreen() {
  const [params,setParams] = useSearchParams();
  const sessionId=params.get('session');
  const data = useLiveQuery(async () => ({ session: sessionId ? await progressDb.directSessions.get(sessionId) : await progressDb.directSessions.orderBy('updatedAt').filter(s => s.revision === REVISION).last(), attempts: await progressDb.directAttempts.toArray(), words: await contentDb.words.toArray(), senses: await contentDb.senses.toArray() }),[sessionId]);
  const [meaning, setMeaning] = useState<ReturnType<typeof lookupWord>>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const feedback = useRef<HTMLElement>(null);
  const [selection, setSelection] = useState<{ key: string; choice: string } | null>(null);
  const submittedChoice = useRef<string | null>(null);
  const advancedFrom = useRef<string | null>(null);
  const choiceWrites = useRef<Promise<void>>(Promise.resolve());
  const s = data?.session;
  const mode = s ? sessionMode(s) : 'basic';
  const hasVocabulary = s?.questionIds.some(id => id.includes('CLOZE-'));
  const q = allQuestions.find(q => q.questionId === s?.questionIds[s.index]);
  const a = data?.attempts.find(a => a.id === `${s?.id}:${q?.questionId}`);
  const answerId = a?.id;
  const hasRewardScope = !!s?.questionIds.some(id=>!!directRewardWord(id));
  const rewardWord = q ? directRewardWord(q.questionId) : undefined;
  const rewardRound = s && hasRewardScope ? directRoundId(s.id) : '';
  const reward = useRewardRound(rewardRound,s?.questionIds.length ?? 0,!!rewardWord && !!q && !a && s?.revision===REVISION,
    directRoundChallenge(s?.questionIds ?? []),new Set(s?.questionIds.map(directRewardWord).filter(Boolean)).size);
  const questionKey = `${s?.id}:${q?.questionId}`;
  const selectedChoice = selection?.key === questionKey ? selection.choice : s?.choices[q?.questionId ?? ''];
  useEffect(() => {
    if (!answerId || !feedback.current) return;
    feedback.current.focus({ preventScroll: true });
    feedback.current.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [answerId]);
  const lastTownAttempt = data?.attempts.filter(attempt => attempt.sessionId === s?.id && directTownItem(attempt.questionId))
    .sort((a, b) => a.answeredAt - b.answeredAt).at(-1);
  const townItem = directTownItem(q?.questionId ?? lastTownAttempt?.questionId ?? '');
  const townReturn = s ? { townPractice: { to: `/practice/direct?session=${encodeURIComponent(s.id)}&town=LV4` } } : undefined;
  const scope=s?.scopeQuestionIds ?? s?.questionIds;
  const scopeTargets = scope && new Set(scope.map(canonicalQuestionId));
  const studyUnit = scope?.length ? curriculumUnits.find(u => {
    const ids = new Set(practiceIds(u.items));
    return scope.every(id => ids.has(questionForMode(canonicalQuestionId(id), 'advanced')));
  }) : undefined;
  const first = firstTargetAttempts(data?.attempts ?? []).filter(a => allQuestions.some(q => q.questionId === a.questionId) && (!scopeTargets || scopeTargets.has(canonicalQuestionId(a.questionId))));
  async function openSession(create: Promise<DirectSession>) { const next=await create;setParams({session:next.id, ...(params.get('town') === 'LV4' ? {town:'LV4'} : {})}); }
  async function act(action: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch { setError('未能儲存，請重試。若空間不足，請先匯出備份。'); }
    finally { lock.current = false; setBusy(false); }
  }
  function persistChoice(choice: string) {
    if (!s || !q) return Promise.resolve();
    choiceWrites.current = choiceWrites.current.catch(() => undefined)
      .then(() => updateQuestion(s.id, q.questionId, { choice }));
    return choiceWrites.current;
  }
  function chooseAnswer(choice: string) {
    if (!s || !q || a || lock.current || submittedChoice.current === questionKey) return;
    setSelection({ key: questionKey, choice });
    void act(async () => {
      if (rewardWord) await reward.prepare();
      await persistChoice(choice);
      await submitAnswer(s.id, q.questionId, true);
      submittedChoice.current = questionKey;
    });
  }
  function lookup(word: string) {
    void act(async () => {
      if (s && q && !a) await updateQuestion(s.id, q.questionId, { lookup: word });
      setMeaning(lookupWord(word, data?.words));
      dialog.current?.showModal();
    });
  }
  function advanceQuestion() {
    if (!s || lock.current || advancedFrom.current === questionKey) return;
    void act(async () => {
      await nextQuestion(s.id);
      advancedFrom.current = questionKey;
    });
  }
  const wrong = wrongQuestionIds(data?.attempts ?? []).filter(id=>!scopeTargets || scopeTargets.has(canonicalQuestionId(id)));
  return <div className="direct-page ui-column">
    <nav><Link to={studyUnit ? `/textbook/${studyUnit.level}/${studyUnit.unit}` : '/exam'}>← {studyUnit ? '課本單元' : '學測專區'}</Link><Link to="/groups">我的群組</Link></nav>
    {params.get('town') === 'LV4' && townItem && <p><Link to={`/town/LV4/17?item=${encodeURIComponent(townItem.learningItemId)}`} state={townReturn}>← 回小鎮 · 保留本輪進度</Link></p>}
    <p className="direct-kicker">教材練習</p><h1>{studyUnit ? `${studyUnit.level} Unit ${studyUnit.unit} · 教材練習` : s?.groupId ? '群組教材練習' : '新情境練習'}</h1>
    {s && <p className="direct-scope">本輪 {s.questionIds.length} 題{params.get('town') === 'LV4' && s.questionIds.length === 1 ? ' · 小鎮選字練習，每次一字一題' : ''}。{studyUnit && <Link to={`/textbook/${studyUnit.level}/${studyUnit.unit}`}>到課本選整單元範圍 →</Link>}</p>}
    <p className="direct-muted">{s?.questionIds.some(id=>!questions.some(q=>q.questionId===id)) || s?.groupId ? `單元${mode === 'basic' ? '基礎練習：四選一與文法搭配' : '進階練習：自行填入目標詞，文法保留選項'}。可隨時離開，下次續答。` : '六題新編情境題，尚未校準學測難度。'}點英文查中文，作答後看解析。</p>
    {s && hasVocabulary && <section aria-label="練習難度"><div className="direct-modes">
      <button disabled={busy} aria-pressed={mode === 'basic'} onClick={() => void act(() => openSession(switchPracticeMode(s.id, 'basic')))}>基礎・四選一</button>
      <button disabled={busy} aria-pressed={mode === 'advanced'} onClick={() => void act(() => openSession(switchPracticeMode(s.id, 'advanced')))}>進階・填單字</button>
    </div><p className="direct-muted">切換時各自續答；選字與填字分開記錄成績。</p></section>}
    {error && (!q || a) && <p role="alert">{error}</p>}
    {s && <RewardPanel roundId={rewardRound || undefined} />}
    {reward.error && <p role="alert">{reward.error}</p>}
    {!data ? <p>讀取進度中…</p> : !s || s.revision !== REVISION ? <button disabled={busy} className="direct-primary" onClick={() => void act(() => openSession(startSession()))}>開始作答 · 6 題</button> : q ? <>
      {!a ? <section className="direct-question-area" aria-label="目前題目">
      <p className="direct-kicker">{s.index + 1} / {s.questionIds.length}</p>
      {!rewardWord && <p className="reward-note">本題題型尚未納入答題金幣。</p>}
      <h2 className="direct-stem">{q.stem.split(/([A-Za-z]+(?:'[A-Za-z]+)?)/g).map((token,i) => /^[A-Za-z]/.test(token) ? <button disabled={busy} key={i} className="direct-word" aria-label={`查字：${token}`} onClick={() => lookup(token)}>{token}</button> : token)}</h2>
      {s.lookups[q.questionId]?.length > 0 && <p className="direct-muted">本題已使用提示，會保留紀錄。</p>}
      <details key={questionKey} className="direct-answer-explanation"><summary>作答說明</summary>
        <p className="direct-muted">提交前查字會標記為使用提示。</p>
        {(q.sourceType === 'original_target_word_choice' || q.sourceType === 'practice_context_choice') && <p className="direct-muted">依句子情境，選出適合填入的單字。</p>}
        {!q.options.length && <p className="direct-muted">請填本單元目標詞。系統只比對目標詞，不判定其他同義表達；大小寫不影響結果。</p>}
        {q.options.length > 0 && <p className="direct-muted" id="direct-pick-instruction">點選一個選項即送出答案，作答後可看解析。</p>}
      </details>
      {!q.options.length && <><label>填入目標詞<input key={`${s.id}:${q.questionId}`} defaultValue={s.choices[q.questionId] ?? ''} disabled={busy} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={120} onChange={e=> {void updateQuestion(s.id,q.questionId,{choice:e.target.value}).catch(()=>setError('未能保存輸入，請重試。'));}} onKeyDown={event => {
        if (event.key !== 'Enter') return;
        event.preventDefault(); const value = event.currentTarget.value;
          void act(async () => { if (rewardWord) await reward.prepare(); await updateQuestion(s.id, q.questionId, { choice: value }); await submitAnswer(s.id, q.questionId, true); });
      }} /></label></>}
      {!q.options.length && !a && <><button disabled={busy} onClick={() => void act(() => updateQuestion(s.id, q.questionId, {lookup:'[首字母提示]'}))}>看首字母提示</button>{s.lookups[q.questionId]?.includes('[首字母提示]') && <p>首字母：{q.answer[0]}…</p>}</>}
      <div role="group" aria-label="答案選項">{q.options.map(o => <div className="direct-option-row" key={o.id}>
        <button type="button" className="direct-option" disabled={busy} aria-pressed={selectedChoice === o.id} aria-describedby="direct-pick-instruction" onClick={() => chooseAnswer(o.id)}>{o.id} · {o.text}</button>
        {/^[A-Za-z]/.test(o.text) && <button type="button" disabled={busy} aria-label={`查選項：${o.text}`} onClick={() => lookup(o.text)}>查字</button>}
      </div>)}</div>
      {!q.options.length && <button className="direct-primary" disabled={busy || !s.choices[q.questionId]?.trim()} onClick={() => void act(async () => { if (rewardWord) await reward.prepare(); await submitAnswer(s.id,q.questionId,true); })}>確認答案</button>}
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">正在保存答案…</p>}
      </section> : <section className="direct-result direct-answer-feedback" ref={feedback} tabIndex={-1} aria-labelledby="direct-result-title">
        <p className="direct-kicker">第 {s.index + 1} 題 · 答案已保存</p>
        <h2 id="direct-result-title">{a.correct ? '答對了' : '這題答錯了，再練一次'}</h2><p className="direct-answer-meaning">{q.options.find(o=>o.id===q.answer)?.text ?? q.answer}{q.targetMeaningZh && ` — ${q.targetMeaningZh}`}</p>
        <div className="direct-feedback-actions">
          {townItem && <Link onClick={event => { if (event.detail > 1) event.preventDefault(); }} to={`/town/LV4/17?item=${encodeURIComponent(townItem.learningItemId)}`} state={townReturn}>回小鎮看小屋 →</Link>}
          <button disabled={busy} onClick={event => { if (event.detail > 1) return; advanceQuestion(); }}>{s.index === s.questionIds.length - 1 ? '查看本輪結果' : '下一題'}</button>
        </div>
        {rewardWord ? <RewardReceipt answerId={`answer:direct:${a.id}`} roundId={rewardRound} word={rewardWord} correct={a.correct} /> : <p className="reward-note">本題題型尚未納入答題金幣，沒有新增金幣。</p>}
        {townItem && <p role="status" className="direct-muted">這個字的小屋已落成。答錯或使用提示也算練過。</p>}
        {q.sentenceEn && <><p>你的答案：{q.options.find(o=>o.id===a.choice)?.text ?? a.choice}</p><p>{q.sentenceEn}</p><p>{q.sentenceZh}</p></>}
        <p className="direct-muted">{a.hintUsed ? '本次作答使用過提示' : '本次作答未使用提示'}</p>
        {(q.sourceType === 'new_grammar_authored' || q.sourceType === 'original_usage_choice' ? q.options.filter(o=>o.id===q.answer) : q.options).map(o => {
          const explanation = optionExplanation(q, o, data.words, data.senses);
          return <div className="direct-option-explanation" key={o.id}><p><b>{o.id} · {o.text}</b>{explanation.meaning && <> — {explanation.meaning}</>}</p><p>{explanation.rationale}</p></div>;
        })}
      </section>}
    </> : <section><h2>本輪完成</h2><p className="direct-score">{data.attempts.filter(a => a.sessionId === s.id && a.correct).length} / {s.questionIds.length}</p>
      {townItem && lastTownAttempt && <div className="direct-town-result"><p>本輪答案已保存，小屋會保留。</p><Link to={`/town/LV4/17?item=${encodeURIComponent(townItem.learningItemId)}`} state={townReturn}>回小鎮看小屋 →</Link></div>}
      {wrong.length > 0 && <button className="direct-primary" disabled={busy} onClick={() => void act(() => openSession(startReviewSession(wrong,s.title,s.groupId,scope,mode)))}>重練錯題（{wrong.length}）</button>}
      <button className="direct-primary" disabled={busy} onClick={() => void act(() => openSession(startScopeSession(scope ?? s.questionIds,s.title ?? '教材練習',s.groupId,mode)))}>再練本輪範圍（{scope?.length ?? s.questionIds.length} 題）</button>
    </section>}
    <footer><p><Link to={studyUnit ? `/vocabulary?level=${studyUnit.level}&unit=${studyUnit.unit}` : '/textbook'}>返回單字字卡</Link></p><p>{hasVocabulary ? (mode === 'basic' ? '基礎' : '進階') : ''}首次作答：{first.filter(a => a.correct).length} / {first.length} 題正確</p><p className="direct-muted">重練保留首答；本練習不改變正式複習排程。查字使用本機資料，不呼叫翻譯 API。</p>
      <button disabled={busy} onClick={() => void act(async () => downloadProgressBackup(await exportProgress()))}>匯出完整進度備份</button>
      {s?.groupId && <p><button disabled={busy} onClick={() => void act(() => openSession(startSession()))}>開始新情境六題</button></p>}
    </footer>
    <dialog ref={dialog} aria-labelledby="direct-lookup-title"><h2 id="direct-lookup-title">{meaning?.word}</h2><p>{meaning?.meaning}</p><p className="direct-muted">{meaning?.source}</p><button autoFocus onClick={() => dialog.current?.close()}>關閉</button></dialog>
  </div>;
}
