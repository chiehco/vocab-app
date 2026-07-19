import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import type { Grade } from "../../db/types";
import { buildTodayQueue, type QueueItem } from "../../srs/queue";
import { gradeFlashcard } from "../../checkin/recordActivity";
import { GRADE_LABELS } from "../../srs/sm2";
import { NOTE_TYPE_LABEL } from "../browser/wordLabels";
import SpeakerButton from "../../components/SpeakerButton";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import "./review.css";

const LEVEL_CHOICES = ["全部", "LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];

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
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [levelSel, setLevelSel] = useState("全部");
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setQueue(null);
    setIndex(0);
    setFlipped(false);
    buildTodayQueue(levelSel === "全部" ? undefined : [levelSel]).then((nextQueue) => {
      if (!cancelled) setQueue(nextQueue);
    });
    return () => { cancelled = true; };
  }, [levelSel]);

  if (queue === null) return <ScreenState type="loading" level={levelSel} />;
  if (queue.length === 0) {
    return (
      <div className="seal-review seal-state-page">
        <header className="seal-review-header"><Link to="/">← 萬字譜</Link><span>SEAL CALIBRATION</span></header>
        <LevelFilter selected={levelSel} onChange={setLevelSel} />
        <div className="seal-state-mark empty"><i /><i /><i /></div>
        <h1>封印安穩</h1>
        <p>{levelSel === "全部" ? "今天沒有待複習的單字。" : `${levelSel} 今天沒有鬆動的封印。`}</p>
        <Link to="/" className="seal-state-action">返回萬字譜</Link>
      </div>
    );
  }

  if (index >= queue.length) {
    return (
      <div className="seal-review seal-state-page complete">
        <header className="seal-review-header"><Link to="/">← 萬字譜</Link><span>RITE COMPLETE</span></header>
        <div className="seal-complete-ring"><span>封</span></div>
        <p className="seal-state-eyebrow">TODAY'S SEALS ARE STABLE</p>
        <h1>校準完成</h1>
        <p>已重新加固 {doneCount} 枚封印，今日修行已記錄。</p>
        <Link to="/" className="seal-state-action">返回萬字譜</Link>
      </div>
    );
  }

  const item = queue[index];

  async function handleGrade(grade: Grade) {
    const isNewSession = !sessionStarted.current;
    sessionStarted.current = true;
    await gradeFlashcard(item.wordRecord.word, grade, sessionId.current, isNewSession);
    setDoneCount((count) => count + 1);
    setFlipped(false);
    setIndex((current) => current + 1);
  }

  return (
    <div className={`seal-review ${flipped ? "is-flipped" : ""}`}>
      <header className="seal-review-header">
        <Link to="/">← 萬字譜</Link>
        <span>封印校準</span>
        <b>{String(index + 1).padStart(2, "0")} / {String(queue.length).padStart(2, "0")}</b>
      </header>

      {index === 0 && !flipped && <LevelFilter selected={levelSel} onChange={setLevelSel} />}

      <div className="seal-progress"><i style={{ width: `${(index / queue.length) * 100}%` }} /><span>{doneCount} 枚已穩定</span></div>

      <Flashcard
        key={item.wordRecord.word}
        item={item}
        flipped={flipped}
        onFlip={() => setFlipped(true)}
        onGrade={handleGrade}
        position={index + 1}
      />
    </div>
  );
}

function Flashcard({ item, flipped, onFlip, onGrade, position }: { item: QueueItem; flipped: boolean; onFlip: () => void; onGrade: (grade: Grade) => void; position: number }) {
  const word = item.wordRecord;
  const notes = useLiveQuery(() => contentDb.notes.where("word").equals(word.word).toArray(), [word.word]);
  const priority = useLiveQuery(() => contentDb.examPriorities.where("word").equals(word.word).first(), [word.word]);
  const beastAsset = getWordBeastAsset(word.wordId, word.word);

  return (
    <div className="seal-workspace">
      <article className={`seal-card ${flipped ? "revealed" : "sealed"}`}>
        <div className="seal-card-border" />
        <div className="seal-card-meta">
          <span>{item.isNew ? "未知字獸" : "封印鬆動"}</span>
          <div><ExamTierBadge tier={priority?.priorityTier} compact /><b>NO. {String(position).padStart(3, "0")}</b></div>
        </div>

        <div className="seal-card-visual">
          <span className="seal-card-orbit" />
          {beastAsset ? <img src={beastAsset} alt={`${word.word} 字獸`} /> : <WordSigil word={word.word} />}
          {!beastAsset && <small>圖像待收錄</small>}
        </div>

        <div className="seal-card-identity">
          <div><h1>{word.word}</h1><SpeakerButton text={word.word} className="seal-speaker" /></div>
          <p>{word.pos || "詞性未標記"}</p>
        </div>

        {flipped && (
          <div className="seal-card-answer">
            <p className="answer-label">真名釋義</p>
            <h2>{word.meaningZh || "尚無中文釋義"}</h2>
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
              <button key={grade} className={`grade-${grade}`} onClick={() => onGrade(grade)}>
                <span>{GRADE_LABELS[grade]}</span>
                <small>{grade === 0 ? "封印破裂" : grade === 1 ? "仍在鬆動" : grade === 2 ? "重新穩定" : "牢不可破"}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
