import type { CustomGroup } from '../direct/model';
import { readWordList } from '../modes/wordLists';
import type { WordList } from '../modes/wordLists';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getKnownWords } from "../../db/progressIdentity";
import { contentDb } from "../../db/contentDb";
import { DEFAULT_SETTINGS, getSetting, progressDb } from "../../db/progressDb";
import type { ExampleRecord, MediaRecord, ReviewMode, WordRecord } from "../../db/types";
import { pickDistractors, shuffle } from "../../quiz/distractors";
import { pickExamDistractors } from "../../quiz/examDistractors";
import { buildFunctionWordSet, filterExactFillExamples, sortStandaloneStudyWords, TOP_EXAM_FILTER } from "../../quiz/examScope";
import { recordQuizAnswer } from "../../checkin/recordActivity";
import { buildTodayQueue } from "../../srs/queue";
import { selectScheduledPracticeItems } from "../../quiz/practiceSelection";
import SpeakerButton from "../../components/SpeakerButton";
import { speak } from "../../lib/speech";
import { getWordBeastAsset, hasWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import ResilientBeastImage from "../wordbeast/ResilientBeastImage";
import { buildConfusableWordSet, buildMorphemeWordSet, buildSenseCountByWord } from "../wordbeast/wordTraits";
import { findImageClueHighlight, resolveWordImageClue, splitImageCaption, type ImageClueCopy } from "../../quiz/imageClue";
import { useToday } from "../../hooks/useToday";
import { getExamUnit, getStudyUnit, parseUnitOrder, unitOrderLabel } from "../units/unitPlan";
import "../realm-pages.css";
import { resolveGroupWords } from "../direct/groupScope";

const LEVEL_CHOICES = [TOP_EXAM_FILTER, "全部", "LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];
const QUIZ_SIZE = 10;
type QuizMode = "w2m" | "m2w" | "image" | "fill";
interface McqQuestion { target: WordRecord; options: WordRecord[]; }

function ImageChineseClue({ word, clue }: { word: WordRecord; clue: ImageClueCopy }) {
  const highlight = findImageClueHighlight(clue.text, clue.targetHint, word.meaningZh);
  const [before, answer, after] = splitImageCaption(clue.text, highlight);
  const fallback = word.meaningZh?.split(/[；;,，、/]/)[0]?.trim();

  return (
    <div className="trial-image-clue">
      <span>{clue.label}</span>
      <p>{before}{answer && <mark>{answer}</mark>}{after}</p>
      {!answer && fallback && <small>要回答的意思：<b>{fallback}</b></small>}
    </div>
  );
}

function TrialHeader({ label = "單字練習", progress }: { label?: string; progress?: string }) {
  return <header className="realm-header trial-header"><div><h1>{label}</h1></div>{progress && <span className="realm-count">{progress}</span>}</header>;
}

function TrialLevels({ selected, onChange }: { selected: string; onChange: (level: string) => void }) {
  return <div className="level-tabs trial-levels" aria-label="篩選等級">{LEVEL_CHOICES.map((level) => <button key={level} aria-pressed={selected === level} onClick={() => onChange(level)}>{level}</button>)}</div>;
}

export default function QuizScreen() {
  const [searchParams] = useSearchParams();
  const listId = searchParams.get('list');
  const groupId = listId || searchParams.get('group');
  const customGroup = useLiveQuery<CustomGroup | WordList | undefined>(() => listId ? readWordList(listId) : groupId ? progressDb.customGroups.get(groupId) : undefined, [groupId,listId]);
  const groupReturn = listId ? (customGroup as WordList|undefined)?.returnTo ?? '/modes/words' : `/groups?group=${encodeURIComponent(groupId??'')}`;
  const textbookScope = groupReturn.startsWith('/textbook/');
  const autoStarted = useRef<string | null>(null);

  const explicitOrder = searchParams.has('order');
  const order = parseUnitOrder(searchParams.get('order'));
  const unitOrderQuery = explicitOrder ? `?order=${order}` : '';
  const requestedLevel = searchParams.get("level") ?? "";
  const requestedUnitNumber = Number(searchParams.get("unit"));
  const hasUnitScope = /^LV[1-6]$/.test(requestedLevel)
    && Number.isInteger(requestedUnitNumber)
    && requestedUnitNumber > 0;
  const freeScope = !!groupId || hasUnitScope && explicitOrder;
  const minimumPool = freeScope ? 1 : 4;
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [questions, setQuestions] = useState<McqQuestion[] | null>(null);
  const [fillQuestions, setFillQuestions] = useState<ExampleRecord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [fillInput, setFillInput] = useState("");
  const [fillResult, setFillResult] = useState<"correct" | "wrong" | null>(null);
  const [levelSel, setLevelSel] = useState(hasUnitScope ? requestedLevel : TOP_EXAM_FILTER);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [startingMode, setStartingMode] = useState<QuizMode | null>(null);
  const today = useToday();
  const autoPronounce = useLiveQuery(
    () => getSetting<boolean>("autoPronounce"),
    [],
    DEFAULT_SETTINGS.autoPronounce,
  );

  const allExamples = useLiveQuery(() => contentDb.examples.toArray(), []);
  const allMedia = useLiveQuery(() => contentDb.media.filter((media) => media.mediaType === "image").toArray(), []);
  const todayCheckIn = useLiveQuery(() => progressDb.checkIns.get(today), [today]);
  const allSenses = useLiveQuery(() => contentDb.senses.toArray(), []);
  const allWords = useLiveQuery(() => contentDb.words.toArray(), []);
  const examPriorities = useLiveQuery(() => contentDb.examPriorities.toArray(), []);
  const allRelations = useLiveQuery(() => contentDb.relations.toArray(), []);
  const allMorphemes = useLiveQuery(() => contentDb.morphemes.toArray(), []);
  const collectedWordKeys = useLiveQuery(
    () => getKnownWords(),
    [],
  );
  const examDistractorRelations = useMemo(() => (allRelations ?? []).filter((relation) => relation.relationType === "exam_distractor"), [allRelations]);
  const senseCountByWord = useMemo(() => buildSenseCountByWord(allSenses ?? []), [allSenses]);
  const confusableWords = useMemo(() => buildConfusableWordSet(allRelations ?? []), [allRelations]);
  const morphemeWords = useMemo(() => buildMorphemeWordSet(allMorphemes ?? []), [allMorphemes]);
  const functionWordSet = useMemo(() => buildFunctionWordSet(examPriorities ?? []), [examPriorities]);
  const priorityByWord = useMemo(() => new Map((examPriorities ?? []).map((row) => [row.word, row.priorityTier])), [examPriorities]);
  const mediaByWord = useMemo(() => {
    const result = new Map<string, MediaRecord>();
    for (const media of allMedia ?? []) {
      const existing = result.get(media.targetWord);
      if (!existing || (existing.status !== "approved" && media.status === "approved")) result.set(media.targetWord, media);
    }
    return result;
  }, [allMedia]);
  const exampleByWord = useMemo(() => {
    const result = new Map<string, ExampleRecord>();
    for (const example of allExamples ?? []) {
      if (example.sentenceZh && !result.has(example.word)) result.set(example.word, example);
    }
    return result;
  }, [allExamples]);
  const collectedWordSet = useMemo(() => new Set(collectedWordKeys ?? []), [collectedWordKeys]);
  const collectedWords = useMemo(() => {
    if (!allWords || !collectedWordKeys) return undefined;
    return allWords.filter((word) => collectedWordSet.has(word.word) && !functionWordSet.has(word.word));
  }, [allWords, collectedWordKeys, collectedWordSet, functionWordSet]);
  const requestedUnit = useMemo(() => {
    if (!hasUnitScope || !allWords || !examPriorities) return undefined;
    return explicitOrder ? getStudyUnit(allWords, requestedLevel, requestedUnitNumber, order) : getExamUnit(allWords, examPriorities, requestedLevel, requestedUnitNumber);
  }, [allWords, examPriorities, hasUnitScope, requestedLevel, requestedUnitNumber, explicitOrder, order]);
  const scopedCollectedWords = useMemo(() => {
    if (groupId && (!allWords || !examPriorities)) return undefined;
    // Unit groups and WordLists share itemIds/wordIds; resolve both through the same scope.
    if (groupId) return (customGroup ? resolveGroupWords(customGroup, allWords ?? []) : []).filter(w=>!functionWordSet.has(w.word));
    if (hasUnitScope) return requestedUnit?.words.filter(w=>!functionWordSet.has(w.word));
    if (levelSel === TOP_EXAM_FILTER) {
      if (!allWords || !examPriorities) return undefined;
      return sortStandaloneStudyWords(allWords, examPriorities);
    }
    if (!collectedWords) return undefined;
    if (levelSel === "全部") return collectedWords;
    return collectedWords.filter((word) => word.level === levelSel);
  }, [groupId, customGroup, allWords, collectedWords, examPriorities, hasUnitScope, levelSel, requestedUnit, functionWordSet]);
  const imagePool = useMemo(
    () => scopedCollectedWords?.filter((word) => hasWordBeastAsset(word.wordId, word.word, word.imageWordId)),
    [scopedCollectedWords],
  );
  const fillPool = useMemo(() => {
    if (!allExamples || !scopedCollectedWords) return undefined;
    const scopedWordSet = new Set(scopedCollectedWords.map((word) => word.word));
    const exactExamples = allExamples.filter((example) => !!example.blankSentence && !!example.answer);
    return filterExactFillExamples(exactExamples, scopedWordSet, functionWordSet);
  }, [allExamples, functionWordSet, scopedCollectedWords]);

  async function buildScheduledWords(candidateWords: string[]): Promise<string[]> {
    const activeLevel = hasUnitScope ? requestedLevel : levelSel;
    const levels = activeLevel.startsWith("LV") ? [activeLevel] : undefined;
    const queue = await buildTodayQueue(levels, candidateWords, !hasUnitScope && !groupId && levelSel === TOP_EXAM_FILTER);
    return queue.map((item) => item.wordRecord.word);
  }

  async function startMcq(nextMode: QuizMode) {
    if (!scopedCollectedWords || !allWords) return;
    const eligiblePool = nextMode === "image" ? imagePool ?? [] : scopedCollectedWords;
    if (eligiblePool.length < minimumPool || allWords.filter(w=>!functionWordSet.has(w.word)).length < 4) return;
    setStartingMode(nextMode);
    setStartError(null);
    try {
      const scheduledWords = freeScope ? [] : await buildScheduledWords(eligiblePool.map((word) => word.word));
      const subjects = freeScope ? shuffle(eligiblePool).slice(0, QUIZ_SIZE) : selectScheduledPracticeItems(
        eligiblePool,
        (word) => word.word,
        scheduledWords,
        collectedWordSet,
        QUIZ_SIZE,
      );
      if (subjects.length === 0) {
        setStartError("今天沒有到期或可加入額度的新字；可以改選其他範圍練習。");
        return;
      }
      resetSession();
      setQuestions(subjects.map((target) => ({
        target,
        options: shuffle([
          target,
          ...(examDistractorRelations?.length
            ? pickExamDistractors(target, allWords.filter(w=>!functionWordSet.has(w.word)), examDistractorRelations)
            : pickDistractors(target, allWords.filter(w=>!functionWordSet.has(w.word)))),
        ]),
      })));
      setMode(nextMode); setIndex(0); setScore(0); setAnswered(null); setWrongWords([]);
    } catch {
      setStartError("暫時無法整理今日題目，請再試一次。");
    } finally {
      setStartingMode(null);
    }
  }

  async function startFill() {
    if (!fillPool?.length) return;
    setStartingMode("fill");
    setStartError(null);
    try {
      const scheduledWords = freeScope ? [] : await buildScheduledWords([...new Set(fillPool.map((example) => example.word))]);
      const selected = freeScope ? shuffle(fillPool).slice(0, QUIZ_SIZE) : selectScheduledPracticeItems(
        fillPool,
        (example) => example.word,
        scheduledWords,
        collectedWordSet,
        QUIZ_SIZE,
      );
      if (selected.length === 0) {
        setStartError("今天沒有到期或可加入額度的填空單字；可以改選其他範圍練習。");
        return;
      }
      resetSession();
      setFillQuestions(selected);
      setMode("fill"); setIndex(0); setScore(0); setFillInput(""); setFillResult(null); setWrongWords([]);
    } catch {
      setStartError("暫時無法整理今日題目，請再試一次。");
    } finally {
      setStartingMode(null);
    }
  }

  function resetSession() {
    sessionId.current = crypto.randomUUID();
    sessionStarted.current = false;
    setSaveError(null);
  }

  // The textbook's primary action starts the simplest available exercise directly.
  // Other entrances retain their existing choice of practice modes.
  const startTextbookPractice = useEffectEvent(() => { void startMcq('w2m'); });
  useEffect(() => {
    if (!listId || !textbookScope || searchParams.get('start') !== 'w2m' || autoStarted.current === listId
      || mode !== null || !scopedCollectedWords?.length || !allWords || !examPriorities || !examDistractorRelations
      || allWords.filter(w => !functionWordSet.has(w.word)).length < 4) return;
    autoStarted.current = listId;
    startTextbookPractice();
  }, [listId, textbookScope, searchParams, mode, scopedCollectedWords, allWords, examPriorities, examDistractorRelations, functionWordSet]);

  async function saveAnswer(word: string, correct: boolean, reviewMode: ReviewMode): Promise<boolean> {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await recordQuizAnswer(word, correct, reviewMode, sessionId.current, !sessionStarted.current);
      sessionStarted.current = true;
      return true;
    } catch {
      setSaveError("這次作答尚未保存，請再試一次；不會先計分或跳到下一題。");
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const total = useMemo(() => mode === "fill" ? fillQuestions?.length ?? 0 : questions?.length ?? 0, [mode, questions, fillQuestions]);
  const unitLabel = groupId ? `${customGroup?.name ?? "群組"} · ` : hasUnitScope ? `Unit ${String(requestedUnitNumber).padStart(2, "0")} · ` : "";

  if (mode === null) {
    if (hasUnitScope && allWords && examPriorities && !requestedUnit) {
      return (
        <div className="realm-page trial-page">
          <TrialHeader label="找不到這個 Unit" />
          <div className="trial-empty"><span>?</span><div><h3>Unit 不存在</h3><p>回到 Unit 一覽重新選擇。</p></div><Link to="/units">查看 Units <b>→</b></Link></div>
        </div>
      );
    }
    return (
      <div className="realm-page trial-page">
        <TrialHeader label={groupId ? customGroup?.name ?? "群組練習" : hasUnitScope ? `${requestedLevel} · ${explicitOrder ? unitOrderLabel(order) : "舊版分組"} · Unit ${String(requestedUnitNumber).padStart(2, "0")}` : "單字練習"} />
        <section className="trial-intro">
          <div><p>{groupId ? `${scopedCollectedWords?.length ?? 0} 個可練習單字` : hasUnitScope ? `${requestedUnit?.words.length ?? 0} 個單字` : levelSel === TOP_EXAM_FILTER ? "S+A 學測高頻字" : "只練習已學過的單字"}</p><h2>{groupId ? <>依自己的清單，自由<em>練習。</em></> : hasUnitScope ? <>本輪連續作答，完成後再回到<em>Unit。</em></> : levelSel === TOP_EXAM_FILTER ? <>先守住高頻，再擴張你的<em>得分範圍。</em></> : <>收服只是相遇，能在情境中認出，<em>才算真的馴化。</em></>}</h2></div>
        </section>
        <div className="trial-scope"><span>{groupId ? `本輪最多 ${QUIZ_SIZE} 題 · 介係詞與連接詞等功能詞暫不出題` : hasUnitScope ? `${requestedLevel} · Unit ${String(requestedUnitNumber).padStart(2, "0")} · 本輪最多 ${QUIZ_SIZE} 題` : levelSel === TOP_EXAM_FILTER ? `高頻題庫 ${scopedCollectedWords?.length ?? 0} 字・可直接練習` : `已收集 ${scopedCollectedWords?.length ?? 0} 隻・選擇出題範圍`}</span>{groupId ? <Link to={groupReturn}>← 返回群組</Link> : hasUnitScope ? <Link className="trial-unit-return" to={`/units/${requestedLevel}/${requestedUnitNumber}${unitOrderQuery}`}>← 返回這個 Unit</Link> : <TrialLevels selected={levelSel} onChange={setLevelSel} />}</div>
        {startError && <p role="alert">{startError}</p>}
        {!groupId && !hasUnitScope && levelSel !== TOP_EXAM_FILTER && collectedWords?.length === 0 && <div className="trial-empty"><span>集</span><div><h3>還沒有可以練習的單字</h3><p>先完成收服，牠才會出現在這裡。</p></div><Link to="/wordbeast">前往收服場 <b>→</b></Link></div>}
        <section className="trial-modes" aria-label="選擇題型">
          <button onClick={() => startMcq("w2m")} disabled={!!startingMode || !scopedCollectedWords || scopedCollectedWords.length < minimumPool}><div><h3>見名辨義</h3><p>{startingMode === "w2m" ? "正在整理到期與高頻單字" : scopedCollectedWords && scopedCollectedWords.length < minimumPool ? (groupId ? "群組目前沒有可出題的單字" : "這個範圍至少要有 4 個已學單字") : "看英文單字，選出正確的中文意思"}</p></div><span>→</span></button>
          <button onClick={() => startMcq("m2w")} disabled={!!startingMode || !scopedCollectedWords || scopedCollectedWords.length < minimumPool}><div><h3>循義喚名</h3><p>{startingMode === "m2w" ? "正在整理到期與高頻單字" : scopedCollectedWords && scopedCollectedWords.length < minimumPool ? (groupId ? "群組目前沒有可出題的單字" : "這個範圍至少要有 4 個已學單字") : "看中文意思，選出正確的英文單字"}</p></div><span>→</span></button>
          <button onClick={() => startMcq("image")} disabled={!!startingMode || !imagePool || imagePool.length < minimumPool}><div><h3>看圖喚名</h3><p>{startingMode === "image" ? "正在整理到期與高頻單字" : imagePool && imagePool.length < minimumPool ? `此範圍只有 ${imagePool.length} 隻有圖字獸` : "依圖片與中文情境，選出英文單字"}</p></div><span>→</span></button>
          <button onClick={startFill} disabled={!!startingMode || !fillPool?.length}><div><h3>殘句補名</h3><p>{startingMode === "fill" ? "正在整理到期與高頻單字" : fillPool?.length ? `從 ${fillPool.length} 道單一答案例句中填入遺失的英文單字` : "尚無可使用的單一答案例句"}</p></div><span>→</span></button>
        </section>
      </div>
    );
  }

  if (index >= total) {
    const perfect = score === total;
    const wrongWordRecords = wrongWords
      .map((word) => allWords?.find((record) => record.word === word))
      .filter((word): word is WordRecord => !!word);
    return (
      <div className="realm-page trial-result-page">
        <TrialHeader label={`${unitLabel}練習結果`} />
        <div className={`trial-result-mark ${perfect ? "perfect" : ""}`}><span>{score}</span><small>/ {total}</small></div>
        <h2>{perfect ? "答對了" : "判定完成"}</h2>
        <p>{perfect ? "全部答對，所有字獸都辨認成功！" : `本輪辨認 ${score} 枚，錯過 ${total - score} 枚。`}</p>
        {todayCheckIn && <div className="trial-checkin-confirmed" role="status"><span>✓</span><div><b>今天已完成學習</b><small>完成 {todayCheckIn.reviewCount} 次練習 · 本輪紀錄已保存</small></div></div>}
        <p>新字與錯題已加入待複習；完成正式複習評分後，才會調整記憶間隔。</p>
        {wrongWordRecords.length > 0 && <section className="trial-missed" aria-labelledby="trial-missed-title"><div><h3 id="trial-missed-title">本輪需再看</h3></div><div>{wrongWordRecords.map((word) => <Link key={word.wordId} to={`/word/${word.wordId}`}><b>{word.word}</b><span>{word.meaningZh}</span><i>→</i></Link>)}</div></section>}
        <div className="trial-result-actions"><Link to="/review">前往複習</Link><button onClick={() => setMode(null)}>再練習一次</button><Link to={groupId ? groupReturn : hasUnitScope ? `/units/${requestedLevel}/${requestedUnitNumber}${unitOrderQuery}` : "/"}>{groupId ? "返回群組" : hasUnitScope ? "返回 Unit" : "返回首頁"}</Link></div>
      </div>
    );
  }

  if (mode === "fill" && fillQuestions) {
    const question = fillQuestions[index];
    async function submitFill() {
      if (fillResult !== null || savingRef.current) return;
      const correct = fillInput.trim().toLowerCase() === (question.answer ?? "").trim().toLowerCase();
      if (autoPronounce) speak(question.word);
      if (!await saveAnswer(question.word, correct, "fill-blank")) return;
      setFillResult(correct ? "correct" : "wrong");
      if (correct) setScore((current) => current + 1);
      else setWrongWords((current) => current.includes(question.word) ? current : [...current, question.word]);
    }
    return (
      <div className="realm-page active-trial-page">
        <TrialHeader label={`${unitLabel}殘句補名`} progress={`${index + 1} / ${total}`} />
        <div className="trial-progress"><i style={{ width: `${((index + 1) / total) * 100}%` }} /><span>目前辨認 {score}</span></div>
        <section className={`trial-question fill-question ${fillResult ?? ""}`}>
          <ExamTierBadge tier={priorityByWord.get(question.word)} compact />
          <WordTraitBadges senseCount={senseCountByWord.get(question.word)} hasConfusables={confusableWords.has(question.word)} hasMorphemes={morphemeWords.has(question.word)} compact />
          <h2>{question.blankSentence}</h2>
          {question.sentenceZh && <p className="trial-translation">{question.sentenceZh}</p>}
          <label><span>填入英文單字</span><input value={fillInput} onChange={(event) => setFillInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitFill()} disabled={saving || fillResult !== null} autoCapitalize="none" autoCorrect="off" /></label>
          {fillResult && <div className="trial-verdict"><b>{fillResult === "correct" ? "答對了" : "答錯了"}</b><span>{fillResult === "correct" ? question.answer : `正確答案：${question.answer}`}</span></div>}
        </section>
        {saveError && <p role="alert">{saveError}</p>}
        <button className="trial-next" disabled={saving} onClick={() => { if (fillResult === null) submitFill(); else { setIndex((current) => current + 1); setFillInput(""); setFillResult(null); } }}>{saving ? "保存中" : fillResult === null ? "確認答案" : "下一個單字"}<span>→</span></button>
      </div>
    );
  }

  if (!questions) return null;
  const question = questions[index];
  const prompt = mode === "w2m" ? question.target.word : question.target.meaningZh;
  const promptSub = mode === "w2m" ? question.target.pos : `（${question.target.pos}）`;
  const targetAsset = getWordBeastAsset(question.target.wordId, question.target.word, question.target.imageWordId);
  const imageMedia = mode === "image" ? mediaByWord.get(question.target.word) : undefined;
  const imageExample = mode === "image" ? exampleByWord.get(question.target.word) : undefined;
  const imageClue = mode === "image"
    ? resolveWordImageClue(question.target.word, targetAsset, imageMedia?.captionZh, imageExample?.sentenceZh, imageMedia?.targetHint, imageExample?.meaningHint)
    : null;
  const sealed = mode === "image" && answered === question.target.word;

  async function pick(option: WordRecord) {
    if (answered !== null || savingRef.current) return;
    const correct = option.word === question.target.word;
    const reviewMode = mode === "w2m" ? "quiz-w2m" : mode === "image" ? "quiz-image" : "quiz-m2w";
    if (autoPronounce) speak(question.target.word);
    if (!await saveAnswer(question.target.word, correct, reviewMode)) return;
    setAnswered(option.word);
    if (correct) setScore((current) => current + 1);
    else setWrongWords((current) => current.includes(question.target.word) ? current : [...current, question.target.word]);
  }

  function optionState(option: WordRecord) {
    if (answered === null) return "";
    if (option.word === question.target.word) return "correct";
    if (option.word === answered) return "wrong";
    return "muted";
  }

  return (
    <div className="realm-page active-trial-page">
      <TrialHeader label={`${unitLabel}${mode === "w2m" ? "見名辨義" : mode === "image" ? "看圖喚名" : "循義喚名"}`} progress={`${index + 1} / ${total}`} />
      <div className="trial-progress"><i style={{ width: `${((index + 1) / total) * 100}%` }} /><span>目前辨認 {score}</span></div>
      <section className={`trial-question choice-question ${mode === "image" ? "image-question" : ""} ${sealed ? "is-sealed" : ""}`}>
        <ExamTierBadge tier={priorityByWord.get(question.target.word)} compact />
        <WordTraitBadges senseCount={senseCountByWord.get(question.target.word)} hasConfusables={confusableWords.has(question.target.word)} hasMorphemes={morphemeWords.has(question.target.word)} compact />
        {mode === "image" && targetAsset ? <><ResilientBeastImage className="trial-wordbeast-clue" src={targetAsset} word={question.target.word} alt="待辨認的字獸圖卡" />{imageClue && <ImageChineseClue word={question.target} clue={imageClue} />}</> : <h2 className={mode === "w2m" ? "word-prompt" : "meaning-prompt"}>{prompt}{mode === "w2m" && <SpeakerButton text={question.target.word} className="trial-speaker" />}</h2>}
        <p className="trial-prompt-sub">{mode === "image" ? imageClue ? "依圖片與中文提示選出英文單字" : "依圖片選出英文單字" : promptSub}</p>
        {sealed && (
          <div className="trial-binding" role="status" aria-live="polite">
            <div className="trial-binding-mark" aria-hidden="true">✓</div>
            <p><b>答案確認</b><span>已記錄</span></p>
          </div>
        )}
      </section>
      <div className="trial-options">
        {question.options.map((option, optionIndex) => <button key={option.word} className={optionState(option)} disabled={saving || answered !== null} onClick={() => pick(option)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{mode === "w2m" ? option.meaningZh : option.word}</span><i /></button>)}
      </div>
      {saveError && <p role="alert">{saveError}</p>}
      {answered !== null && <button className="trial-next" onClick={() => { setIndex((current) => current + 1); setAnswered(null); }}>下一個單字<span>→</span></button>}
    </div>
  );
}
