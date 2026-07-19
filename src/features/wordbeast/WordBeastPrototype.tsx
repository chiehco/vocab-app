import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { getSetting, progressDb } from "../../db/progressDb";
import type { ExampleRecord, RelationRecord, WordRecord } from "../../db/types";
import { gradeFlashcard } from "../../checkin/recordActivity";
import { todayStr } from "../../lib/dates";
import { speak } from "../../lib/speech";
import { pickDistractors, shuffle } from "../../quiz/distractors";
import ExamTierBadge from "./ExamTierBadge";
import type { ExamTier } from "./examTier";
import ResilientBeastImage from "./ResilientBeastImage";
import { type CaptureData, selectDailyWords } from "./dailyCapture";
import { getWordBeastAsset } from "./wordBeastAssets";
import "./wordbeast.css";

interface BeastSpec {
  record: WordRecord;
  tier: ExamTier | null;
  image: string;
  choices: string[];
  example?: ExampleRecord;
  related: Array<{ word: string; meaning: string; relation: string }>;
}

function encounterMeaning(beast: BeastSpec): string {
  return beast.example?.meaningHint?.trim() || beast.record.meaningZh || "釋義待補";
}

function buildSpecs(data: CaptureData): BeastSpec[] {
  const tierByWord = new Map(data.priorities.filter((row) => !row.isFunctionWord).map((row) => [row.word, row.priorityTier]));
  const wordByName = new Map(data.words.map((word) => [word.word, word]));
  const exampleByWord = new Map<string, ExampleRecord>();
  for (const example of data.examples) if (!exampleByWord.has(example.word)) exampleByWord.set(example.word, example);
  const relationsByWord = new Map<string, RelationRecord[]>();
  for (const relation of data.relations) {
    if (relation.relationType === "exam_distractor") continue;
    const list = relationsByWord.get(relation.word) ?? [];
    if (list.length < 3) list.push(relation);
    relationsByWord.set(relation.word, list);
  }

  return selectDailyWords(data).map((record) => ({
    record,
    tier: tierByWord.get(record.word) ?? null,
    image: getWordBeastAsset(record.wordId, record.word)!,
    choices: shuffle([record, ...pickDistractors(record, data.words)]).map((word) => word.word),
    example: exampleByWord.get(record.word),
    related: (relationsByWord.get(record.word) ?? []).map((relation) => ({
      word: relation.relatedWord,
      meaning: wordByName.get(relation.relatedWord)?.meaningZh ?? "釋義待補",
      relation: relation.note ?? relation.relationType ?? "關聯詞",
    })),
  }));
}

type Phase = "encounter" | "binding" | "archive";

