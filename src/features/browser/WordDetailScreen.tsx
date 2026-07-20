import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb } from "../../db/progressDb";
import type { WordRecord } from "../../db/types";
import SpeakerButton from "../../components/SpeakerButton";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import { getExamStarText } from "../wordbeast/examTier";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import ResilientBeastImage from "../wordbeast/ResilientBeastImage";
import { buildSenseCountByWord } from "../wordbeast/wordTraits";
import { MORPHEME_TYPE_LABEL, NOTE_TYPE_LABEL, RELATION_TYPE_LABEL, STATE_LABEL } from "./wordLabels";
import "./word-detail.css";

function DossierSigil({ word }: { word: string }) {
  const value = [...word].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return (
    <svg className="dossier-sigil" viewBox="0 0 220 220" aria-hidden="true">
      <circle cx="110" cy="110" r="81" /><circle className="dash" cx="110" cy="110" r="60" />
      <g transform={`rotate(${value % 44 - 22} 110 110)`}><path d="M110 29V67M110 153v38M29 110h38M153 110h38" /><path d="M73 110 110 67l37 43-37 43Z" /><path d="m77 77 66 66M143 77l-66 66" /></g>
      <text x="110" y="126" textAnchor="middle">{word.charAt(0).toUpperCase()}</text>
    </svg>
  );
}

