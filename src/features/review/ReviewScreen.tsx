import { useUpcomingIllustrations } from "../wordbeast/useUpcomingIllustrations";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { DEFAULT_SETTINGS, getSetting } from "../../db/progressDb";
import { getCardState } from "../../db/progressIdentity";
import { addDaysStr, todayStr } from "../../lib/dates";
import { useCardPronunciation } from "../../hooks/useCardPronunciation";
import { useToday } from "../../hooks/useToday";
import type { Grade, WordRecord } from "../../db/types";
import { buildTodayQueue, buildTodayRecapQueue, type QueueItem } from "../../srs/queue";
import { gradeFlashcard, markWordKnown, recordReviewWithoutScheduling } from "../../checkin/recordActivity";
import { GRADE_LABELS, KNOWN_INTERVAL_DAYS, newCardState, scheduleRecall } from "../../srs/sm2";
import { NOTE_TYPE_LABEL } from "../browser/wordLabels";
import SpeakerButton from "../../components/SpeakerButton";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import StudyIllustration from "../wordbeast/StudyIllustration";
import { useIllustrationMedia } from "../wordbeast/useIllustrationMedia";
import { buildConfusableWordSet, buildSenseCountByWord } from "../wordbeast/wordTraits";
import { TOP_EXAM_FILTER, standaloneStudyPriorities, buildFunctionWordSet } from "../../quiz/examScope";
import { pickDistractors, shuffle } from "../../quiz/distractors";
import { pickExamDistractors } from "../../quiz/examDistractors";
import "./review.css";
import { getDailyLearningPlan } from '../../srs/dailyPlan';
import { getDueReviewQueue } from '../../srs/dueReview';

