import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { getCardState } from "../../db/progressIdentity";
import type { WordRecord } from "../../db/types";
import SpeakerButton from "../../components/SpeakerButton";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import { getExamStarText } from "../wordbeast/examTier";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import StudyIllustration from "../wordbeast/StudyIllustration";
import { useIllustrationMedia } from "../wordbeast/useIllustrationMedia";
import { buildSenseCountByWord } from "../wordbeast/wordTraits";
import { MORPHEME_TYPE_LABEL, NOTE_TYPE_LABEL, RELATION_TYPE_LABEL, REVERSE_RELATION_LABEL, STATE_LABEL } from "./wordLabels";
import { getWordDisplaySense } from "./wordDisplay";
import { buildRootFamilies, normalizeMorphemeKey, pickFamilyMorphemes } from "./rootFamily";
import "./word-detail.css";

type DossierBackTab = "meaning" | "relations" | "roots" | "examples";

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

function dossierTitleSize(word: string): string {
  const length = [...word].length;
  if (length >= 18) return "dossier-title-xs";
  if (length >= 13) return "dossier-title-sm";
  if (length >= 9) return "dossier-title-md";
  if (length >= 7) return "dossier-title-lg";
  return "";
}

function dossierTitleContent(word: string) {
  return word.split(/([/,\s]+)/).map((part, index) => (
    <Fragment key={`${part}:${index}`}>
      {part}
      {/[/,\s]+/.test(part) && <wbr />}
    </Fragment>
  ));
}

