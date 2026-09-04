import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getKnownWords } from "../../db/progressIdentity";
import { contentDb } from "../../db/contentDb";
import { getSetting, progressDb } from "../../db/progressDb";
import type { ExampleRecord, RelationRecord, WordRecord } from "../../db/types";
import { recordQuizAnswer } from "../../checkin/recordActivity";
import { todayStr } from "../../lib/dates";
import { speak } from "../../lib/speech";
import { pickDistractors, shuffle } from "../../quiz/distractors";
import ExamTierBadge from "./ExamTierBadge";
import type { ExamTier } from "./examTier";
import ResilientBeastImage from "./ResilientBeastImage";
import { type CaptureData, selectDailyWords } from "./dailyCapture";
import { getEncounterMeaning, getEncounterPos, getPrimaryMeaning } from "./encounterCopy";
import { getWordBeastAsset } from "./wordBeastAssets";
import "./wordbeast.css";

interface BeastSpec {
  record: WordRecord;
  tier: ExamTier | null;
  image: string;
  choices: Array<{ word: string; meaning: string }>;
  example?: ExampleRecord;
  imageTargetHint?: string | null;
  imageCaptionZh?: string | null;
  related: Array<{ word: string; meaning: string; relation: string }>;
}

function encounterMeaning(beast: BeastSpec): string {
  return getEncounterMeaning(beast.record, beast.example, beast.imageTargetHint);
}

function encounterPos(beast: BeastSpec): string {
  return getEncounterPos(beast.record, beast.example);
}

function buildSpecs(data: CaptureData): BeastSpec[] {
  const tierByWord = new Map(data.priorities.filter((row) => !row.isFunctionWord).map((row) => [row.word, row.priorityTier]));
  const wordByName = new Map(data.words.map((word) => [word.word, word]));
  const wordById = new Map(data.words.map((word) => [word.wordId, word]));
  const mediaByWord = new Map((data.media ?? [])
    .filter((media) => media.mediaType === "image" && media.status === "approved")
    .map((media) => [media.targetWord, media]));
  const exampleByWord = new Map<string, ExampleRecord>();
  for (const example of data.examples) if (!exampleByWord.has(example.word)) exampleByWord.set(example.word, example);
  const relationsByWord = new Map<string, RelationRecord[]>();
  for (const relation of data.relations) {
    if (relation.relationType === "exam_distractor") continue;
    const list = relationsByWord.get(relation.word) ?? [];
    if (list.length < 3) list.push(relation);
    relationsByWord.set(relation.word, list);
  }

  return selectDailyWords(data).map((record) => {
    const imageSourceWord = record.imageWordId ? wordById.get(record.imageWordId)?.word ?? record.word : record.word;
    const imageMedia = mediaByWord.get(imageSourceWord);
    return {
      record,
      tier: tierByWord.get(record.word) ?? null,
      image: getWordBeastAsset(record.wordId, record.word, record.imageWordId)!,
      choices: shuffle([record, ...pickDistractors(record, data.words)]).map((word) => ({
        word: word.word,
        meaning: getPrimaryMeaning(word.meaningZh),
      })),
      example: exampleByWord.get(record.word),
      imageTargetHint: imageMedia?.targetHint,
      imageCaptionZh: imageMedia?.captionZh,
      related: (relationsByWord.get(record.word) ?? []).map((relation) => ({
        word: relation.relatedWord,
        meaning: wordByName.get(relation.relatedWord)?.meaningZh ?? "中文意思待補",
        relation: relation.note ?? relation.relationType ?? "關聯詞",
      })),
    };
  });
}

type Phase = "encounter" | "binding" | "archive";

