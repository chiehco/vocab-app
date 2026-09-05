import { useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams, useSearchParams } from "react-router-dom";
import SpeakerButton from "../../components/SpeakerButton";
import { contentDb } from "../../db/contentDb";
import { DEFAULT_SETTINGS, getSetting } from "../../db/progressDb";
import type { ExampleRecord } from "../../db/types";
import { speak } from "../../lib/speech";
import { getWordDisplaySense } from "../browser/wordDisplay";
import StudyIllustration from "../wordbeast/StudyIllustration";
import { useIllustrationMedia } from "../wordbeast/useIllustrationMedia";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import { getExamUnit } from "./unitPlan";
import "./units.css";

const LEVELS = new Set(["LV1", "LV2", "LV3", "LV4", "LV5", "LV6"]);

function pickExample(examples: ExampleRecord[]): ExampleRecord | undefined {
  return examples.find((example) => example.status === "approved" && example.exampleType === "exam")
    ?? examples.find((example) => example.status === "approved")
    ?? examples.find((example) => example.exampleType === "exam")
    ?? examples[0];
}

function StudyState({ title, copy, level }: { title: string; copy: string; level?: string }) {
  return (
    <div className="unit-study-page unit-study-state">
      <div className="unit-study-state-mark" aria-hidden="true">單</div>
      <p>UNIT STUDY</p>
      <h1>{title}</h1>
      <span>{copy}</span>
      <Link to={`/units${level ? `?level=${level}` : ""}`}>返回 Unit 清單</Link>
    </div>
  );
}