export default function WordBeastPrototype() {
  const source = useLiveQuery(async (): Promise<CaptureData> => {
    const today = todayStr();
    const [words, priorities, examples, relations, knownKeys, checkIn, cap] = await Promise.all([
      contentDb.words.toArray(),
      contentDb.examPriorities.toArray(),
      contentDb.examples.toArray(),
      contentDb.relations.toArray(),
      progressDb.cardStates.toCollection().primaryKeys(),
      progressDb.checkIns.get(today),
      getSetting<number>("dailyNewWordCap"),
    ]);
    return { words, priorities, examples, relations, known: new Set(knownKeys as string[]), remaining: Math.max(0, cap - (checkIn?.newWordsCount ?? 0)) };
  }, []);
  const [beasts, setBeasts] = useState<BeastSpec[] | null>(null);
  const [phase, setPhase] = useState<Phase>("encounter");
  const [encounterIndex, setEncounterIndex] = useState(0);
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [selectedBeast, setSelectedBeast] = useState<BeastSpec | null>(null);
  const [captured, setCaptured] = useState(() => new Set<string>());
  const [answering, setAnswering] = useState(false);
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);

  useEffect(() => { if (source && beasts === null) setBeasts(buildSpecs(source)); }, [source, beasts]);
  const current = beasts?.[encounterIndex];

  useEffect(() => {
    if (phase !== "binding" || !beasts) return;
    const timer = window.setTimeout(() => {
      if (encounterIndex < beasts.length - 1) {
        setEncounterIndex((index) => index + 1); setWrongChoice(null); setPhase("encounter");
      } else setPhase("archive");
    }, 1650);
    return () => window.clearTimeout(timer);
  }, [phase, encounterIndex, beasts]);

  async function answer(choice: string) {
    if (!current || answering || phase !== "encounter") return;
    if (choice !== current.record.word) { setWrongChoice(choice); return; }
    setAnswering(true); setWrongChoice(null); speak(current.record.word);
    if (!captured.has(current.record.word)) {
      await gradeFlashcard(current.record.word, 2, sessionId.current, !sessionStarted.current, "quiz-image");
      sessionStarted.current = true;
      setCaptured((previous) => new Set(previous).add(current.record.word));
    }
    setAnswering(false); setPhase("binding");
  }

  function restart() { setSelectedBeast(null); setWrongChoice(null); setEncounterIndex(0); setPhase("encounter"); }

  if (!beasts) return <div className="wordbeast-page capture-state"><i /><h1>正在尋找字獸</h1><p>祭司正在展開今日遭遇名冊。</p></div>;
  if (beasts.length === 0) return <div className="wordbeast-page capture-state"><span>封</span><h1>今日收服完成</h1><p>今日的新字額度已完成，明天會有新的氣息靠近。</p><Link to="/review">召回鬆動封印</Link></div>;

  if (phase === "archive") {
    return (
      <div className="wordbeast-page archive-page">
        <header className="archive-header"><Link to="/" className="wordbeast-back">←</Link><div><p className="wordbeast-eyebrow">萬字譜・今日新錄</p><h1>真名錄</h1></div><button className="archive-replay" onClick={restart}>重看</button></header>
        <main className="archive-main">
          <p className="archive-note">今日 {beasts.length} 隻字獸已留下真名。考頻星星代表歷屆重要度，LV 代表學習難度。</p>
          <div className="archive-grid">
            {beasts.map((beast, index) => <button className="word-entry captured" style={{ animationDelay: `${index * 55}ms` }} key={beast.record.word} onClick={() => setSelectedBeast(beast)}>
              <span className="entry-index">{String(index + 1).padStart(2, "0")}</span><ExamTierBadge tier={beast.tier} compact /><ResilientBeastImage src={beast.image} word={beast.record.word} alt={`${beast.record.word} 字獸`} /><span className="entry-name">{beast.record.word.toUpperCase()}</span><span className="entry-meaning">{encounterMeaning(beast)}・{beast.example?.sensePos || beast.record.pos || "詞性未標"}</span><span className="entry-seal">錄</span>
            </button>)}
          </div>
        </main>
        {selectedBeast && <div className="detail-veil" role="dialog" aria-modal="true"><section className="beast-dossier"><button className="detail-close" onClick={() => setSelectedBeast(null)}>×</button><div className="dossier-portrait"><ExamTierBadge tier={selectedBeast.tier} /><ResilientBeastImage src={selectedBeast.image} word={selectedBeast.record.word} alt={`${selectedBeast.record.word} 字獸`} /><span>封印穩固</span></div><div className="dossier-copy"><p className="wordbeast-eyebrow">真名解讀・{selectedBeast.example?.sensePos || selectedBeast.record.pos}</p><h2>{selectedBeast.record.word}</h2><button className="pronounce" onClick={() => speak(selectedBeast.record.word)}>♪　再次喚名</button><p className="dossier-meaning"><small>本次顯相</small>{encounterMeaning(selectedBeast)}</p>{selectedBeast.example?.meaningHint && <p className="dossier-all-meanings">完整釋義・{selectedBeast.record.meaningZh}</p>}<div className="dossier-rule" /><dl>{selectedBeast.example && <div><dt>遭遇紀錄</dt><dd>{selectedBeast.example.sentenceEn}</dd><dd className="translation">{selectedBeast.example.sentenceZh}</dd></div>}{selectedBeast.related.length > 0 && <div><dt>同族痕跡</dt><dd className="related-traces">{selectedBeast.related.map((item) => <span className="related-trace" key={item.word}><span><strong>{item.word}</strong><small>{item.relation}</small></span><b>{item.meaning}</b></span>)}</dd></div>}</dl></div></section></div>}
      </div>
    );
  }

  return current && (
    <div className={`wordbeast-page encounter-page ${phase}`}>
      <Link to="/" className="wordbeast-back light">×</Link><Link to="/wordbeast/priest" className="priest-trial-entry">祭司試煉冊 <span>30</span></Link><Link to="/wordbeast/lv1" className="lv1-pilot-entry">LV1 圖卡盲測 <span>30</span></Link><div className="mist mist-one" /><div className="mist mist-two" />
      <header className="encounter-header"><p className="wordbeast-eyebrow">萬字譜・今日收服　{encounterIndex + 1}/{beasts.length}</p><h1>{phase === "binding" ? "真名顯現" : "字獸來襲"}</h1><div className="encounter-rule" /></header>
      <main className="encounter-main"><div className="beast-stage"><ExamTierBadge tier={current.tier} /><div className="ink-halo" /><div key={current.record.word} className="beast-visual"><ResilientBeastImage src={current.image} word={current.record.word} alt={`${current.record.word} 字獸`} /></div>{phase === "binding" && <><div className="binding-ring" /><div className="true-name">{current.record.word.toUpperCase()}</div><div className="capture-seal">錄</div></>}</div>
        {phase === "encounter" ? <section className="naming-panel"><p className="beast-clue">「{encounterMeaning(current)}」</p><p className="naming-instruction">看穿牠的偽裝，喚出英文真名</p><div className="name-choices">{current.choices.map((choice) => <button key={choice} disabled={answering} className={wrongChoice === choice ? "wrong" : ""} onClick={() => answer(choice)}>{choice}</button>)}</div><p className={`encounter-feedback ${wrongChoice ? "visible" : ""}`}>偽名破碎了。再看清牠留下的線索。</p></section>
          : <section className="binding-copy"><p>{current.tier ? `${current.tier} 級字卡・真名已被喚醒` : "真名已被喚醒"}</p><strong>{current.record.word}</strong><span>{encounterMeaning(current)}・{current.example?.sensePos || current.record.pos}</span><small>{encounterIndex < beasts.length - 1 ? "下一道氣息正在靠近…" : "正在收錄《萬字譜》…"}</small></section>}
      </main>
    </div>
  );
}