export default function WordDetailScreen() {
  const { wordId } = useParams<{ wordId: string }>();
  const [cardSide, setCardSide] = useState<"front" | "back">("front");
  const [backTab, setBackTab] = useState<DossierBackTab>("meaning");
  useEffect(() => {
    setCardSide("front");
    setBackTab("meaning");
  }, [wordId]);
  const word = useLiveQuery(() => wordId ? contentDb.words.get(wordId) : undefined, [wordId]);
  const illustration = useIllustrationMedia(word);
  const senses = useLiveQuery(() => word ? contentDb.senses.where("wordId").equals(word.wordId).sortBy("senseOrder") : [], [word?.wordId]);
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
        .map((relation) => ({ ...relation, targetWord: relation.relatedWord, reverseLabel: undefined as string | undefined })),
      // one_way 也要反向顯示，否則 teacher 頁看不到 teach、coin 頁看不到 money。
      // 標籤依類型決定，沒有標籤的類型（如 exam_distractor）不反向顯示。
      ...reverse
        .filter((relation) => relation.direction === "two_way"
          ? relation.relationType !== "exam_distractor"
          : REVERSE_RELATION_LABEL[relation.relationType || ""] !== undefined)
        .map((relation) => ({
          ...relation,
          targetWord: relation.word,
          reverseLabel: relation.direction === "one_way" ? REVERSE_RELATION_LABEL[relation.relationType || ""] : undefined,
        })),
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
  const cardState = useLiveQuery(() => word ? getCardState(word.word) : undefined, [word?.word]);
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
  const familyMorphemes = pickFamilyMorphemes(morphemes ?? []);
  const familyLookupKey = familyMorphemes.map((morpheme) => morpheme.morpheme).join("|");
  const rootFamilies = useLiveQuery(async () => {
    if (!word || familyMorphemes.length === 0) return [];
    // 索引比對大小寫敏感、也不吃連字號，所以原形與正規化形都查一次。
    const lookups = [...new Set(
      familyMorphemes.flatMap((morpheme) => [morpheme.morpheme, normalizeMorphemeKey(morpheme.morpheme)]),
    )].filter(Boolean);
    const candidates = await contentDb.morphemes.where("morpheme").anyOfIgnoreCase(lookups).toArray();
    return buildRootFamilies(familyMorphemes, candidates, word.word);
  }, [familyLookupKey, word?.word]);
  const familyWords = (rootFamilies ?? []).flatMap((family) => family.siblings);
  const familyWordKey = familyWords.slice().sort().join("|");
  const familyWordRecords = useLiveQuery(async () => {
    if (!familyWords.length) return {} as Record<string, WordRecord>;
    const records = await contentDb.words.where("word").anyOf(familyWords).toArray();
    return Object.fromEntries(records.map((record) => [record.word, record]));
  }, [familyWordKey]);

  if (!word) return <div className="dossier-loading"><i /><p>正在調閱卷宗</p></div>;

  const asset = getWordBeastAsset(word.wordId, word.word, word.imageWordId);
  const sortedMorphemes = morphemes?.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const senseCount = buildSenseCountByWord(senses ?? []).get(word.word) ?? 0;
  const displaySense = getWordDisplaySense(word, senses ?? []);
  const illustrationMeaning = asset && (!word.imageWordId || word.imageWordId === word.wordId)
    ? illustration?.targetHint?.trim() : undefined;
  const examStyleExamples = examples?.filter((example) => example.exampleType === "exam") ?? [];
  const kinRelations = relations?.filter((relation) => relation.relationType !== "confuse") ?? [];
  const falseForms = [
    ...(relations?.filter((relation) => relation.relationType === "confuse").map((relation) => ({ ...relation, kind: "易混淆", targetWord: relation.targetWord })) ?? []),
    ...(examDistractors?.map((relation) => ({ ...relation, kind: "歷屆誘答", targetWord: relation.relatedWord })) ?? []),
  ];
  const availableBackTabs: [DossierBackTab, string][] = [
    ["meaning", "字義"],
    ...(kinRelations.length > 0 ? [["relations", "關聯詞"] as [DossierBackTab, string]] : []),
    ...(sortedMorphemes && sortedMorphemes.length > 0 ? [["roots", "字根字首"] as [DossierBackTab, string]] : []),
    ...(examStyleExamples.length > 0 ? [["examples", "考點例句"] as [DossierBackTab, string]] : []),
  ];

  return (
    <div className="word-dossier-page">
      <header className="word-dossier-nav">
        <Link to="/browse">← 萬字譜</Link><span>ARCHIVE · {word.wordId}</span><b>{word.level}</b>
      </header>

      <div className="dossier-card-controls" aria-label="字卡正反面">
        <button className={cardSide === "front" ? "active" : ""} onClick={() => setCardSide("front")} aria-pressed={cardSide === "front"}>圖鑑正面</button>
        <button className={cardSide === "back" ? "active" : ""} onClick={() => setCardSide("back")} aria-pressed={cardSide === "back"}>資料背面</button>
      </div>

      {cardSide === "front" ? (
        <section className="word-dossier-hero study-layout">
          <div className="dossier-hero-copy">
            <div className="dossier-study-meta"><p>{displaySense.pos}</p><ExamTierBadge tier={priority?.priorityTier} compact /></div>
            <div className="dossier-title-row"><h1 className={dossierTitleSize(word.word)}>{dossierTitleContent(word.word)}</h1><SpeakerButton text={word.word} className="dossier-speaker" /></div>
            {word.phoneticUs && <span className="dossier-phonetic"><b>KK</b> /{word.phoneticUs}/</span>}
            <h2>{illustrationMeaning || displaySense.meaning}</h2>
            <WordTraitBadges senseCount={senseCount} hasConfusables={falseForms.length > 0} hasMorphemes={!!sortedMorphemes?.length} />
            {displaySense.needsReview && !illustrationMeaning && <span className="dossier-needs-review">主義待校準</span>}
          </div>
          {asset ? <StudyIllustration src={asset} word={word.word} caption={illustration?.captionZh} /> : <div className="dossier-hero-mark">
            <span className="dossier-orbit" />
            <DossierSigil word={word.word} />
            <small>圖像待收錄</small>
          </div>}
        </section>
      ) : (
        <section className="word-dossier-back">
          <header>
            <div><p>{displaySense.pos} · FIELD DOSSIER</p><h1>{word.word}</h1></div>
            <SpeakerButton text={word.word} className="dossier-speaker" />
          </header>
          {priority && (priority.xtYears > 0 || priority.xtAnswerCount > 0) && (
            <div className="back-priority-panel" aria-label="考頻資料">
              <div className="back-priority-stats">
                <span><b>{priority.xtYears}</b>學測年數</span>
                <span><b>{priority.xtAnswerCount}</b>答案次數</span>
                <span><b>{priority.rank}</b>考頻順位</span>
              </div>
              {priority.xtYearList && <p>出現年度：{priority.xtYearList}</p>}
            </div>
          )}
          <nav aria-label="字卡背面資料">
            {availableBackTabs.map(([tab, label]) => (
              <button key={tab} className={backTab === tab ? "active" : ""} onClick={() => setBackTab(tab)}>{label}</button>
            ))}
          </nav>
          <div className="dossier-back-content">
            {backTab === "meaning" && (
              <div className="back-meaning">
                <small>主義 · {displaySense.pos}</small>
                <h2>{displaySense.meaning}</h2>
                {senses && senses.length > 0 ? (
                  <ol>{senses.slice(0, 4).map((sense) => <li key={sense.senseId}><b>{sense.sensePos}</b><span>{sense.meaningZh}</span>{sense.isExamSense && <i>考義</i>}</li>)}</ol>
                ) : (
                  <p>目前只有字典彙總，尚未拆分常用義與考義。此字已列入校準清單。</p>
                )}
              </div>
            )}
            {backTab === "relations" && (
              <div className="back-link-list">
                {kinRelations.slice(0, 6).map((relation) => {
                  const related = relatedWords?.[relation.targetWord];
                  return <div key={`${relation.relationId}:${relation.targetWord}`}><b>{related ? <Link to={`/word/${related.wordId}`}>{relation.targetWord}</Link> : relation.targetWord}{relation.reverseLabel && <small>{relation.reverseLabel}</small>}</b><span>{related?.meaningZh || relation.note || "關聯義待補"}</span></div>;
                })}
              </div>
            )}
            {backTab === "roots" && (
              <div className="back-root-list">
                {sortedMorphemes?.slice(0, 5).map((morpheme) => <div key={morpheme.rowId}><b>{morpheme.morpheme}</b><small>{MORPHEME_TYPE_LABEL[morpheme.morphemeType || ""] || morpheme.morphemeType || "構件"}</small><span>{morpheme.meaningZh || morpheme.meaningEn || "釋義待補"}</span></div>)}
                {rootFamilies && rootFamilies.length > 0 && (
                  <div className="back-root-family">
                    {rootFamilies.map((family) => (
                      <div key={family.morpheme}>
                        <small>同族字 · {family.morpheme}</small>
                        <p>
                          {family.siblings.map((sibling) => {
                            const record = familyWordRecords?.[sibling];
                            return record
                              ? <Link key={sibling} to={`/word/${record.wordId}`}>{sibling}</Link>
                              : <span key={sibling}>{sibling}</span>;
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {backTab === "examples" && (
              <div className="back-exam">
                {examStyleExamples.slice(0, 2).map((example) => <article key={example.exampleId}><b>{example.sentenceEn}</b>{example.sentenceZh && <span>{example.sentenceZh}</span>}</article>)}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="dossier-status" aria-label="學習狀態">
        <div><span>封印狀態</span><b>{cardState ? STATE_LABEL[cardState.state] : "尚未遭遇"}</b></div>
        <div><span>{cardState?.practicePending ? "練習後待回想" : "下次校準"}</span><b>{cardState?.practicePending ? "可現在複習" : cardState?.dueDate ?? "—"}</b></div>
        <div><span>考頻／難度</span><b>{priority ? `${getExamStarText(priority.priorityTier)}・${word.level}` : word.level}</b></div>
      </section>

      {senses && senses.length > 0 && (
        <section className="dossier-section meaning-focus-section">
          <div className="dossier-section-head"><div><p>MEANING & EXAM FOCUS</p><h2>常用義 · 真名多相</h2></div><span>{senses.length} 相</span></div>
          <ol className="dossier-senses">{senses.map((sense) => <li className={sense.isExamSense ? "exam-sense" : undefined} key={sense.senseId}><b>{String(sense.senseOrder).padStart(2, "0")}</b><div><p><span>{sense.sensePos}</span>{sense.meaningZh}</p>{sense.isExamSense && <small>歷屆考義{sense.examEvidence ? ` · ${sense.examEvidence}` : ""}</small>}{sense.isExamSense && sense.note && <em>{sense.note}</em>}{sense.answerForms.length > 0 && <i>考卷字形 · {sense.answerForms.join("／")}</i>}</div></li>)}</ol>
        </section>
      )}

      {examples && examples.length > 0 && (
        <section className="dossier-section">
          <div className="dossier-section-head"><div><p>EXAMPLES</p><h2>例句 · 遭遇紀錄</h2></div><span>{examples.length} 則</span></div>
          <ol className="dossier-examples">{examples.map((example, index) => <li key={example.exampleId}><b>{String(index + 1).padStart(2, "0")}</b><div>{example.meaningHint && <small className="example-sense">{example.sensePos || "語境"} · {example.meaningHint}</small>}<p>{example.sentenceEn}</p>{example.sentenceZh && <span>{example.sentenceZh}</span>}</div></li>)}</ol>
        </section>
      )}

      {word.usagePattern && <section className="dossier-usage"><span>COLLOCATIONS</span><h2>常用搭配</h2><p>{word.usagePattern}</p></section>}

      {notes && notes.length > 0 && (
        <section className="dossier-section">
          <div className="dossier-section-head"><div><p>MEMORY & USAGE NOTES</p><h2>助記與用法</h2></div><span>{notes.length} 則</span></div>
          <div className="dossier-note-list">{notes.map((note) => <article key={note.noteId}><div><span>{NOTE_TYPE_LABEL[note.noteType] ?? note.noteType}</span><b>{note.title || "補充說明"}</b></div><p>{note.content}</p></article>)}</div>
        </section>
      )}

      {kinRelations.length > 0 && (
        <section className="dossier-section">
          <div className="dossier-section-head"><div><p>RELATED WORDS</p><h2>關聯詞 · 同族痕跡</h2></div><span>{kinRelations.length} 枚</span></div>
          <div className="dossier-relations">{kinRelations.map((relation) => {
            const related = relatedWords?.[relation.targetWord];
            return <div key={`${relation.relationId}:${relation.targetWord}`}><span>{related ? <Link to={`/word/${related.wordId}`}><strong>{relation.targetWord}</strong></Link> : <strong>{relation.targetWord}</strong>}<small>{relation.reverseLabel || RELATION_TYPE_LABEL[relation.relationType || ""] || relation.relationType || "關聯詞"}</small></span><p><b>{related?.meaningZh || "中文釋義待補"}</b>{relation.note && <span>{relation.note}</span>}</p></div>;
          })}</div>
        </section>
      )}

      {falseForms.length > 0 && (
        <section className="dossier-section misconception-section">
          <div className="dossier-section-head"><div><p>CONFUSABLES</p><h2>易混淆 · 斬妄形</h2></div><span>{falseForms.length} 枚</span></div>
          <p className="dossier-section-intro">易混真名與歷屆誘答都收在這裡。先看差異，再斬掉冒牌答案。</p>
          <div className="dossier-relations">{falseForms.map((relation) => {
            const related = relatedWords?.[relation.targetWord];
            return <div key={`${relation.relationId}:${relation.kind}`}><span>{related ? <Link to={`/word/${related.wordId}`}><strong>{relation.targetWord}</strong></Link> : <strong>{relation.targetWord}</strong>}<small>{relation.kind}</small></span><p><b>{related?.meaningZh || "中文釋義待補"}</b>{relation.note && <span>{relation.note}</span>}</p></div>;
          })}</div>
        </section>
      )}

      {sortedMorphemes && sortedMorphemes.length > 0 && (
        <section className="dossier-section morpheme-section">
          <div className="dossier-section-head"><div><p>WORD PARTS</p><h2>字根拆解 · 真名解構</h2></div><span>{sortedMorphemes.length} 段</span></div>
          <div className="dossier-morphemes">{sortedMorphemes.map((morpheme) => <div key={morpheme.rowId}><strong>{morpheme.morpheme}</strong><span>{MORPHEME_TYPE_LABEL[morpheme.morphemeType || ""] || morpheme.morphemeType || "構件"}</span><p>{morpheme.meaningZh || morpheme.meaningEn || "—"}</p>{morpheme.origin && <small>{morpheme.origin}</small>}</div>)}</div>
          {rootFamilies && rootFamilies.length > 0 && (
            <div className="dossier-root-family">
              {rootFamilies.map((family) => (
                <div key={family.morpheme}>
                  <span><strong>{family.morpheme}</strong>{family.meaningZh && <small>{family.meaningZh}</small>}</span>
                  <p>{family.siblings.map((sibling) => {
                    const record = familyWordRecords?.[sibling];
                    return record
                      ? <Link key={sibling} to={`/word/${record.wordId}`}>{sibling}</Link>
                      : <span key={sibling}>{sibling}</span>;
                  })}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="dossier-footer">萬字譜 · {word.wordId} · 封存</p>
    </div>
  );
}