export default function UnitStudyScreen() {
  const { level: levelParam, unitNumber: unitNumberParam } = useParams<{
    level: string;
    unitNumber: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageRef = useRef<HTMLDivElement>(null);
  const level = levelParam?.toUpperCase() ?? "";
  const unitNumber = Number.parseInt(unitNumberParam ?? "", 10);
  const requestedIndex = Number.parseInt(searchParams.get("index") ?? "0", 10);
  const data = useLiveQuery(async () => {
    const [words, priorities] = await Promise.all([
      contentDb.words.toArray(),
      contentDb.examPriorities.toArray(),
    ]);
    return { words, priorities };
  }, []);
  const autoPronounce = useLiveQuery(
    () => getSetting<boolean>("autoPronounce"),
    [],
    DEFAULT_SETTINGS.autoPronounce,
  );
  const unit = useMemo(
    () => data && LEVELS.has(level) && Number.isInteger(unitNumber)
      ? getExamUnit(data.words, data.priorities, level, unitNumber)
      : undefined,
    [data, level, unitNumber],
  );
  const normalizedIndex = Number.isFinite(requestedIndex) ? Math.max(0, requestedIndex) : 0;
  const complete = !!unit && normalizedIndex >= unit.words.length;
  const index = unit ? Math.min(normalizedIndex, unit.words.length) : 0;
  const word = !complete ? unit?.words[index] : undefined;
  const details = useLiveQuery(async () => {
    if (!word) return undefined;
    const [senses, examples] = await Promise.all([
      contentDb.senses.where("wordId").equals(word.wordId).sortBy("senseOrder"),
      contentDb.examples.where("word").equals(word.word).toArray(),
    ]);
    return { wordId: word.wordId, senses, examples };
  }, [word?.wordId, word?.word]);
  const illustration = useIllustrationMedia(word);

  function goTo(target: number) {
    if (!unit) return;
    const nextIndex = Math.max(0, Math.min(target, unit.words.length));
    const nextWord = unit.words[nextIndex];
    if (nextWord && autoPronounce) speak(nextWord.word);
    const next = new URLSearchParams(searchParams);
    next.set("index", String(nextIndex));
    setSearchParams(next, { replace: true });
    pageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!data) return <StudyState title="載入中" copy="正在打開這個 Unit。" level={LEVELS.has(level) ? level : undefined} />;
  if (!LEVELS.has(level) || !Number.isInteger(unitNumber) || unitNumber < 1) {
    return <StudyState title="找不到這個 Unit" copy="等級或 Unit 編號不正確。" />;
  }
  if (!unit || unit.words.length === 0) {
    return <StudyState title="這個 Unit 尚未建立" copy="請回清單選擇已開放的 Unit。" level={level} />;
  }

  if (complete) {
    return (
      <div className="unit-study-page unit-complete-page">
        <header className="unit-study-header">
          <Link to={`/units?level=${level}`}>← Unit 清單</Link>
          <span>{level} · {unit.label}</span>
          <b>{unit.words.length}/{unit.words.length}</b>
        </header>
        <main className="unit-complete-main">
          <div className="unit-complete-seal" aria-hidden="true"><span>閱</span></div>
          <p>UNIT COMPLETE</p>
          <h1>這個 Unit 看完了</h1>
          <span>你已連續看完 {unit.words.length} 個高頻單字。瀏覽不會改動記憶曲線，完成練習後才會更新學習進度。</span>
          <div className="unit-complete-actions">
            <Link className="primary" to={`/quiz?level=${level}&unit=${unit.unitNumber}`}>練習這個 Unit</Link>
            <button type="button" onClick={() => goTo(0)}>從頭重看</button>
            <Link to={`/units?level=${level}`}>回 Unit 清單</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!word) return <StudyState title="找不到單字" copy="這個位置沒有可顯示的單字。" level={level} />;

  const currentDetails = details?.wordId === word.wordId ? details : undefined;
  const display = getWordDisplaySense(word, currentDetails?.senses ?? []);
  const example = pickExample(currentDetails?.examples ?? []);
  const image = getWordBeastAsset(word.wordId, word.word, word.imageWordId);
  const progress = ((index + 1) / unit.words.length) * 100;

  return (
    <div className="unit-study-page" ref={pageRef}>
      <header className="unit-study-header">
        <Link to={`/units?level=${level}`}>← Unit 清單</Link>
        <span>{level} · {unit.label}</span>
        <b>{index + 1}/{unit.words.length}</b>
      </header>
      <div className="unit-study-progress" aria-label={`目前第 ${index + 1} 個，共 ${unit.words.length} 個`}><i style={{ width: `${progress}%` }} /></div>

      <main className="unit-study-main">
        <article className="unit-study-card" key={word.wordId}>
          <div className="unit-study-card-heading">
            <div>
              <p>{display.pos} · {level}</p>
              <h1>{word.word}</h1>
              {word.phoneticUs && <span><b>KK</b> /{word.phoneticUs}/</span>}
            </div>
            <SpeakerButton text={word.word} className="unit-speaker" />
          </div>

          {image ? (
            <StudyIllustration src={image} word={word.word} caption={illustration?.captionZh} />
          ) : (
            <div className="unit-image-empty" role="img" aria-label={`${word.word} 暫無圖卡`}>
              <span aria-hidden="true">?</span>
              <p>這個字暫時沒有合適的圖卡，先用字義與例句記憶。</p>
            </div>
          )}

          <section className="unit-study-meaning" aria-labelledby="unit-meaning-title">
            <p id="unit-meaning-title">這個字的意思</p>
            <h2>{display.meaning}</h2>
            {word.meaningZh && word.meaningZh !== display.meaning && (
              <details>
                <summary>查看完整意思</summary>
                <span>{word.meaningZh}</span>
              </details>
            )}
          </section>

          {example && (
            <section className="unit-study-example" aria-labelledby="unit-example-title">
              <p id="unit-example-title">例句</p>
              <blockquote>{example.sentenceEn}</blockquote>
              {example.sentenceZh && <span>{example.sentenceZh}</span>}
            </section>
          )}
        </article>
        <p className="unit-study-readonly">連續瀏覽模式 · 不會變更複習排程</p>
      </main>

      <nav className="unit-study-controls" aria-label="Unit 單字切換">
        <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}><span aria-hidden="true">←</span> 上一字</button>
        <button type="button" className="primary" onClick={() => goTo(index + 1)}>{index === unit.words.length - 1 ? "完成 Unit" : "下一字"} <span aria-hidden="true">→</span></button>
      </nav>
    </div>
  );
}