export default function WordBeastPrototype() {
  const source = useLiveQuery(async (): Promise<CaptureData> => {
    const today = todayStr();
    const [words, priorities, examples, relations, media, knownKeys, checkIn, cap] = await Promise.all([
      contentDb.words.toArray(),
      contentDb.examPriorities.toArray(),
      contentDb.examples.toArray(),
      contentDb.relations.toArray(),
      contentDb.media.toArray(),
      getKnownWords(),
      progressDb.checkIns.get(today),
      getSetting<number>("dailyNewWordCap"),
    ]);
    return { words, priorities, examples, relations, media, known: new Set(knownKeys as string[]), remaining: Math.max(0, cap - (checkIn?.newWordsCount ?? 0)) };
  }, []);
  const [beasts, setBeasts] = useState<BeastSpec[] | null>(null);
  const [phase, setPhase] = useState<Phase>("encounter");
  const [encounterIndex, setEncounterIndex] = useState(0);
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [selectedBeast, setSelectedBeast] = useState<BeastSpec | null>(null);
  const [captured, setCaptured] = useState(() => new Set<string>());
  const [answering, setAnswering] = useState(false);
  const answeringRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
    if (!current || answeringRef.current || phase !== "encounter") return;
    const correct = choice === current.record.word;
    answeringRef.current = true;
    setAnswering(true);
    setSaveError(null);
    try {
      if (!captured.has(current.record.word)) {
        await recordQuizAnswer(current.record.word, correct, "quiz-image", sessionId.current, !sessionStarted.current);
        sessionStarted.current = true;
      }
      if (correct) {
        setCaptured((previous) => new Set(previous).add(current.record.word));
        setWrongChoice(null);
        speak(current.record.word);
        setPhase("binding");
      } else {
        setWrongChoice(choice);
      }
    } catch {
      setSaveError("這次作答尚未保存，請再試一次；不會先完成收服。");
    } finally {
      answeringRef.current = false;
      setAnswering(false);
    }
  }

  function restart() { setSelectedBeast(null); setWrongChoice(null); setEncounterIndex(0); setPhase("encounter"); }

  if (!beasts) return <div className="wordbeast-page capture-state"><i /><h1>正在尋找字獸</h1><p>祭司正在展開今日遭遇名冊。</p></div>;
  if (beasts.length === 0) return <div className="wordbeast-page capture-state"><span>封</span><h1>目前沒有新單字</h1><p>{source?.remaining === 0 ? "今天的新字已學完，可以複習剛學過的單字。" : "目前沒有尚未學過的 S+A 圖卡；你仍可前往複習或練習。"}</p><Link to="/review">前往複習</Link></div>;

  if (phase === "archive") {
    return (
      <div className="wordbeast-page archive-page">
        <header className="archive-header"><Link to="/" className="wordbeast-back">←</Link><div><p className="wordbeast-eyebrow">萬詞譜・今日新錄</p><h1>今日新字</h1></div><button className="archive-replay" onClick={restart}>重看</button></header>
        <main className="archive-main">
          <p className="archive-note">今日 {beasts.length} 隻字獸已留下真名。考頻星星代表歷屆重要度，LV 代表學習難度。</p>
          <p className="archive-note"><Link to="/review">前往複習</Link>，確認記憶後安排下次複習。</p>
          <div className="archive-grid">
            {beasts.map((beast, index) => <button className="word-entry captured" style={{ animationDelay: `${index * 55}ms` }} key={beast.record.word} onClick={() => setSelectedBeast(beast)}>
              <span className="entry-index">{String(index + 1).padStart(2, "0")}</span><ExamTierBadge tier={beast.tier} compact /><ResilientBeastImage src={beast.image} word={beast.record.word} alt={`${beast.record.word} 字獸`} /><span className="entry-name">{beast.record.word.toUpperCase()}</span><span className="entry-meaning">{encounterMeaning(beast)}・{encounterPos(beast)}</span><span className="entry-seal">錄</span>
            </button>)}
          </div>
        </main>
        {selectedBeast && <div className="detail-veil" role="dialog" aria-modal="true"><section className="beast-dossier"><button className="detail-close" onClick={() => setSelectedBeast(null)}>×</button><div className="dossier-portrait"><ExamTierBadge tier={selectedBeast.tier} /><ResilientBeastImage src={selectedBeast.image} word={selectedBeast.record.word} alt={`${selectedBeast.record.word} 字獸`} /><span>記得很牢</span></div><div className="dossier-copy"><p className="wordbeast-eyebrow">單字說明・{encounterPos(selectedBeast)}</p><h2>{selectedBeast.record.word}</h2><button className="pronounce" onClick={() => speak(selectedBeast.record.word)}>♪　再聽一次發音</button><p className="dossier-meaning"><small>本題的意思</small>{encounterMeaning(selectedBeast)}</p><p className="dossier-all-meanings"><b>完整意思</b>{selectedBeast.record.meaningZh || "中文意思待補"}</p><div className="dossier-rule" /><dl>{selectedBeast.example && <div><dt>例句</dt><dd>{selectedBeast.example.sentenceEn}</dd><dd className="translation">{selectedBeast.example.sentenceZh}</dd></div>}{selectedBeast.related.length > 0 && <div><dt>同字根的字</dt><dd className="related-traces">{selectedBeast.related.map((item) => <span className="related-trace" key={item.word}><span><strong>{item.word}</strong><small>{item.relation}</small></span><b>{item.meaning}</b></span>)}</dd></div>}</dl></div></section></div>}
      </div>
    );
  }

  return current && (
    <div className={`wordbeast-page encounter-page ${phase}`}>
      <Link to="/" className="wordbeast-back light">×</Link><Link to="/wordbeast/lv1" className="lv1-pilot-entry">LV1 圖卡盲測 <span>30</span></Link><div className="mist mist-one" /><div className="mist mist-two" />
      <header className="encounter-header"><p className="wordbeast-eyebrow">S+A・今日新字　{encounterIndex + 1}/{beasts.length}</p><h1>{phase === "binding" ? "答案揭曉" : "字獸來襲"}</h1><div className="encounter-rule" /></header>
      {saveError && <p className="encounter-feedback visible" role="alert">{saveError}</p>}
      <main className="encounter-main"><div className="beast-stage"><ExamTierBadge tier={current.tier} /><div className="ink-halo" /><div key={current.record.word} className="beast-visual"><ResilientBeastImage src={current.image} word={current.record.word} alt={`${current.record.word} 字獸`} /></div>{phase === "binding" && <><div className="binding-ring" /><div className="true-name">{current.record.word.toUpperCase()}</div><div className="capture-seal">錄</div></>}</div>
        {phase === "encounter" ? <section className="naming-panel"><p className="beast-clue">「{encounterMeaning(current)}」</p><p className="naming-instruction">{current.imageCaptionZh || "看圖片，選出對應的英文單字"}</p><div className="name-choices">{current.choices.map((choice) => <button key={choice.word} disabled={answering} className={wrongChoice === choice.word ? "wrong" : ""} onClick={() => answer(choice.word)}><span>{choice.word}</span>{wrongChoice === choice.word && <small>妄名・{choice.meaning}</small>}</button>)}</div><p className={`encounter-feedback ${wrongChoice ? "visible" : ""}`}>妄名已斬，記住牠的意思再找真正名稱。</p></section>
          : <section className="binding-copy"><p>{current.tier ? `${current.tier} 級字卡・答案已揭曉` : "答案已揭曉"}</p><strong>{current.record.word}</strong><span>{encounterMeaning(current)}・{encounterPos(current)}</span><small>{encounterIndex < beasts.length - 1 ? "下一個單字準備出現…" : "正在收錄《萬詞譜》…"}</small></section>}
      </main>
    </div>
  );
}
