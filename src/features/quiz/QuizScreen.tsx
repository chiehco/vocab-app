import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getKnownWords } from "../../db/progressIdentity";
import { contentDb } from "../../db/contentDb";
import { progressDb } from "../../db/progressDb";
import type { ExampleRecord, MediaRecord, ReviewMode, WordRecord } from "../../db/types";
import { pickDistractors, shuffle } from "../../quiz/distractors";
import { pickExamDistractors } from "../../quiz/examDistractors";
import { buildFunctionWordSet, filterExactFillExamples, sortExamWordsByPriority, TOP_EXAM_FILTER } from "../../quiz/examScope";
import { recordQuizAnswer } from "../../checkin/recordActivity";
import SpeakerButton from "../../components/SpeakerButton";
import { getWordBeastAsset, hasWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import ResilientBeastImage from "../wordbeast/ResilientBeastImage";
import { buildConfusableWordSet, buildMorphemeWordSet, buildSenseCountByWord } from "../wordbeast/wordTraits";
import { findImageClueHighlight, resolveImageClueCopy, splitImageCaption, type ImageClueCopy } from "../../quiz/imageClue";
import { useToday } from "../../hooks/useToday";
import "../realm-pages.css";

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
      {!answer && fallback && <small>指定回答：<b>{fallback}</b></small>}
    </div>
  );
}

function TrialHeader({ label = "字獸馴化", progress }: { label?: string; progress?: string }) {
  return <header className="realm-header trial-header"><div><p>BEAST TAMING</p><h1>{label}</h1></div>{progress ? <span className="realm-count">{progress}</span> : <span className="trial-seal">馴</span>}</header>;
}

function TrialLevels({ selected, onChange }: { selected: string; onChange: (level: string) => void }) {
  return <div className="realm-levels trial-levels">{LEVEL_CHOICES.map((level) => <button key={level} className={selected === level ? "active" : ""} onClick={() => onChange(level)}>{level}</button>)}</div>;
}

