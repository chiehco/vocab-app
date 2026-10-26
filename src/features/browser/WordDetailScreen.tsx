import type { CustomGroup } from '../direct/model';
import { resolveGroupWords } from '../direct/groupScope';
import { readWordList } from '../modes/wordLists';
import type { WordList } from '../modes/wordLists';
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { getCardState } from "../../db/progressIdentity";
import type { WordRecord } from "../../db/types";
import SpeakerButton from "../../components/SpeakerButton";
import { useCardPronunciation } from "../../hooks/useCardPronunciation";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import { getExamStarText } from "../wordbeast/examTier";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import StudyIllustration from "../wordbeast/StudyIllustration";
import { useIllustrationMedia } from "../wordbeast/useIllustrationMedia";
import { buildSenseCountByWord } from "../wordbeast/wordTraits";
import { MORPHEME_TYPE_LABEL, NOTE_TYPE_LABEL, RELATION_TYPE_LABEL, REVERSE_RELATION_LABEL, STATE_LABEL } from "./wordLabels";
import RecordedMeanings from './RecordedMeanings';
import { isPublicContent, isPublicSense, linkedSenseLabel } from './meaningRecords';
import { approvedCurriculumCards, approvedCurriculumIllustration, approvedCurriculumUsage, approvedCurriculumUsageZh, approvedLV1Images } from '../vocabulary/approvedCurriculum';
import { getIllustrationCaption } from "../wordbeast/illustrationCaptions";
import UsagePatternList from '../vocabulary/UsagePatternList';
import { buildRootFamilies, normalizeMorphemeKey, pickFamilyMorphemes } from "./rootFamily";
import "./word-detail.css";
import { progressDb } from '../../db/progressDb';
import { useStudyBookmark } from '../modes/useStudyBookmark';

// 單字卡拆成五頁減少捲動：字卡 → 字義（含例句）→ 相關詞（含易混淆、字根）→ 搭配（片語、文法）→ 記憶法與用法。
type DossierPage = "card" | "meaning" | "related" | "usage" | "memory";
const USAGE_NOTE_TYPES = new Set(["phrase", "grammar"]);

