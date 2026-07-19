import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb, getSetting } from "../../db/progressDb";
import type { ExampleRecord, WordRecord } from "../../db/types";
import { pickDistractors, shuffle } from "../../quiz/distractors";
import { pickExamDistractors } from "../../quiz/examDistractors";
import { recordQuizAnswer } from "../../checkin/recordActivity";
import SpeakerButton from "../../components/SpeakerButton";
import { getWordBeastAsset, hasWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import ResilientBeastImage from "../wordbeast/ResilientBeastImage";
import { buildConfusableWordSet, buildMorphemeWordSet, buildSenseCountByWord } from "../wordbeast/wordTraits";
import "../realm-pages.css";

const TOP_PRIORITY_FILTER = "考頻5★";
const LEVEL_CHOICES = [TOP_PRIORITY_FILTER, "全部", "LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];
const QUIZ_SIZE = 10;
type QuizMode = "w2m" | "m2w" | "image" | "fill";
interface McqQuestion { target: WordRecord; options: WordRecord[]; }

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
  const [levelSel, setLevelSel] = useState(TOP_PRIORITY_FILTER);
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);

  const allExamples = useLiveQuery(() => contentDb.examples.filter((example) => !!example.blankSentence && !!example.answer).toArray(), []);
  const allWords = useLiveQuery(() => contentDb.words.toArray(), []);
  const examPriorities = useLiveQuery(() => contentDb.examPriorities.toArray(), []);
  const allRelations = useLiveQuery(() => contentDb.relations.toArray(), []);
  const allMorphemes = useLiveQuery(() => contentDb.morphemes.toArray(), []);
  const examDistractorRelations = useMemo(() => (allRelations ?? []).filter((relation) => relation.relationType === "exam_distractor"), [allRelations]);
  const senseCountByWord = useMemo(() => buildSenseCountByWord(allExamples ?? []), [allExamples]);
  const confusableWords = useMemo(() => buildConfusableWordSet(allRelations ?? []), [allRelations]);
  const morphemeWords = useMemo(() => buildMorphemeWordSet(allMorphemes ?? []), [allMorphemes]);
  const sWordSet = useMemo(() => new Set(
    (examPriorities ?? [])
      .filter((row) => row.priorityTier === "S" && !row.isFunctionWord)
      .map((row) => row.word),
  ), [examPriorities]);
  const priorityByWord = useMemo(() => new Map((examPriorities ?? []).map((row) => [row.word, row.priorityTier])), [examPriorities]);
  const fillPool = useMemo(() => {
    if (!allExamples || !allWords) return undefined;
    if (levelSel === TOP_PRIORITY_FILTER) return allExamples.filter((example) => sWordSet.has(example.word));
    if (levelSel === "全部") return allExamples;
    const levelWords = new Set(allWords.filter((word) => word.level === levelSel).map((word) => word.word));
    return allExamples.filter((example) => levelWords.has(example.word));
  }, [allExamples, allWords, levelSel, sWordSet]);

  async function startMcq(nextMode: QuizMode) {
    if (!allWords) return;
    const learned = new Set((await progressDb.cardStates.toCollection().primaryKeys()) as string[]);
    const scoped = levelSel === TOP_PRIORITY_FILTER
      ? allWords.filter((word) => sWordSet.has(word.word))
      : levelSel === "全部"
        ? allWords
        : allWords.filter((word) => word.level === levelSel);
    const levels = await getSetting<string[]>("learningLevels");
    const learnedWords = scoped.filter((word) => learned.has(word.word));
    const inScope = levelSel === "全部" ? scoped.filter((word) => levels.includes(word.level)) : scoped;
    const pool = learnedWords.length >= 4 ? learnedWords : inScope.length >= 4 ? inScope : scoped;
    const eligiblePool = nextMode === "image" ? inScope.filter((word) => hasWordBeastAsset(word.wordId, word.word)) : pool;
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
    setMode(nextMode); setIndex(0); setScore(0); setAnswered(null);
  }

  function startFill() {
    if (!fillPool?.length) return;
    setFillQuestions(shuffle(fillPool).slice(0, QUIZ_SIZE));
    setMode("fill"); setIndex(0); setScore(0); setFillInput(""); setFillResult(null);
  }

  const total = useMemo(() => mode === "fill" ? fillQuestions?.length ?? 0 : questions?.length ?? 0, [mode, questions, fillQuestions]);

  if (mode === null) {
    return (
      <div className="realm-page trial-page">
        <TrialHeader />
        <section className="trial-intro">
          <div><p>選擇今日馴化</p><h2>收服只是相遇，<br />能在情境中認出，<em>才算真的馴化。</em></h2></div>
          <div className="trial-eye" aria-hidden="true"><i /><span /></div>
        </section>
        <div className="trial-scope"><span>出題範圍</span><TrialLevels selected={levelSel} onChange={setLevelSel} /></div>
        <section className="trial-modes" aria-label="選擇題型">
          <button onClick={() => startMcq("w2m")} disabled={!allWords}><b>01</b><div><h3>見名辨義</h3><p>看英文真名，選出正確釋義</p></div><span>→</span></button>
          <button onClick={() => startMcq("m2w")} disabled={!allWords}><b>02</b><div><h3>循義喚名</h3><p>看中文釋義，找出真正名稱</p></div><span>→</span></button>
          <button onClick={() => startMcq("image")} disabled={!allWords}><b>03</b><div><h3>看圖喚名</h3><p>只看字獸圖卡，選出真正名稱</p></div><span>→</span></button>
          <button onClick={startFill} disabled={!fillPool?.length}><b>04</b><div><h3>殘句補名</h3><p>{fillPool?.length ? `從 ${fillPool.length} 道例句中補回遺失真名` : "尚無可使用的例句"}</p></div><span>→</span></button>
        </section>
      </div>
    );
  }

  if (index >= total) {
    const perfect = score === total;
    return (
      <div className="realm-page trial-result-page">
        <TrialHeader label="馴化結果" />
        <div className={`trial-result-mark ${perfect ? "perfect" : ""}`}><span>{score}</span><small>/ {total}</small></div>
        <p className="trial-result-kicker">{perfect ? "FLAWLESS TAMING" : "TAMING COMPLETE"}</p>
        <h2>{perfect ? "真名無誤" : "判定完成"}</h2>
        <p>{perfect ? "所有字獸都被準確辨認。" : `本輪辨認 ${score} 枚，錯過 ${total - score} 枚。`}</p>
        <div className="trial-result-actions"><button onClick={() => setMode(null)}>再馴化一次</button><Link to="/">返回萬字譜</Link></div>
      </div>
    );
  }

  if (mode === "fill" && fillQuestions) {
    const question = fillQuestions[index];
    async function submitFill() {
      if (fillResult !== null) return;
      const correct = fillInput.trim().toLowerCase() === (question.answer ?? "").trim().toLowerCase();
      setFillResult(correct ? "correct" : "wrong");
      if (correct) setScore((current) => current + 1);
      const isNewSession = !sessionStarted.current; sessionStarted.current = true;
      await recordQuizAnswer(question.word, correct, "fill-blank", sessionId.current, isNewSession);
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
          <label><span>填入真名</span><input value={fillInput} onChange={(event) => setFillInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitFill()} disabled={fillResult !== null} autoCapitalize="none" autoCorrect="off" /></label>
          {fillResult && <div className="trial-verdict"><b>{fillResult === "correct" ? "辨名成功" : "真名有誤"}</b><span>{fillResult === "correct" ? question.answer : `正確答案：${question.answer}`}</span></div>}
        </section>
        <button className="trial-next" onClick={() => { if (fillResult === null) submitFill(); else { setIndex((current) => current + 1); setFillInput(""); setFillResult(null); } }}>{fillResult === null ? "確認馴化" : "下一隻字獸"}<span>→</span></button>
      </div>
    );
  }

  if (!questions) return null;
  const question = questions[index];
  const prompt = mode === "w2m" ? question.target.word : question.target.meaningZh;
  const promptSub = mode === "w2m" ? question.target.pos : `（${question.target.pos}）`;
  const targetAsset = getWordBeastAsset(question.target.wordId, question.target.word);
  const sealed = mode === "image" && answered === question.target.word;

  async function pick(option: WordRecord) {
    if (answered !== null) return;
    setAnswered(option.word);
    const correct = option.word === question.target.word;
    if (correct) setScore((current) => current + 1);
    const isNewSession = !sessionStarted.current; sessionStarted.current = true;
    await recordQuizAnswer(question.target.word, correct, mode === "w2m" ? "quiz-w2m" : mode === "image" ? "quiz-image" : "quiz-m2w", sessionId.current, isNewSession);
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
      <section className={`trial-question choice-question ${sealed ? "is-sealed" : ""}`}>
        <ExamTierBadge tier={priorityByWord.get(question.target.word)} compact />
        <WordTraitBadges senseCount={senseCountByWord.get(question.target.word)} hasConfusables={confusableWords.has(question.target.word)} hasMorphemes={morphemeWords.has(question.target.word)} compact />
        <p className="trial-question-label">SPEAK THE TRUE ANSWER</p>
        {mode === "image" && targetAsset ? <ResilientBeastImage className="trial-wordbeast-clue" src={targetAsset} word={question.target.word} alt="待辨認的字獸圖卡" /> : <h2 className={mode === "w2m" ? "word-prompt" : "meaning-prompt"}>{prompt}{mode === "w2m" && <SpeakerButton text={question.target.word} className="trial-speaker" />}</h2>}
        <p className="trial-prompt-sub">{mode === "image" ? "看圖選出真名" : promptSub}</p>
        {sealed && (
          <div className="trial-binding" role="status" aria-live="polite">
            <div className="trial-binding-rings" aria-hidden="true"><i /><i /><i /></div>
            <div className="trial-binding-mark" aria-hidden="true">封</div>
            <p><b>真名確認</b><span>封印完成</span></p>
          </div>
        )}
      </section>
      <div className="trial-options">
        {question.options.map((option, optionIndex) => <button key={option.word} className={optionState(option)} onClick={() => pick(option)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{mode === "w2m" ? option.meaningZh : option.word}</span><i /></button>)}
      </div>
      {answered !== null && <button className="trial-next" onClick={() => { setIndex((current) => current + 1); setAnswered(null); }}>下一隻字獸<span>→</span></button>}
    </div>
  );
}