export default function QuizScreen() {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [questions, setQuestions] = useState<McqQuestion[] | null>(null);
  const [fillQuestions, setFillQuestions] = useState<ExampleRecord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [fillInput, setFillInput] = useState("");
  const [fillResult, setFillResult] = useState<"correct" | "wrong" | null>(null);
  const [levelSel, setLevelSel] = useState(TOP_EXAM_FILTER);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const today = useToday();

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
    return allWords.filter((word) => collectedWordSet.has(word.word));
  }, [allWords, collectedWordKeys, collectedWordSet]);
  const scopedCollectedWords = useMemo(() => {
    if (levelSel === TOP_EXAM_FILTER) {
      if (!allWords || !examPriorities) return undefined;
      return sortExamWordsByPriority(allWords, examPriorities);
    }
    if (!collectedWords) return undefined;
    if (levelSel === "全部") return collectedWords;
    return collectedWords.filter((word) => word.level === levelSel);
  }, [allWords, collectedWords, examPriorities, levelSel]);
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

  function startMcq(nextMode: QuizMode) {
    if (!scopedCollectedWords || !allWords) return;
    const eligiblePool = nextMode === "image" ? imagePool ?? [] : scopedCollectedWords;
    if (eligiblePool.length < 4) return;
    resetSession();
    const subjects = shuffle(eligiblePool).slice(0, QUIZ_SIZE);
    setQuestions(subjects.map((target) => ({
      target,
      options: shuffle([
        target,
        ...(examDistractorRelations?.length
          ? pickExamDistractors(target, allWords, examDistractorRelations)
          : pickDistractors(target, allWords)),
      ]),
    })));
    setMode(nextMode); setIndex(0); setScore(0); setAnswered(null); setWrongWords([]);
  }

  function startFill() {
    if (!fillPool?.length) return;
    resetSession();
    setFillQuestions(shuffle(fillPool).slice(0, QUIZ_SIZE));
    setMode("fill"); setIndex(0); setScore(0); setFillInput(""); setFillResult(null); setWrongWords([]);
  }

  function resetSession() {
    sessionId.current = crypto.randomUUID();
    sessionStarted.current = false;
    setSaveError(null);
  }

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

  if (mode === null) {
    return (
      <div className="realm-page trial-page">
        <TrialHeader />
        <section className="trial-intro">
          <div><p>{levelSel === TOP_EXAM_FILTER ? "S＋A 高頻考詞" : "只馴化已收集字獸"}</p><h2>{levelSel === TOP_EXAM_FILTER ? <>先守住高頻，<br />再擴張你的<em>得分範圍。</em></> : <>收服只是相遇，<br />能在情境中認出，<em>才算真的馴化。</em></>}</h2></div>
          <div className="trial-eye" aria-hidden="true"><i /><span /></div>
        </section>
        <div className="trial-scope"><span>{levelSel === TOP_EXAM_FILTER ? `高頻題庫 ${scopedCollectedWords?.length ?? 0} 字・可直接練習` : `已收集 ${scopedCollectedWords?.length ?? 0} 隻・選擇出題範圍`}</span><TrialLevels selected={levelSel} onChange={setLevelSel} /></div>
        {levelSel !== TOP_EXAM_FILTER && collectedWords?.length === 0 && <div className="trial-empty"><span>集</span><div><h3>還沒有可馴化的字獸</h3><p>先完成收服，牠才會出現在這裡。</p></div><Link to="/wordbeast">前往收服場 <b>→</b></Link></div>}
        <section className="trial-modes" aria-label="選擇題型">
          <button onClick={() => startMcq("w2m")} disabled={!scopedCollectedWords || scopedCollectedWords.length < 4}><b>01</b><div><h3>見名辨義</h3><p>{scopedCollectedWords && scopedCollectedWords.length < 4 ? "此範圍需收集至少 4 隻" : "看英文真名，選出正確釋義"}</p></div><span>→</span></button>
          <button onClick={() => startMcq("m2w")} disabled={!scopedCollectedWords || scopedCollectedWords.length < 4}><b>02</b><div><h3>循義喚名</h3><p>{scopedCollectedWords && scopedCollectedWords.length < 4 ? "此範圍需收集至少 4 隻" : "看中文釋義，找出真正名稱"}</p></div><span>→</span></button>
          <button onClick={() => startMcq("image")} disabled={!imagePool || imagePool.length < 4}><b>03</b><div><h3>看圖喚名</h3><p>{imagePool && imagePool.length < 4 ? `此範圍只有 ${imagePool.length} 隻有圖字獸` : "依圖片與中文情境，選出英文單字"}</p></div><span>→</span></button>
          <button onClick={startFill} disabled={!fillPool?.length}><b>04</b><div><h3>殘句補名</h3><p>{fillPool?.length ? `從 ${fillPool.length} 道單一答案例句中補回遺失真名` : "尚無可使用的單一答案例句"}</p></div><span>→</span></button>
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
        <TrialHeader label="馴化結果" />
        <div className={`trial-result-mark ${perfect ? "perfect" : ""}`}><span>{score}</span><small>/ {total}</small></div>
        <p className="trial-result-kicker">{perfect ? "FLAWLESS TAMING" : "TAMING COMPLETE"}</p>
        <h2>{perfect ? "真名無誤" : "判定完成"}</h2>
        <p>{perfect ? "所有字獸都被準確辨認。" : `本輪辨認 ${score} 枚，錯過 ${total - score} 枚。`}</p>
        {todayCheckIn && <div className="trial-checkin-confirmed" role="status"><span>✓</span><div><b>今日已打卡</b><small>完成 {todayCheckIn.reviewCount} 次練習 · 本輪紀錄已保存</small></div></div>}
        <p>新字與錯題已加入待回想；完成正式回想評分後，才會調整記憶間隔。</p>
        {wrongWordRecords.length > 0 && <section className="trial-missed" aria-labelledby="trial-missed-title"><div><p>REVIEW NEXT</p><h3 id="trial-missed-title">本輪需再看</h3></div><div>{wrongWordRecords.map((word) => <Link key={word.wordId} to={`/word/${word.wordId}`}><b>{word.word}</b><span>{word.meaningZh}</span><i>→</i></Link>)}</div></section>}
        <div className="trial-result-actions"><Link to="/review">前往回想複習</Link><button onClick={() => setMode(null)}>再馴化一次</button><Link to="/">返回萬字譜</Link></div>
      </div>
    );
  }

  if (mode === "fill" && fillQuestions) {
    const question = fillQuestions[index];
    async function submitFill() {
      if (fillResult !== null) return;
      const correct = fillInput.trim().toLowerCase() === (question.answer ?? "").trim().toLowerCase();
      if (!await saveAnswer(question.word, correct, "fill-blank")) return;
      setFillResult(correct ? "correct" : "wrong");
      if (correct) setScore((current) => current + 1);
      else setWrongWords((current) => current.includes(question.word) ? current : [...current, question.word]);
    }
    return (
      <div className="realm-page active-trial-page">
        <TrialHeader label="殘句補名" progress={`${index + 1} / ${total}`} />
        <div className="trial-progress"><i style={{ width: `${((index + 1) / total) * 100}%` }} /><span>目前辨認 {score}</span></div>
        <section className={`trial-question fill-question ${fillResult ?? ""}`}>
          <ExamTierBadge tier={priorityByWord.get(question.word)} compact />
          <WordTraitBadges senseCount={senseCountByWord.get(question.word)} hasConfusables={confusableWords.has(question.word)} hasMorphemes={morphemeWords.has(question.word)} compact />
          <p className="trial-question-label">RESTORE THE MISSING NAME</p>
          <h2>{question.blankSentence}</h2>
          {question.sentenceZh && <p className="trial-translation">{question.sentenceZh}</p>}
          <label><span>填入真名</span><input value={fillInput} onChange={(event) => setFillInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitFill()} disabled={saving || fillResult !== null} autoCapitalize="none" autoCorrect="off" /></label>
          {fillResult && <div className="trial-verdict"><b>{fillResult === "correct" ? "辨名成功" : "真名有誤"}</b><span>{fillResult === "correct" ? question.answer : `正確答案：${question.answer}`}</span></div>}
        </section>
        {saveError && <p role="alert">{saveError}</p>}
        <button className="trial-next" disabled={saving} onClick={() => { if (fillResult === null) submitFill(); else { setIndex((current) => current + 1); setFillInput(""); setFillResult(null); } }}>{saving ? "保存中" : fillResult === null ? "確認馴化" : "下一隻字獸"}<span>→</span></button>
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
    ? resolveImageClueCopy(imageMedia?.captionZh, imageExample?.sentenceZh, imageMedia?.targetHint, imageExample?.meaningHint)
    : null;
  const sealed = mode === "image" && answered === question.target.word;

  async function pick(option: WordRecord) {
    if (answered !== null) return;
    const correct = option.word === question.target.word;
    const reviewMode = mode === "w2m" ? "quiz-w2m" : mode === "image" ? "quiz-image" : "quiz-m2w";
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
      <TrialHeader label={mode === "w2m" ? "見名辨義" : mode === "image" ? "看圖喚名" : "循義喚名"} progress={`${index + 1} / ${total}`} />
      <div className="trial-progress"><i style={{ width: `${((index + 1) / total) * 100}%` }} /><span>目前辨認 {score}</span></div>
      <section className={`trial-question choice-question ${mode === "image" ? "image-question" : ""} ${sealed ? "is-sealed" : ""}`}>
        <ExamTierBadge tier={priorityByWord.get(question.target.word)} compact />
        <WordTraitBadges senseCount={senseCountByWord.get(question.target.word)} hasConfusables={confusableWords.has(question.target.word)} hasMorphemes={morphemeWords.has(question.target.word)} compact />
        <p className="trial-question-label">SPEAK THE TRUE ANSWER</p>
        {mode === "image" && targetAsset ? <><ResilientBeastImage className="trial-wordbeast-clue" src={targetAsset} word={question.target.word} alt="待辨認的字獸圖卡" />{imageClue && <ImageChineseClue word={question.target} clue={imageClue} />}</> : <h2 className={mode === "w2m" ? "word-prompt" : "meaning-prompt"}>{prompt}{mode === "w2m" && <SpeakerButton text={question.target.word} className="trial-speaker" />}</h2>}
        <p className="trial-prompt-sub">{mode === "image" ? imageClue ? "依圖片與中文提示選出英文單字" : "依圖片選出英文單字" : promptSub}</p>
        {sealed && (
          <div className="trial-binding" role="status" aria-live="polite">
            <div className="trial-binding-rings" aria-hidden="true"><i /><i /><i /></div>
            <div className="trial-binding-mark" aria-hidden="true">封</div>
            <p><b>真名確認</b><span>封印完成</span></p>
          </div>
        )}
      </section>
      <div className="trial-options">
        {question.options.map((option, optionIndex) => <button key={option.word} className={optionState(option)} disabled={saving || answered !== null} onClick={() => pick(option)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{mode === "w2m" ? option.meaningZh : option.word}</span><i /></button>)}
      </div>
      {saveError && <p role="alert">{saveError}</p>}
      {answered !== null && <button className="trial-next" onClick={() => { setIndex((current) => current + 1); setAnswered(null); }}>下一隻字獸<span>→</span></button>}
    </div>
  );
}
