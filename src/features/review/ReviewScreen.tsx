import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { getCardState } from "../../db/progressIdentity";
import { todayStr } from "../../lib/dates";
import { useToday } from "../../hooks/useToday";
import type { Grade } from "../../db/types";
import { buildTodayQueue, buildTodayRecapQueue, type QueueItem } from "../../srs/queue";
import { gradeFlashcard, recordReviewWithoutScheduling } from "../../checkin/recordActivity";
import { GRADE_LABELS, newCardState, scheduleRecall } from "../../srs/sm2";
import { NOTE_TYPE_LABEL } from "../browser/wordLabels";
import SpeakerButton from "../../components/SpeakerButton";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import StudyIllustration from "../wordbeast/StudyIllustration";
import { useIllustrationMedia } from "../wordbeast/useIllustrationMedia";
import { buildConfusableWordSet, buildSenseCountByWord } from "../wordbeast/wordTraits";
import { TOP_EXAM_FILTER } from "../../quiz/examScope";
import "./review.css";

const LEVEL_CHOICES = [TOP_EXAM_FILTER, "全部", "LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];

function LevelFilter({ selected, onChange }: { selected: string; onChange: (level: string) => void }) {
  return (
    <div className="seal-levels" aria-label="篩選等級">
      {LEVEL_CHOICES.map((level) => (
        <button key={level} onClick={() => onChange(level)} className={selected === level ? "active" : ""}>{level}</button>
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
      <header className="seal-review-header"><Link to="/">← 萬字譜</Link><span>SEAL CALIBRATION</span></header>
      <LevelFilter selected={level} onChange={() => undefined} />
      <div className={`seal-state-mark ${type}`}><i /><i /><i /></div>
      <h1>{type === "loading" ? "召回封印中" : "封印安穩"}</h1>
      <p>{type === "loading" ? "正在整理今日需要校準的字獸。" : level === "全部" ? "今天沒有待複習的單字。" : `${level} 今天沒有鬆動的封印。`}</p>
      {type === "empty" && <Link to="/" className="seal-state-action">返回萬字譜</Link>}
    </div>
  );
}

export default function ReviewScreen() {
  const today = useToday();
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [levelSel, setLevelSel] = useState(TOP_EXAM_FILTER);
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      const isTopExam = levelSel === TOP_EXAM_FILTER;
      const levels = levelSel === "全部" || isTopExam ? undefined : [levelSel];
      const prioritizedWords = isTopExam
        ? (await contentDb.examPriorities
          .where("priorityTier")
          .anyOf(["S", "A"])
          .sortBy("rank"))
          .map((row) => row.word)
        : undefined;
      const nextQueue = await buildTodayQueue(levels, prioritizedWords);
      const hasDueCards = nextQueue.some((item) => !item.isNew);
      const recapQueue = hasDueCards ? [] : await buildTodayRecapQueue(levels, prioritizedWords);
      const resolvedQueue = recapQueue.length > 0 ? recapQueue : nextQueue;
      if (!cancelled) setQueue(resolvedQueue);
    };
    loadQueue();
    return () => { cancelled = true; };
  }, [levelSel, today]);

  if (queue === null) return <ScreenState type="loading" level={levelSel} />;
  if (queue.length === 0) {
    return (
      <div className="seal-review seal-state-page">
        <header className="seal-review-header"><Link to="/">← 萬字譜</Link><span>SEAL CALIBRATION</span></header>
        <LevelFilter selected={levelSel} onChange={setLevelSel} />
        <div className="seal-state-mark empty"><i /><i /><i /></div>
        <h1>封印安穩</h1>
        <p>{levelSel === "全部" ? "今天沒有待複習的單字。" : levelSel === TOP_EXAM_FILTER ? "今天沒有待複習的 S＋A 高頻單字。" : `${levelSel} 今天沒有鬆動的封印。`}</p>
        <Link to="/" className="seal-state-action">返回萬字譜</Link>
      </div>
    );
  }

  if (index >= queue.length) {
    const wasRecap = queue.some((item) => item.isRecap);
    return (
      <div className="seal-review seal-state-page complete">
        <header className="seal-review-header"><Link to="/">← 萬字譜</Link><span>RITE COMPLETE</span></header>
        <div className="seal-complete-ring"><span>封</span></div>
        <p className="seal-state-eyebrow">{wasRecap ? "TODAY'S CAPTURES REVIEWED" : "TODAY'S SEALS ARE STABLE"}</p>
        <h1>{wasRecap ? "今日回顧完成" : "校準完成"}</h1>
        <p>{wasRecap ? `剛收服的 ${doneCount} 隻字獸已再見過一次，明天仍會照原定時間召回。` : `已重新加固 ${doneCount} 枚封印，今日修行已記錄。`}</p>
        <Link to="/" className="seal-state-action">返回萬字譜</Link>
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

  return (
    <div className={`seal-review ${flipped ? "is-flipped" : ""}`}>
      <header className="seal-review-header">
        <Link to="/">← 萬字譜</Link>
        <span>{levelSel === TOP_EXAM_FILTER ? "高頻複習" : item.isRecap ? "今日收服回顧" : "封印校準"}</span>
        <b>{String(index + 1).padStart(2, "0")} / {String(queue.length).padStart(2, "0")}</b>
      </header>

      {index === 0 && !flipped && <LevelFilter selected={levelSel} onChange={setLevelSel} />}

      <div className="seal-progress"><i style={{ width: `${(index / queue.length) * 100}%` }} /><span>{item.isPractice ? "練習後回想，確認記憶再排程" : item.isRecap ? "今日回顧，不延長間隔" : `${doneCount} 枚已完成回想`}</span></div>
      {saveError && <p role="alert">{saveError}</p>}

      <Flashcard
        key={item.wordRecord.word}
        item={item}
        flipped={flipped}
        onFlip={() => setFlipped(true)}
        onGrade={handleGrade}
        position={index + 1}
        saving={saving}
      />
    </div>
  );
}

function Flashcard({ item, flipped, onFlip, onGrade, position, saving }: { item: QueueItem; flipped: boolean; onFlip: () => void; onGrade: (grade: Grade) => void; position: number; saving: boolean }) {
  const word = item.wordRecord;
  const illustration = useIllustrationMedia(word);
  const card = useLiveQuery(() => getCardState(word.word), [word.word]);
  function nextReviewLabel(grade: Grade) {
    if (item.isRecap) return grade === 0 ? "加入待回想" : "維持原排程";
    const today = todayStr();
    const current = card ?? newCardState(word.word, today);
    const next = scheduleRecall(current, grade, today);
    return `${next === current ? "維持" : "複習"} ${next.dueDate.slice(5).replace("-", "/")}`;
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
    <div className="seal-workspace">
      <article className={`seal-card study-layout ${flipped ? "revealed" : "sealed"}`}>
        <div className="seal-card-border" />
        <div className="seal-card-meta">
          <span>{item.isPractice ? "練習後回想" : item.isRecap ? "今日再會" : item.isNew ? "未知字獸" : "到期複習"}</span>
          <div><ExamTierBadge tier={priority?.priorityTier} compact /><b>NO. {String(position).padStart(3, "0")}</b></div>
        </div>

        <div className="seal-card-identity">
          <div><h1>{word.word}</h1><SpeakerButton text={word.word} className="seal-speaker" /></div>
          <p>{word.pos || "詞性未標記"}{word.phoneticUs && <> · /{word.phoneticUs}/</>}</p>
          {flipped && <h2>{illustrationMeaning || word.meaningZh || "尚無中文釋義"}</h2>}
          <WordTraitBadges senseCount={senseCount} hasConfusables={buildConfusableWordSet(relations ?? []).has(word.word)} hasMorphemes={!!morphemes?.length} compact />
        </div>

        {beastAsset ? <StudyIllustration src={beastAsset} word={word.word} caption={flipped ? illustration?.captionZh : undefined} /> : <div className="seal-card-visual">
          <span className="seal-card-orbit" /><WordSigil word={word.word} /><small>圖像待收錄</small>
        </div>}

        {flipped && (
          <div className="seal-card-answer">
            <p className="answer-label">完整釋義</p>
            <h2>{word.meaningZh || "尚無中文釋義"}</h2>
            {senses && senses.length > 1 && <ol className="answer-senses">{senses.map((sense) => <li key={sense.senseId}><span>{sense.sensePos}</span><b>{sense.meaningZh}</b>{sense.isExamSense && <small>學測顯相</small>}</li>)}</ol>}
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
        <span className="seal-card-stamp">譜</span>
      </article>

      <div className="seal-controls">
        {!flipped ? (
          <button onClick={onFlip} className="seal-reveal"><span>顯示真名釋義</span><i>開封</i></button>
        ) : (
          <div className="seal-grades" aria-label="評估記憶程度">
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