export default function WordDetailScreen() {
  const { wordId } = useParams<{ wordId: string }>();
  const word = useLiveQuery(() => wordId ? contentDb.words.get(wordId) : undefined, [wordId]);
  const examples = useLiveQuery(() => word ? contentDb.examples.where("word").equals(word.word).toArray() : [], [word?.word]);
  const relations = useLiveQuery(async () => {
    if (!word) return [];
    const [forward, reverse] = await Promise.all([
      contentDb.relations.where("word").equals(word.word).toArray(),
      contentDb.relations.where("relatedWord").equals(word.word).toArray(),
    ]);
    return [
      ...forward
        .filter((relation) => relation.relationType !== "exam_distractor")
        .map((relation) => ({ ...relation, targetWord: relation.relatedWord })),
      ...reverse
        .filter((relation) => relation.direction === "two_way" && relation.relationType !== "exam_distractor")
        .map((relation) => ({ ...relation, targetWord: relation.word })),
    ];
  }, [word?.word]);
  const examDistractors = useLiveQuery(
    () => word
      ? contentDb.relations
        .where("word")
        .equals(word.word)
        .filter((relation) => relation.relationType === "exam_distractor")
        .toArray()
      : [],
    [word?.word],
  );
  const morphemes = useLiveQuery(() => word ? contentDb.morphemes.where("word").equals(word.word).toArray() : [], [word?.word]);
  const notes = useLiveQuery(() => word ? contentDb.notes.where("word").equals(word.word).toArray() : [], [word?.word]);
  const cardState = useLiveQuery(() => word ? progressDb.cardStates.get(word.word) : undefined, [word?.word]);
  const priority = useLiveQuery(() => word ? contentDb.examPriorities.where("word").equals(word.word).first() : undefined, [word?.word]);
  const relationTargets = [
    ...(relations?.map((relation) => relation.targetWord) ?? []),
    ...(examDistractors?.map((relation) => relation.relatedWord) ?? []),
  ];
  const relationKey = relationTargets.slice().sort().join("|");
  const relatedWords = useLiveQuery(async () => {
    if (!relationTargets.length) return {} as Record<string, WordRecord>;
    const records = await contentDb.words.where("word").anyOf(relationTargets).toArray();
    return Object.fromEntries(records.map((record) => [record.word, record]));
  }, [relationKey]);

  if (!word) return <div className="dossier-loading"><i /><p>正在調閱卷宗</p></div>;

  const asset = getWordBeastAsset(word.wordId, word.word, word.imageWordId);
  const sortedMorphemes = morphemes?.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const senseCount = buildSenseCountByWord(examples ?? []).get(word.word) ?? 0;
  const kinRelations = relations?.filter((relation) => relation.relationType !== "confuse") ?? [];
  const falseForms = [
    ...(relations?.filter((relation) => relation.relationType === "confuse").map((relation) => ({ ...relation, kind: "易混淆", targetWord: relation.targetWord })) ?? []),
    ...(examDistractors?.map((relation) => ({ ...relation, kind: "歷屆誘答", targetWord: relation.relatedWord })) ?? []),
  ];

  return (
    <div className="word-dossier-page">
      <header className="word-dossier-nav">
        <Link to="/browse">← 萬字譜</Link><span>ARCHIVE · {word.wordId}</span><b>{word.level}</b>
      </header>

      <section className="word-dossier-hero">
        <div className="dossier-hero-copy">
          <p>{word.pos || "詞性未標記"} · TRUE NAME</p>
          <div className="dossier-title-row"><h1>{word.word}</h1><SpeakerButton text={word.word} className="dossier-speaker" /></div>
          <WordTraitBadges senseCount={senseCount} hasConfusables={falseForms.length > 0} hasMorphemes={!!sortedMorphemes?.length} />
          {word.phoneticUs && <span className="dossier-phonetic">/{word.phoneticUs}/</span>}
          <h2>{word.meaningZh || "尚無中文釋義"}</h2>
          {word.meaningEn && <p className="dossier-en">{word.meaningEn}</p>}
        </div>
        <div className="dossier-hero-mark">
          <ExamTierBadge tier={priority?.priorityTier} />
          <span className="dossier-orbit" />
          {asset ? <ResilientBeastImage src={asset} word={word.word} alt={`${word.word} 字獸`} /> : <DossierSigil word={word.word} />}
          {!asset && <small>圖像待收錄</small>}
        </div>
      </section>

      <section className="dossier-status" aria-label="學習狀態">
        <div><span>封印狀態</span><b>{cardState ? STATE_LABEL[cardState.state] : "尚未遭遇"}</b></div>
        <div><span>下次校準</span><b>{cardState?.dueDate ?? "—"}</b></div>
        <div><span>考頻／難度</span><b>{priority ? `${getExamStarText(priority.priorityTier)}・${word.level}` : word.level}</b></div>
      </section>

      {word.usagePattern && <section className="dossier-usage"><span>USAGE PATTERN</span><h2>使用軌跡</h2><p>{word.usagePattern}</p></section>}

      {notes && notes.length > 0 && (
        <section className="dossier-section">
          <div className="dossier-section-head"><div><p>FIELD NOTES</p><h2>解讀筆記</h2></div><span>{notes.length} 則</span></div>
          <div className="dossier-note-list">{notes.map((note) => <article key={note.noteId}><div><span>{NOTE_TYPE_LABEL[note.noteType] ?? note.noteType}</span><b>{note.title || "補充說明"}</b></div><p>{note.content}</p></article>)}</div>
        </section>
      )}

      {examples && examples.length > 0 && (
        <section className="dossier-section">
          <div className="dossier-section-head"><div><p>{senseCount > 1 ? "TRUE NAME ASPECTS" : "ENCOUNTER LOG"}</p><h2>{senseCount > 1 ? "真名多相" : "遭遇紀錄"}</h2></div><span>{senseCount > 1 ? `${senseCount} 相` : `${examples.length} 則`}</span></div>
          <ol className="dossier-examples">{examples.map((example, index) => <li key={example.exampleId}><b>{String(index + 1).padStart(2, "0")}</b><div>{example.meaningHint && <small className="example-sense">{example.sensePos || "語境"} · {example.meaningHint}</small>}<p>{example.sentenceEn}</p>{example.sentenceZh && <span>{example.sentenceZh}</span>}</div></li>)}</ol>
        </section>
      )}

      {kinRelations.length > 0 && (
        <section className="dossier-section">
          <div className="dossier-section-head"><div><p>KIN TRACES</p><h2>同族痕跡</h2></div><span>{kinRelations.length} 枚</span></div>
          <div className="dossier-relations">{kinRelations.map((relation) => {
            const related = relatedWords?.[relation.targetWord];
            return <div key={`${relation.relationId}:${relation.targetWord}`}><span>{related ? <Link to={`/word/${related.wordId}`}><strong>{relation.targetWord}</strong></Link> : <strong>{relation.targetWord}</strong>}<small>{RELATION_TYPE_LABEL[relation.relationType || ""] || relation.relationType || "關聯詞"}</small></span><p><b>{related?.meaningZh || "中文釋義待補"}</b>{relation.note && <span>{relation.note}</span>}</p></div>;
          })}</div>
        </section>
      )}

      {falseForms.length > 0 && (
        <section className="dossier-section misconception-section">
          <div className="dossier-section-head"><div><p>FALSE FORMS</p><h2>斬妄形</h2></div><span>{falseForms.length} 枚</span></div>
          <p className="dossier-section-intro">易混真名與歷屆誘答都收在這裡。先看差異，再斬掉冒牌答案。</p>
          <div className="dossier-relations">{falseForms.map((relation) => {
            const related = relatedWords?.[relation.targetWord];
            return <div key={`${relation.relationId}:${relation.kind}`}><span>{related ? <Link to={`/word/${related.wordId}`}><strong>{relation.targetWord}</strong></Link> : <strong>{relation.targetWord}</strong>}<small>{relation.kind}</small></span><p><b>{related?.meaningZh || "中文釋義待補"}</b>{relation.note && <span>{relation.note}</span>}</p></div>;
          })}</div>
        </section>
      )}

      {sortedMorphemes && sortedMorphemes.length > 0 && (
        <section className="dossier-section morpheme-section">
          <div className="dossier-section-head"><div><p>NAME ANATOMY</p><h2>真名解構</h2></div><span>{sortedMorphemes.length} 段</span></div>
          <div className="dossier-morphemes">{sortedMorphemes.map((morpheme) => <div key={morpheme.rowId}><strong>{morpheme.morpheme}</strong><span>{MORPHEME_TYPE_LABEL[morpheme.morphemeType || ""] || morpheme.morphemeType || "構件"}</span><p>{morpheme.meaningZh || morpheme.meaningEn || "—"}</p>{morpheme.origin && <small>{morpheme.origin}</small>}</div>)}</div>
        </section>
      )}

      <p className="dossier-footer">萬字譜 · {word.wordId} · 封存</p>
    </div>
  );
}
