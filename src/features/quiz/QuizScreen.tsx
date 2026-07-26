import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb } from "../../db/progressDb";
import type { ExampleRecord, WordRecord } from "../../db/types";
import { pickDistractors, shuffle } from "../../quiz/distractors";
import { pickExamDistractors } from "../../quiz/examDistractors";
import {
  DEFAULT_TRIAL_LEVELS,
  filterWordsByLevels,
  sortExamWordsByPriority,
} from "../../quiz/examScope";
import { recordQuizAnswer } from "../../checkin/recordActivity";
import SpeakerButton from "../../components/SpeakerButton";
import { getWordBeastAsset, hasWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import ResilientBeastImage from "../wordbeast/ResilientBeastImage";
import { buildConfusableWordSet, buildMorphemeWordSet, buildSenseCountByWord } from "../wordbeast/wordTraits";
import "../realm-pages.css";

const LEVEL_CHOICES = ["全部", "LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];
const QUIZ_SIZE = 10;
type QuizMode = "w2m" | "m2w" | "image" | "fill";
type TrialKind = "taming" | "expedition";
type ExpeditionScope = "LV3+LV4" | "LV3" | "LV4" | "全部";
interface McqQuestion { target: WordRecord; options: WordRecord[]; }

const EXPEDITION_SCOPES: { label: ExpeditionScope; levels: string[] }[] = [
  { label: "LV3+LV4", levels: DEFAULT_TRIAL_LEVELS },
  { label: "LV3", levels: ["LV3"] },
  { label: "LV4", levels: ["LV4"] },
  { label: "全部", levels: [] },
];

function TrialHeader({ label = "字獸馴化", progress, expedition = false }: { label?: string; progress?: string; expedition?: boolean }) {
  return <header className="realm-header trial-header"><div><p>{expedition ? "S+A EXAM EXPEDITION" : "BEAST TAMING"}</p><h1>{label}</h1></div>{progress ? <span className="realm-count">{progress}</span> : <span className="trial-seal">{expedition ? "征" : "馴"}</span>}</header>;
}

function TrialLevels({ selected, onChange }: { selected: string; onChange: (level: string) => void }) {
  return <div className="realm-levels trial-levels">{LEVEL_CHOICES.map((level) => <button key={level} className={selected === level ? "active" : ""} onClick={() => onChange(level)}>{level}</button>)}</div>;
}

export default function QuizScreen() {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [trialKind, setTrialKind] = useState<TrialKind>("taming");
  const [questions, setQuestions] = useState<McqQuestion[] | null>(null);
  const [fillQuestions, setFillQuestions] = useState<ExampleRecord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [fillInput, setFillInput] = useState("");
  const [fillResult, setFillResult] = useState<"correct" | "wrong" | null>(null);
  const [levelSel, setLevelSel] = useState("全部");
  const [expeditionScope, setExpeditionScope] = useState<ExpeditionScope>("LV3+LV4");
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);

  const allExamples = useLiveQuery(() => contentDb.examples.filter((example) => !!example.blankSentence && !!example.answer).toArray(), []);
  const allSenses = useLiveQuery(() => contentDb.senses.toArray(), []);
  const allWords = useLiveQuery(() => contentDb.words.toArray(), []);
  const examPriorities = useLiveQuery(() => contentDb.examPriorities.toArray(), []);
  const allRelations = useLiveQuery(() => contentDb.relations.toArray(), []);
  const allMorphemes = useLiveQuery(() => contentDb.morphemes.toArray(), []);
  const collectedWordKeys = useLiveQuery(
    () => progressDb.cardStates.toCollection().primaryKeys() as Promise<string[]>,
    [],
  );
  const examDistractorRelations = useMemo(() => (allRelations ?? []).filter((relation) => relation.relationType === "exam_distractor"), [allRelations]);
  const senseCountByWord = useMemo(() => buildSenseCountByWord(allSenses ?? []), [allSenses]);
  const confusableWords = useMemo(() => buildConfusableWordSet(allRelations ?? []), [allRelations]);
  const morphemeWords = useMemo(() => buildMorphemeWordSet(allMorphemes ?? []), [allMorphemes]);
  const topExamWords = useMemo(
    () => allWords ? sortExamWordsByPriority(allWords, examPriorities ?? []) : undefined,
    [allWords, examPriorities],
  );
  const expeditionWords = useMemo(() => {
    if (!topExamWords) return undefined;
    const levels = EXPEDITION_SCOPES.find((scope) => scope.label === expeditionScope)?.levels ?? [];
    return filterWordsByLevels(topExamWords, levels);
  }, [topExamWords, expeditionScope]);
  const priorityByWord = useMemo(() => new Map((examPriorities ?? []).map((row) => [row.word, row.priorityTier])), [examPriorities]);
  const collectedWordSet = useMemo(() => new Set(collectedWordKeys ?? []), [collectedWordKeys]);
  const collectedWords = useMemo(() => {
    if (!allWords || !collectedWordKeys) return undefined;
    return allWords.filter((word) => collectedWordSet.has(word.word));
  }, [allWords, collectedWordKeys, collectedWordSet]);
  const scopedCollectedWords = useMemo(() => {
    if (!collectedWords) return undefined;
    if (levelSel === "全部") return collectedWords;
    return collectedWords.filter((word) => word.level === levelSel);
  }, [collectedWords, levelSel]);
  const imagePool = useMemo(
    () => scopedCollectedWords?.filter((word) => hasWordBeastAsset(word.wordId, word.word, word.imageWordId)),
    [scopedCollectedWords],
  );
  const fillPool = useMemo(() => {
    if (!allExamples || !scopedCollectedWords) return undefined;
    const scopedWordSet = new Set(scopedCollectedWords.map((word) => word.word));
    return allExamples.filter((example) => scopedWordSet.has(example.word));
  }, [allExamples, scopedCollectedWords]);
  const expeditionFillPool = useMemo(() => {
    if (!allExamples || !expeditionWords) return undefined;
    const expeditionWordSet = new Set(expeditionWords.map((word) => word.word));
    return allExamples.filter((example) => expeditionWordSet.has(example.word));
  }, [allExamples, expeditionWords]);

  function startMcq(nextMode: QuizMode, kind: TrialKind = "taming") {
    const sourcePool = kind === "expedition" ? expeditionWords : scopedCollectedWords;
    if (!sourcePool) return;
    const eligiblePool = nextMode === "image" ? imagePool ?? [] : sourcePool;
    if (eligiblePool.length < 4) return;
    const subjects = shuffle(eligiblePool).slice(0, QUIZ_SIZE);
    setQuestions(subjects.map((target) => ({
      target,
      options: shuffle([
        target,
        ...(examDistractorRelations?.length
          ? pickExamDistractors(target, eligiblePool, examDistractorRelations)
          : pickDistractors(target, eligiblePool)),
      ]),
    })));
    setTrialKind(kind);
    setMode(nextMode); setIndex(0); setScore(0); setAnswered(null);
  }

  function startFill(kind: TrialKind = "taming") {
    const sourcePool = kind === "expedition" ? expeditionFillPool : fillPool;
    if (!sourcePool?.length) return;
    setFillQuestions(shuffle(sourcePool).slice(0, QUIZ_SIZE));
    setTrialKind(kind);
    setMode("fill"); setIndex(0); setScore(0); setFillInput(""); setFillResult(null);
  }

  const total = useMemo(() => mode === "fill" ? fillQuestions?.length ?? 0 : questions?.length ?? 0, [mode, questions, fillQuestions]);

  if (mode === null) {
    return (
      <div className="realm-page trial-page">
        <TrialHeader />
        <section className="trial-intro">
          <div><p>只馴化已收集字獸</p><h2>收服只是相遇，<br />能在情境中認出，<em>才算真的馴化。</em></h2></div>
          <div className="trial-eye" aria-hidden="true"><i /><span /></div>
        </section>
        <div className="trial-scope"><span>已收集 {scopedCollectedWords?.length ?? 0} 隻・選擇出題範圍</span><TrialLevels selected={levelSel} onChange={setLevelSel} /></div>
        {collectedWords?.length === 0 && <div className="trial-empty"><span>集</span><div><h3>還沒有可馴化的字獸</h3><p>先完成收服，牠才會出現在這裡。</p></div><Link to="/wordbeast">前往收服場 <b>→</b></Link></div>}
        <section className="trial-modes" aria-label="選擇題型">
          <button onClick={() => startMcq("w2m")} disabled={!scopedCollectedWords || scopedCollectedWords.length < 4}><b>01</b><div><h3>見名辨義</h3><p>{scopedCollectedWords && scopedCollectedWords.length < 4 ? "此範圍需收集至少 4 隻" : "看英文真名，選出正確釋義"}</p></div><span>→</span></button>
          <button onClick={() => startMcq("m2w")} disabled={!scopedCollectedWords || scopedCollectedWords.length < 4}><b>02</b><div><h3>循義喚名</h3><p>{scopedCollectedWords && scopedCollectedWords.length < 4 ? "此範圍需收集至少 4 隻" : "看中文釋義，找出真正名稱"}</p></div><span>→</span></button>
          <button onClick={() => startMcq("image")} disabled={!imagePool || imagePool.length < 4}><b>03</b><div><h3>看圖喚名</h3><p>{imagePool && imagePool.length < 4 ? `此範圍只有 ${imagePool.length} 隻有圖字獸` : "只看字獸圖卡，選出真正名稱"}</p></div><span>→</span></button>
          <button onClick={() => startFill("taming")} disabled={!fillPool?.length}><b>04</b><div><h3>殘句補名</h3><p>{fillPool?.length ? `從 ${fillPool.length} 道例句中補回遺失真名` : "尚無可使用的例句"}</p></div><span>→</span></button>
        </section>
        <section className="trial-expedition" aria-labelledby="expedition-title">
          <div className="trial-expedition-head">
            <div><p>OPEN EXAM POOL</p><h2 id="expedition-title">S+A 獨立試煉場</h2><span>不必先收服；預設用 LV3＋LV4 拉開鑑別度。</span></div>
            <strong><b>{expeditionWords?.length ?? "—"}</b> 字</strong>
          </div>
          <div className="trial-expedition-scopes" aria-label="試煉難度範圍">
            {EXPEDITION_SCOPES.map((scope) => (
              <button
                key={scope.label}
                className={expeditionScope === scope.label ? "active" : ""}
                onClick={() => setExpeditionScope(scope.label)}
              >
                {scope.label}
              </button>
            ))}
          </div>
          <div className="trial-expedition-actions">
            <button onClick={() => startMcq("w2m", "expedition")} disabled={!expeditionWords || expeditionWords.length < 4}><span>見名辨義</span><b>→</b></button>
            <button onClick={() => startMcq("m2w", "expedition")} disabled={!expeditionWords || expeditionWords.length < 4}><span>循義喚名</span><b>→</b></button>
            <button onClick={() => startFill("expedition")} disabled={!expeditionFillPool?.length}><span>例句補名</span><b>→</b></button>
          </div>
          <Link className="trial-expedition-archive" to="/browse">先看完整 S+A 字卡 <b>{topExamWords?.length ?? "—"}</b><span>→</span></Link>
          <p className="trial-expedition-note">試煉只記錄應試強弱，不會把未收服字獸算成已收服，也不推進 SM-2。</p>
        </section>
      </div>
    );
  }

  if (index >= total) {
    const perfect = score === total;
    return (
      <div className="realm-page trial-result-page">
        <TrialHeader label={trialKind === "expedition" ? "遠征結果" : "馴化結果"} expedition={trialKind === "expedition"} />
        <div className={`trial-result-mark ${perfect ? "perfect" : ""}`}><span>{score}</span><small>/ {total}</small></div>
        <p className="trial-result-kicker">{trialKind === "expedition" ? (perfect ? "FLAWLESS EXPEDITION" : "EXPEDITION COMPLETE") : (perfect ? "FLAWLESS TAMING" : "TAMING COMPLETE")}</p>
        <h2>{perfect ? "真名無誤" : "判定完成"}</h2>
        <p>{perfect ? "所有字獸都被準確辨認。" : `本輪辨認 ${score} 枚，錯過 ${total - score} 枚。`}</p>
        <div className="trial-result-actions"><button onClick={() => setMode(null)}>{trialKind === "expedition" ? "再選一場試煉" : "再馴化一次"}</button><Link to="/">返回萬字譜</Link></div>
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
      await recordQuizAnswer(question.word, correct, trialKind === "expedition" ? "expedition-fill" : "fill-blank", sessionId.current, isNewSession);
    }
    return (
      <div className="realm-page active-trial-page">
        <TrialHeader label={trialKind === "expedition" ? "S+A 例句補名" : "殘句補名"} progress={`${index + 1} / ${total}`} expedition={trialKind === "expedition"} />
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
  const targetAsset = getWordBeastAsset(question.target.wordId, question.target.word, question.target.imageWordId);
  const sealed = mode === "image" && answered === question.target.word;

  async function pick(option: WordRecord) {
    if (answered !== null) return;
    setAnswered(option.word);
    const correct = option.word === question.target.word;
    if (correct) setScore((current) => current + 1);
    const isNewSession = !sessionStarted.current; sessionStarted.current = true;
    const reviewMode = trialKind === "expedition"
      ? mode === "w2m" ? "expedition-w2m" : "expedition-m2w"
      : mode === "w2m" ? "quiz-w2m" : mode === "image" ? "quiz-image" : "quiz-m2w";
    await recordQuizAnswer(question.target.word, correct, reviewMode, sessionId.current, isNewSession);
  }

  function optionState(option: WordRecord) {
    if (answered === null) return "";
    if (option.word === question.target.word) return "correct";
    if (option.word === answered) return "wrong";
    return "muted";
  }

  return (
    <div className="realm-page active-trial-page">
      <TrialHeader label={trialKind === "expedition" ? `S+A ${mode === "w2m" ? "見名辨義" : "循義喚名"}` : mode === "w2m" ? "見名辨義" : mode === "image" ? "看圖喚名" : "循義喚名"} progress={`${index + 1} / ${total}`} expedition={trialKind === "expedition"} />
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