const LEVEL_CHOICES = [TOP_EXAM_FILTER, "全部", "LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];

function LevelFilter({ selected, onChange }: { selected: string; onChange: (level: string) => void }) {
  return (
    <div className="level-tabs seal-levels" aria-label="篩選等級">
      {LEVEL_CHOICES.map((level) => (
        <button key={level} onClick={() => onChange(level)} aria-pressed={selected === level}>{level}</button>
      ))}
    </div>
  );
}

function WordSigil({ word }: { word: string }) {
  const hash = [...word].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const turn = hash % 46 - 23;
  const spokes = 4 + (hash % 4);
  return (
    <svg className="word-sigil" viewBox="0 0 220 220" role="img" aria-label={`${word} 的暫定封印符號`}>
      <circle cx="110" cy="110" r="77" />
      <circle cx="110" cy="110" r="55" className="sigil-dash" />
      <g transform={`rotate(${turn} 110 110)`}>
        {Array.from({ length: spokes }, (_, index) => {
          const angle = (360 / spokes) * index;
          return <path key={index} d="M110 33 V62" transform={`rotate(${angle} 110 110)`} />;
        })}
        <path d="M73 110 110 65 147 110 110 155Z" />
        <path d="M65 110 H155 M110 65 V155" />
      </g>
      <text x="110" y="124" textAnchor="middle">{word.slice(0, 1).toUpperCase()}</text>
    </svg>
  );
}

function ScreenState({ type, level }: { type: "loading" | "empty"; level: string }) {
  return (
    <div className="seal-review seal-state-page">
      <header className="seal-review-header"><Link to="/">← 首頁</Link><span>複習</span><b /></header>
      <LevelFilter selected={level} onChange={() => undefined} />
      <div className={`seal-state-mark ${type}`} aria-hidden="true">{type === "loading" ? "" : "✓"}</div>
      <h1>{type === "loading" ? "載入中" : "今天的複習已完成"}</h1>
      <p>{type === "loading" ? "正在整理今天要複習的單字。" : level === "全部" ? "今天沒有要複習的單字。" : `${level} 今天沒有要複習的單字。`}</p>
      {type === "empty" && <Link to="/" className="seal-state-action">返回首頁</Link>}
    </div>
  );
}

export default function ReviewScreen() {
  const [params] = useSearchParams();
  const dueOnly = params.get('due') === '1';
  const today = useToday();
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [levelSel, setLevelSel] = useState(dueOnly ? '全部' : TOP_EXAM_FILTER);
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useCardPronunciation(queue?.[index]?.wordRecord.word, `${levelSel}:${index}`);
  useUpcomingIllustrations(queue?.map(item => item.wordRecord), index);
  const allWords = useLiveQuery(() => contentDb.words.toArray(), []);
  const examDistractorRelations = useLiveQuery(() => contentDb.relations.where("relationType").equals("exam_distractor").toArray(), []);
  const functionWordSet = useLiveQuery(async () => buildFunctionWordSet(await contentDb.examPriorities.toArray()), []);
  const currentWord = queue?.[index]?.wordRecord;
  // 一個字只洗一次選項，避免每次 render 換位置；湊不到三個干擾項就退回「顯示答案」流程。
  const options = useMemo<WordRecord[] | null>(() => {
    if (!currentWord || !allWords || !functionWordSet || !currentWord.meaningZh) return null;
    const pool = allWords.filter((w) => !functionWordSet.has(w.word));
    const distractors = examDistractorRelations?.length
      ? pickExamDistractors(currentWord, pool, examDistractorRelations)
      : pickDistractors(currentWord, pool);
    if (distractors.length < 3) return null;
    return shuffle([currentWord, ...distractors]);
  }, [currentWord, allWords, functionWordSet, examDistractorRelations]);

  useEffect(() => {
    let cancelled = false;
    setQueue(null);
    setIndex(0);
    setFlipped(false);
    setDoneCount(0);
    setSaveError(null);
    sessionId.current = crypto.randomUUID();
    sessionStarted.current = false;
    const loadQueue = async () => {
      if (dueOnly) {
        const due = await getDueReviewQueue(today);
        const priorities = levelSel === TOP_EXAM_FILTER ? new Set(standaloneStudyPriorities(await contentDb.examPriorities.toArray()).map(p => p.word)) : undefined;
        if (!cancelled) setQueue(due.filter(i => levelSel === '全部' || (priorities ? priorities.has(i.wordRecord.word) : i.wordRecord.level===levelSel)));
        return;
      }
      const isTopExam = levelSel === TOP_EXAM_FILTER;
      const levels = levelSel === "全部" || isTopExam ? undefined : [levelSel];
      const priorities = await contentDb.examPriorities.toArray();
      const functionWords = buildFunctionWordSet(priorities);
      const prioritizedWords = isTopExam
        ? standaloneStudyPriorities(priorities).map(row=>row.word)
        : (await contentDb.words.toArray()).filter(w=>!functionWords.has(w.word) && (!levels || levels.includes(w.level))).map(w=>w.word);
      const nextQueue = await buildTodayQueue(levels, prioritizedWords, isTopExam);
      const hasDueCards = nextQueue.some((item) => !item.isNew);
      const recapQueue = hasDueCards ? [] : await buildTodayRecapQueue(levels, prioritizedWords);
      const resolvedQueue = recapQueue.length > 0 ? recapQueue : nextQueue;
      if (!cancelled) setQueue(resolvedQueue);
    };
    loadQueue();
    return () => { cancelled = true; };
  }, [levelSel, today, dueOnly]);

  if (queue === null) return <ScreenState type="loading" level={levelSel} />;
  if (queue.length === 0) {
    return (
      <div className="seal-review seal-state-page">
        <header className="seal-review-header"><Link to="/">← 首頁</Link><span>複習</span><b /></header>
        <LevelFilter selected={levelSel} onChange={setLevelSel} />
        <div className="seal-state-mark empty" aria-hidden="true">✓</div>
        <h1>今天的複習已完成</h1>
        <p>{levelSel === "全部" ? "今天沒有要複習的單字。" : levelSel === TOP_EXAM_FILTER ? "今天沒有待複習的 S+A 高頻單字。" : `${levelSel} 今天沒有要複習的單字。`}</p>
        <Link to="/" className="seal-state-action">返回首頁</Link>
      </div>
    );
  }

  if (index >= queue.length) {
    const wasRecap = queue.some((item) => item.isRecap);
    return (
      <div className="seal-review seal-state-page complete">
        <header className="seal-review-header"><Link to="/">← 首頁</Link><span>複習</span><b /></header>
        <div className="seal-complete-ring" aria-hidden="true">✓</div>
        <h1>複習完成</h1>
        <p>{wasRecap ? `剛學過的 ${doneCount} 個單字已再複習一次，明天仍會照原定時間出現。` : `已完成 ${doneCount} 個單字的複習，今天的學習紀錄已保存。`}</p>
        <Link to="/" className="seal-state-action">返回首頁</Link>
      </div>
    );
  }

  const item = queue[index];

  async function handleGrade(grade: Grade) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    const isNewSession = !sessionStarted.current;
    try {
      if (levelSel === TOP_EXAM_FILTER && item.isNew && !(await getCardState(item.wordRecord.word)) && (await getDailyLearningPlan()).remainingNew <= 0) {
        setSaveError('今天的新字份量已完成。可回學測專區查看複習安排，或自行選擇單元練習。');
        return;
      }
      if (item.isRecap) {
        await recordReviewWithoutScheduling(item.wordRecord.word, grade, sessionId.current, isNewSession);
      } else {
        await gradeFlashcard(item.wordRecord.word, grade, sessionId.current, isNewSession);
      }
      sessionStarted.current = true;
      setDoneCount((count) => count + 1);
      setFlipped(false);
      setIndex((current) => current + 1);
    } catch {
      setSaveError("這次評分尚未保存，請再試一次。完成保存後才會進入下一張。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleKnown() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await markWordKnown(item.wordRecord.word, sessionId.current);
      sessionStarted.current = true;
      setDoneCount((count) => count + 1);
      setFlipped(false);
      setIndex((current) => current + 1);
    } catch {
      setSaveError("這次紀錄尚未保存，請再試一次。完成保存後才會進入下一張。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className={`seal-review ${flipped ? "is-flipped" : ""}`}>
      <header className="seal-review-header">
        <Link to="/">← 首頁</Link>
        <span>{levelSel === TOP_EXAM_FILTER ? "高頻複習" : item.isRecap ? "今天學過的字" : "複習"}</span>
        <b>{String(index + 1).padStart(2, "0")} / {String(queue.length).padStart(2, "0")}</b>
      </header>

      {index === 0 && !flipped && <LevelFilter selected={levelSel} onChange={setLevelSel} />}

      <div className="seal-progress"><i style={{ width: `${(index / queue.length) * 100}%` }} /><span>{item.isPractice ? "練習後再複習一次，確認記得了才排下次" : item.isRecap ? "今天再看一次，不改變下次複習時間" : `${doneCount} 個已完成複習`}</span></div>
      {saveError && <p role="alert">{saveError}</p>}

      <Flashcard
        key={item.wordRecord.word}
        item={item}
        flipped={flipped}
        options={options}
        onFlip={() => {
          setFlipped(true);
        }}
        onGrade={handleGrade}
        onKnown={handleKnown}
        position={index + 1}
        saving={saving}
      />
    </div>
  );
}

function Flashcard({ item, flipped, options, onFlip, onGrade, onKnown, position, saving }: { item: QueueItem; flipped: boolean; options: WordRecord[] | null; onFlip: () => void; onGrade: (grade: Grade) => void; onKnown: () => void; position: number; saving: boolean }) {
  const word = item.wordRecord;
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked !== null && picked === word.word;
  const answeredGrade: Grade = correct ? 2 : 0;
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  // 翻面後右滑等於「下一張」；水平位移要明顯大於垂直，避免和捲動衝突。
  function onPointerDown(event: React.PointerEvent) {
    swipeStart.current = flipped && options ? { x: event.clientX, y: event.clientY } : null;
  }
  function onPointerUp(event: React.PointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || !flipped || !options || saving) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (dx > 60 && dx > Math.abs(dy) * 1.5) onGrade(answeredGrade);
  }
  const illustration = useIllustrationMedia(word);
  const card = useLiveQuery(() => getCardState(word.word), [word.word]);
  const examDate = useLiveQuery(
    () => getSetting<string>("examDate"),
    [],
    DEFAULT_SETTINGS.examDate,
  );
  function nextReviewLabel(grade: Grade) {
    if (item.isRecap) return grade === 0 ? "加入待複習" : "維持原本的複習時間";
    const today = todayStr();
    const current = card ?? newCardState(word.word, today);
    const next = scheduleRecall(current, grade, today, examDate);
    return `${next === current ? "維持" : "複習"} ${next.dueDate.slice(5).replace("-", "/")}`;
  }
  function addDaysLabel(days: number) {
    return addDaysStr(todayStr(), days).slice(5).replace("-", "/");
  }
  const notes = useLiveQuery(() => contentDb.notes.where("word").equals(word.word).toArray(), [word.word]);
  const priority = useLiveQuery(() => contentDb.examPriorities.where("word").equals(word.word).first(), [word.word]);
  const senses = useLiveQuery(() => contentDb.senses.where("wordId").equals(word.wordId).sortBy("senseOrder"), [word.wordId]);
  const relations = useLiveQuery(() => contentDb.relations.filter((relation) => relation.word === word.word || relation.relatedWord === word.word).toArray(), [word.word]);
  const morphemes = useLiveQuery(() => contentDb.morphemes.where("word").equals(word.word).toArray(), [word.word]);
  const beastAsset = getWordBeastAsset(word.wordId, word.word, word.imageWordId);
  const illustrationMeaning = beastAsset && (!word.imageWordId || word.imageWordId === word.wordId)
    ? illustration?.targetHint?.trim() : undefined;
  const senseCount = buildSenseCountByWord(senses ?? []).get(word.word) ?? 0;

  return (
    <div className="seal-workspace" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipeStart.current = null; }}>
      <article className={`seal-card study-layout ${flipped ? "revealed" : "sealed"}`}>
        <div className="seal-card-meta">
          <span>{item.isPractice ? "練習後待複習" : item.isRecap ? "今天再複習" : item.isNew ? "尚未學過的單字" : "到期複習"}</span>
          <div><ExamTierBadge tier={priority?.priorityTier} compact /><b>第 {position} 張</b></div>
        </div>

        <div className="seal-card-identity">
          <div><h1>{word.word}</h1><SpeakerButton text={word.word} className="seal-speaker" /></div>
          <p>{word.pos || "詞性待補"}{word.phoneticUs && <> · /{word.phoneticUs}/</>}</p>
          {flipped && <h2>{illustrationMeaning || word.meaningZh || "尚無中文意思"}</h2>}
          <WordTraitBadges senseCount={senseCount} hasConfusables={buildConfusableWordSet(relations ?? []).has(word.word)} hasMorphemes={!!morphemes?.length} compact />
        </div>

        {beastAsset ? <StudyIllustration src={beastAsset} word={word.word} caption={flipped ? illustration?.captionZh : undefined} /> : <div className="seal-card-visual">
          <WordSigil word={word.word} /><small>圖片尚未收錄</small>
        </div>}

        {flipped && (
          <div className="seal-card-answer">
            <p className="answer-label">完整意思{senses && senses.length > 1 ? `（共 ${senses.length} 個）` : ""}</p>
            <h2>{word.meaningZh || "尚無中文意思"}</h2>
            {senses && senses.length > 1 && <ol className="answer-senses">{senses.map((sense) => <li key={sense.senseId}><span>{sense.sensePos}</span><b>{sense.meaningZh}</b>{sense.isExamSense && <small>學測出現情形</small>}</li>)}</ol>}
            {word.meaningEn && <p className="answer-en">{word.meaningEn}</p>}
            {word.usagePattern && <div className="answer-note"><span>用法</span><p>{word.usagePattern}</p></div>}
            {notes?.map((note) => (
              <div className="answer-note" key={note.noteId}>
                <span>{NOTE_TYPE_LABEL[note.noteType] ?? note.noteType}{note.title ? ` · ${note.title}` : ""}</span>
                <p>{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className="seal-controls">
        {options ? (
          <div className={`seal-options ${flipped ? "is-answered" : ""}`} aria-label={flipped ? "作答結果" : "選出正確的中文意思"}>
            {options.map((option, optionIndex) => (
              <button
                key={option.word}
                className={!flipped ? "" : option.word === word.word ? "correct" : option.word === picked ? "wrong" : "muted"}
                disabled={saving || flipped}
                onClick={() => { setPicked(option.word); onFlip(); }}
              >
                <b>{String.fromCharCode(65 + optionIndex)}</b><span>{option.meaningZh}</span>
              </button>
            ))}
            {flipped && (
              <div className="seal-answered">
                {correct ? (
                  <button className="seal-known" disabled={saving} onClick={onKnown}>
                    <span>我已經會了</span>
                    <small>{saving ? "保存中" : `複習 ${addDaysLabel(KNOWN_INTERVAL_DAYS)}`}</small>
                  </button>
                ) : (
                  <button className="seal-next is-wrong" disabled={saving} onClick={() => onGrade(0)}>
                    <span>記錯了，下一張</span>
                    <small>{saving ? "保存中" : nextReviewLabel(0)}</small>
                  </button>
                )}
                <button type="button" className="seal-swipe-hint" disabled={saving} onClick={() => onGrade(answeredGrade)}>
                  {correct ? `答對了 · 右滑或點這裡到下一張（${nextReviewLabel(2)}）` : "右滑也可以到下一張"}
                </button>
              </div>
            )}
          </div>
        ) : !flipped ? (
          <button onClick={onFlip} className="seal-reveal">顯示答案</button>
        ) : (
          <div className="seal-grades" aria-label="這個字你記得多牢？">
            {([0, 1, 2, 3] as Grade[]).map((grade) => (
              <button key={grade} className={`grade-${grade}`} disabled={saving} onClick={() => onGrade(grade)}>
                <span>{GRADE_LABELS[grade]}</span>
                <small>{saving ? "保存中" : nextReviewLabel(grade)}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
