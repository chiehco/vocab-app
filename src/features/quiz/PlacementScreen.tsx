import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { setSetting, ALL_LEVELS } from "../../db/progressDb";
import type { WordRecord } from "../../db/types";
import { buildPlacementQuiz, scorePlacement, type LevelResult, type PlacementQuestion } from "../../quiz/placement";
import SpeakerButton from "../../components/SpeakerButton";
import "../realm-pages.css";

type Stage = "intro" | "quiz" | "result";

function PlacementHeader({ stage, progress }: { stage: Stage; progress?: string }) {
  return (
    <header className="realm-header placement-header">
      <div><p>ENTRANCE CALIBRATION</p><h1>{stage === "intro" ? "程度測驗" : stage === "quiz" ? "程度測驗" : "測驗結果"}</h1></div>
      {progress ? <span className="realm-count">{progress}</span> : <span className="placement-seal">階</span>}
    </header>
  );
}

export default function PlacementScreen() {
  const [stage, setStage] = useState<Stage>("intro");
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [correctByLevel, setCorrectByLevel] = useState<Map<string, number>>(new Map());
  const [applied, setApplied] = useState(false);
  const navigate = useNavigate();
  const allWords = useLiveQuery(() => contentDb.words.toArray(), []);

  function start() {
    if (!allWords) return;
    setQuestions(buildPlacementQuiz(allWords)); setIndex(0); setAnswered(null);
    setCorrectByLevel(new Map()); setApplied(false); setStage("quiz");
  }

  if (stage === "intro") {
    return (
      <div className="realm-page placement-page">
        <PlacementHeader stage="intro" />
        <section className="placement-intro">
          <div className="placement-compass" aria-hidden="true"><span>位</span><i /><i /><i /></div>
          <p>CALIBRATE YOUR RANGE</p>
          <h2>看測驗建議<br />你目前的程度</h2>
          <span>LV1–LV6 各取四個單字，由易至難完成 24 題。</span>
        </section>
        <section className="placement-scale" aria-label="測試位階">
          {ALL_LEVELS.map((level, levelIndex) => <div key={level}><b>{level}</b><i /><span>{levelIndex === 0 ? "基礎" : levelIndex === ALL_LEVELS.length - 1 ? "高階" : ""}</span></div>)}
        </section>
        <div className="placement-rules"><div><b>24</b><span>題單字測驗</span></div><div><b>3–5</b><span>分鐘完成</span></div><div><b>0</b><span>不影響學習紀錄</span></div></div>
        <button onClick={start} disabled={!allWords} className="placement-start"><span>{allWords ? "開始程度測驗" : "載入中"}</span><b>→</b></button>
        <Link to="/" className="placement-back">← 返回入口</Link>
      </div>
    );
  }

  if (stage === "result") {
    const { results, recommendedLevel } = scorePlacement(ALL_LEVELS.map((level) => ({ level, correct: correctByLevel.get(level) ?? 0, total: questions.filter((question) => question.target.level === level).length })));
    return (
      <div className="realm-page placement-result-page">
        <PlacementHeader stage="result" />
        <section className="placement-verdict">
          <div className="placement-rank"><small>RECOMMENDED</small><span>{recommendedLevel}</span><b>建議從這個等級開始</b></div>
          <p>{recommendedLevel === "LV1" ? "建議從 LV1 開始建立基礎。" : `${recommendedLevel} 以前的單字已相當熟悉，從這個等級開始最有效率。`}</p>
        </section>
        <section className="placement-results" aria-label="各位階答對率">
          <div className="realm-section-head"><div><p>LEVEL READOUT</p><h2>六階判讀</h2></div><span>每階四題</span></div>
          <div className="placement-bars">{results.map((result: LevelResult) => { const pct = result.total ? (result.correct / result.total) * 100 : 0; return <div key={result.level}><span>{result.level}</span><div><i className={pct >= 75 ? "stable" : pct >= 50 ? "shifting" : "broken"} style={{ width: `${pct}%` }} /></div><b>{result.correct}/{result.total}</b></div>; })}</div>
        </section>
        <section className={`placement-apply ${applied ? "applied" : ""}`}>
          {applied ? <><span className="apply-mark">錄</span><div><h2>已套用建議等級</h2><p>尚未學過的單字將從 {recommendedLevel} 開始出現。</p></div></> : <><div><h2>套用建議等級</h2><p>把每天的新單字範圍設為 {recommendedLevel}。</p></div><button onClick={async () => { await setSetting("learningLevels", [recommendedLevel]); setApplied(true); }}>套用 {recommendedLevel}</button></>}
        </section>
        <div className="placement-result-actions"><button onClick={start}>重新測驗</button><button onClick={() => navigate("/")}>返回首頁</button></div>
      </div>
    );
  }

  const question = questions[index];
  function pick(option: WordRecord) {
    if (answered !== null) return;
    setAnswered(option.word);
    if (option.word === question.target.word) setCorrectByLevel((current) => { const next = new Map(current); next.set(question.target.level, (next.get(question.target.level) ?? 0) + 1); return next; });
  }
  function optionState(option: WordRecord) {
    if (answered === null) return "";
    if (option.word === question.target.word) return "correct";
    if (option.word === answered) return "wrong";
    return "muted";
  }
  const currentLevelIndex = Math.max(0, ALL_LEVELS.indexOf(question.target.level));

  return (
    <div className="realm-page placement-quiz-page">
      <PlacementHeader stage="quiz" progress={`${index + 1} / ${questions.length}`} />
      <div className="placement-level-track">{ALL_LEVELS.map((level, levelIndex) => <span key={level} className={levelIndex < currentLevelIndex ? "passed" : levelIndex === currentLevelIndex ? "current" : ""}>{level}</span>)}</div>
      <div className="trial-progress"><i style={{ width: `${((index + 1) / questions.length) * 100}%` }} /><span>正在判讀 {question.target.level}</span></div>
      <section className="trial-question choice-question placement-question">
        <p className="trial-question-label">IDENTIFY THE TRUE MEANING</p>
        <h2 className="word-prompt">{question.target.word}<SpeakerButton text={question.target.word} className="trial-speaker" /></h2>
        <p className="trial-prompt-sub">{question.target.pos || "詞性待補"}</p>
        <span className="question-level-stamp">{question.target.level}</span>
      </section>
      <div className="trial-options placement-options">{question.options.map((option, optionIndex) => <button key={option.word} className={optionState(option)} onClick={() => pick(option)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option.meaningZh}</span><i /></button>)}</div>
      {answered !== null && <button className="trial-next" onClick={() => { if (index + 1 >= questions.length) setStage("result"); else { setIndex((current) => current + 1); setAnswered(null); } }}>{index + 1 >= questions.length ? "查看測驗結果" : "下一題"}<span>→</span></button>}
    </div>
  );
}