function DossierSigil({ word }: { word: string }) {
  const value = [...word].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return (
    <svg className="dossier-sigil" viewBox="0 0 220 220" aria-hidden="true">
      <circle cx="110" cy="110" r="81" /><circle cx="110" cy="110" r="60" />
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
  const [params] = useSearchParams();
  const listId = params.get('list');
  const groupId = listId || params.get('group');
  const group = useLiveQuery<CustomGroup | WordList | undefined>(() => listId ? readWordList(listId) : groupId ? progressDb.customGroups.get(groupId) : undefined, [groupId,listId]);
  const groupReturn = listId ? (group as WordList|undefined)?.returnTo ?? '/modes/words' : `/groups?group=${encodeURIComponent(groupId??'')}`;
  const groupQuery = `${listId?'list':'group'}=${encodeURIComponent(groupId??'')}`;
  const word = useLiveQuery(() => wordId ? contentDb.words.get(wordId) : undefined, [wordId]);
  const groupCards = useLiveQuery(async () => group ? resolveGroupWords(group, await contentDb.words.toArray()) : [], [group]);
  const groupIds = (groupCards ?? []).map(card => card.wordId);
  const groupIndex = groupIds.indexOf(wordId ?? '');
  const [page, setPage] = useState<DossierPage>("card");
  // 分頁列是 sticky，捲動後自身 top 恆為 0，所以用它前面不佔高度的定位點判斷是否已捲過分頁列。
  const pageAnchorRef = useRef<HTMLSpanElement>(null);
  const scrollOnPageChange = useRef(false);
  useEffect(() => {
    setPage("card");
  }, [wordId]);
  useEffect(() => {
    if (!scrollOnPageChange.current) return;
    scrollOnPageChange.current = false;
    // 新頁畫好後再捲，讓分頁列回到畫面頂端、頁首內容可見，不會停在上一頁的捲動位置。
    const anchor = pageAnchorRef.current;
    if (anchor && anchor.getBoundingClientRect().top < 0) anchor.scrollIntoView({ block: "start" });
  }, [page]);
  const openPage = (next: DossierPage) => {
    scrollOnPageChange.current = true;
    setPage(next);
  };
  const bookmarkFailed = useStudyBookmark(word && (!groupId || groupIndex >= 0) ? {
    href: `/word/${word.wordId}${groupId ? `?${groupQuery}` : ''}`,
    title: group?.name ?? word.word, position: groupIndex >= 0 ? groupIndex+1 : 1,
    total: groupIndex >= 0 ? groupIds.length : 1,
  } : undefined);
  useCardPronunciation(word?.word, wordId);
  const illustration = useIllustrationMedia(word);
  const senses = useLiveQuery(() => word ? contentDb.senses.where("wordId").equals(word.wordId).sortBy("senseOrder") : [], [word?.wordId]);
  const rawExamples = useLiveQuery(() => word ? contentDb.examples.where("word").equals(word.word).toArray() : [], [word?.word]);
  const examples = rawExamples?.filter(isPublicContent);
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

  if (!word) return <div className="dossier-loading"><i /><p>載入中</p></div>;

  const asset = getWordBeastAsset(word.wordId, word.word, word.imageWordId);
  const sortedMorphemes = morphemes?.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const senseCount = buildSenseCountByWord((senses ?? []).filter(isPublicSense)).get(word.word) ?? 0;
  const publicSenses = (senses ?? []).filter(isPublicSense);
  const usagePattern = approvedCurriculumUsage(word.word, word.wordId) ?? word.usagePattern;
  const usagePatternZh = approvedCurriculumUsageZh(word.word, word.wordId) ?? word.usagePatternZh;
  const lv1Images = approvedLV1Images(word.word, word.wordId);
  const curriculumCards = approvedCurriculumCards(word.word, word.wordId);
  const captionPair = asset
    ? approvedCurriculumIllustration(word.word, asset) ?? getIllustrationCaption(illustration?.captionZh)
    : undefined;
  const hasEnglishCaption = !!(captionPair && ("captionEn" in captionPair ? captionPair.captionEn : captionPair.en));
  // 圖說本身就是英文例句時不重複；否則字卡頁補一則基本例句（優先一般例句，不用考點句）。
  const basicExample = hasEnglishCaption
    ? undefined
    : examples?.find((example) => example.exampleType !== "exam") ?? examples?.[0];
  const usageNotes = notes?.filter((note) => USAGE_NOTE_TYPES.has(note.noteType)) ?? [];
  const memoryNotes = notes?.filter((note) => !USAGE_NOTE_TYPES.has(note.noteType)) ?? [];
  const kinRelations = relations?.filter((relation) => relation.relationType !== "confuse") ?? [];
  const falseForms = [
    ...(relations?.filter((relation) => relation.relationType === "confuse").map((relation) => ({ ...relation, kind: "易混淆", targetWord: relation.targetWord })) ?? []),
    ...(examDistractors?.map((relation) => ({ ...relation, kind: "歷屆的錯誤選項", targetWord: relation.relatedWord })) ?? []),
  ];
  const hasRelatedPage = kinRelations.length > 0 || falseForms.length > 0 || !!sortedMorphemes?.length;
  const pages: [DossierPage, string][] = [
    ["card", "字卡"],
    ["meaning", "字義"],
    ...(hasRelatedPage ? [["related", "相關詞"] as [DossierPage, string]] : []),
    ...(usagePattern || usageNotes.length > 0 ? [["usage", "搭配"] as [DossierPage, string]] : []),
    ...(memoryNotes.length > 0 ? [["memory", "記憶法"] as [DossierPage, string]] : []),
  ];
  const activePage = pages.some(([key]) => key === page) ? page : "card";
  const pageIndex = pages.findIndex(([key]) => key === activePage);
  const nextPage = pages[pageIndex + 1];
  const pageTitle = (
    <header className="dossier-page-title">
      <div><p>{word.posAll.join(' / ')}</p><h1 className={dossierTitleSize(word.word)}>{dossierTitleContent(word.word)}</h1></div>
      <SpeakerButton text={word.word} className="dossier-speaker" />
    </header>
  );
  const noteList = (items: typeof memoryNotes) => (
    <div className="dossier-note-list">{items.map((note) => <article key={note.noteId}><div><span>{NOTE_TYPE_LABEL[note.noteType] ?? note.noteType}</span><b>{note.title || "補充說明"}</b></div><p>{note.content}</p></article>)}</div>
  );

  return (
    <div className="word-dossier-page">
      {bookmarkFailed && <p role="alert">學習位置尚未保存，請確認儲存空間後重新整理。</p>}
      <header className="word-dossier-nav">
        <Link to="/browse">← 單字總表</Link><span>{word.wordId}</span><b>{word.level}</b>
      </header>

      {group && groupIndex >= 0 && <nav className="dossier-group-nav" aria-label="群組字卡導覽">
        <Link to={groupReturn}>← {group.name}</Link>
        <span>{groupIndex+1} / {groupIds.length}</span>
        <div>{groupIndex > 0 && <Link to={`/word/${groupIds[groupIndex-1]}?${groupQuery}`}>上一字</Link>}
        {groupIndex < groupIds.length-1 && <Link to={`/word/${groupIds[groupIndex+1]}?${groupQuery}`}>下一字 →</Link>}</div>
      </nav>}

      <span ref={pageAnchorRef} className="dossier-page-anchor" aria-hidden="true" />
      <nav className="dossier-page-tabs" aria-label="單字卡分頁" style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}>
        {pages.map(([key, label]) => (
          <button key={key} type="button" className={activePage === key ? "active" : ""} aria-pressed={activePage === key} onClick={() => openPage(key)}>{label}</button>
        ))}
      </nav>

      {activePage === "card" && <>
        <section className="word-dossier-hero study-layout">
          <div className="dossier-hero-copy">
            <div className="dossier-study-meta"><p>{word.posAll.join(' / ')}</p><ExamTierBadge tier={priority?.priorityTier} compact /></div>
            <div className="dossier-title-row"><h1 className={dossierTitleSize(word.word)}>{dossierTitleContent(word.word)}</h1><SpeakerButton text={word.word} className="dossier-speaker" /></div>
            {word.phoneticUs && <span className="dossier-phonetic"><b>KK</b> /{word.phoneticUs}/</span>}
            <RecordedMeanings word={word} senses={senses ?? []} />
            <WordTraitBadges senseCount={senseCount} hasConfusables={falseForms.length > 0} hasMorphemes={!!sortedMorphemes?.length} />
            {lv1Images.length > 0 && <p><a href={`${import.meta.env.BASE_URL}wordbeast/lv1-reviewed/index.html#${lv1Images[0].id}`}>查看 LV1 已審閱圖句（{lv1Images.length} 組）</a></p>}
          </div>
          {asset ? <StudyIllustration src={asset} word={word.word} caption={illustration?.captionZh} showSenseLabel senseLabel={linkedSenseLabel(word, publicSenses, illustration?.senseId)} /> : <div className="dossier-hero-mark">
            <DossierSigil word={word.word} />
            <small>圖片尚未收錄</small>
          </div>}
          {basicExample && <div className="dossier-basic-example">
            <small>例句對應：{linkedSenseLabel(word, publicSenses, basicExample.senseId) ?? '義項未連結'}</small>
            <p lang="en">{basicExample.sentenceEn}</p>
            {basicExample.sentenceZh && <span>{basicExample.sentenceZh}</span>}
          </div>}
        </section>

        <section className="dossier-status" aria-label="學習狀態">
          <div><span>記憶狀態</span><b>{cardState ? STATE_LABEL[cardState.state] : "尚未學過"}</b></div>
          <div><span>{cardState?.practicePending ? "練習後待複習" : "下次複習"}</span><b>{cardState?.practicePending ? "現在可以複習" : cardState?.dueDate ?? "—"}</b></div>
          <div><span>考頻／難度</span><b>{priority ? `${getExamStarText(priority.priorityTier)}・${word.level}` : word.level}</b></div>
        </section>
      </>}

      {activePage === "meaning" && <div className="dossier-page">
        {pageTitle}
        {word.meaningEn && <section className="dossier-section dossier-english">
          <div className="dossier-section-head"><h2>英英解釋</h2></div>
          <p lang="en">{word.meaningEn}</p>
        </section>}

        <section className="dossier-section meaning-focus-section">
          <div className="dossier-section-head"><h2>字義</h2><span>{publicSenses.length} 筆已收錄義項</span></div>
          <RecordedMeanings word={word} senses={senses ?? []} />
          {curriculumCards.length > 1 && <ul className="curriculum-meanings">
            {curriculumCards.map(card => <li key={card.learningItemId}>
              <b>{card.displayWord} · {card.sensePos}</b><span>{card.targetMeaningZh}</span>
              <small>{card.unitName}</small><p>{card.illustration.captionEn}</p><p>{card.illustration.captionZh}</p>
            </li>)}
          </ul>}
        </section>

        {examples && examples.length > 0 && (
          <section className="dossier-section">
            <div className="dossier-section-head"><h2>例句</h2><span>{examples.length} 則</span></div>
            <ol className="dossier-examples">{examples.map((example, index) => <li key={example.exampleId}><b>{String(index + 1).padStart(2, "0")}</b><div><small className="example-sense">例句對應：{linkedSenseLabel(word, publicSenses, example.senseId) ?? '義項未連結'}</small>{example.meaningHint && <small className="example-sense">原標籤：{example.sensePos || "語境"} · {example.meaningHint}</small>}<p>{example.sentenceEn}</p>{example.sentenceZh && <span>{example.sentenceZh}</span>}</div></li>)}</ol>
          </section>
        )}

        {priority && (priority.xtYears > 0 || priority.xtAnswerCount > 0) && (
          <section className="dossier-section back-priority-panel" aria-label="考頻資料">
            <div className="dossier-section-head"><h2>學測考頻</h2></div>
            <div className="back-priority-stats">
              <span><b>{priority.xtYears}</b>學測年數</span>
              <span><b>{priority.xtAnswerCount}</b>答案次數</span>
              <span><b>{priority.rank}</b>學測考頻排名</span>
            </div>
            {priority.xtYearList && <p>學測出現年度：{priority.xtYearList}</p>}
          </section>
        )}
      </div>}

      {activePage === "related" && <div className="dossier-page">
        {pageTitle}
        {kinRelations.length > 0 && (
          <section className="dossier-section">
            <div className="dossier-section-head"><h2>相關單字</h2><span>{kinRelations.length} 枚</span></div>
            <div className="dossier-relations">{kinRelations.map((relation) => {
              const related = relatedWords?.[relation.targetWord];
              return <div key={`${relation.relationId}:${relation.targetWord}`}><span>{related ? <Link to={`/word/${related.wordId}`}><strong>{relation.targetWord}</strong></Link> : <strong>{relation.targetWord}</strong>}<small>{relation.reverseLabel || RELATION_TYPE_LABEL[relation.relationType || ""] || relation.relationType || "關聯詞"}</small></span><p><b>{related?.meaningZh || "中文意思待補"}</b>{relation.note && <span>{relation.note}</span>}</p></div>;
            })}</div>
          </section>
        )}

        {falseForms.length > 0 && (
          <section className="dossier-section misconception-section">
            <div className="dossier-section-head"><h2>容易混淆的字</h2><span>{falseForms.length} 個</span></div>
            <p className="dossier-section-intro">容易混淆的字與歷屆錯誤選項都收在這裡。先看差異，再排除錯誤答案。</p>
            <div className="dossier-relations">{falseForms.map((relation) => {
              const related = relatedWords?.[relation.targetWord];
              return <div key={`${relation.relationId}:${relation.kind}`}><span>{related ? <Link to={`/word/${related.wordId}`}><strong>{relation.targetWord}</strong></Link> : <strong>{relation.targetWord}</strong>}<small>{relation.kind}</small></span><p><b>{related?.meaningZh || "中文意思待補"}</b>{relation.note && <span>{relation.note}</span>}</p></div>;
            })}</div>
          </section>
        )}

        {sortedMorphemes && sortedMorphemes.length > 0 && (
          <section className="dossier-section morpheme-section">
            <div className="dossier-section-head"><h2>字根拆解</h2><span>{sortedMorphemes.length} 段</span></div>
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
      </div>}

      {activePage === "usage" && <div className="dossier-page">
        {pageTitle}
        {usagePattern && <section className="dossier-usage"><h2>常用搭配</h2><UsagePatternList english={usagePattern} chinese={usagePatternZh} /></section>}
        {usageNotes.length > 0 && (
          <section className="dossier-section">
            <div className="dossier-section-head"><h2>片語與文法</h2><span>{usageNotes.length} 則</span></div>
            {noteList(usageNotes)}
          </section>
        )}
      </div>}

      {activePage === "memory" && <div className="dossier-page">
        {pageTitle}
        <section className="dossier-section">
          <div className="dossier-section-head"><h2>記憶法與用法</h2><span>{memoryNotes.length} 則</span></div>
          {noteList(memoryNotes)}
        </section>
      </div>}

      {nextPage && <button type="button" className="dossier-next-page" onClick={() => openPage(nextPage[0])}>下一頁：{nextPage[1]} →</button>}

      <p className="dossier-footer">單字總表 · {word.wordId}</p>
    </div>
  );
}
