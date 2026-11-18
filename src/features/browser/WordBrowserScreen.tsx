import { useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { listLimit, useWordListPosition } from './useWordListPosition';
import { normalizeWordQuery, useWordSearchMeanings } from './useWordSearchMeanings';
import {
  buildTopExamWordSet,
  sortExamWordsByPriority,
  TOP_EXAM_FILTER,
} from "../../quiz/examScope";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import ResilientBeastImage from "../wordbeast/ResilientBeastImage";
import { getWordBeastAsset } from "../wordbeast/wordBeastAssets";
import { getWordDisplaySense } from "./wordDisplay";
import "../realm-pages.css";

const LEVELS = [TOP_EXAM_FILTER, "全部", "LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];
const PAGE_SIZE = 100;

export default function WordBrowserScreen() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const requestedLevel = params.get("level") ?? TOP_EXAM_FILTER;
  const level = LEVELS.includes(requestedLevel) ? requestedLevel : TOP_EXAM_FILTER;
  const search = params.get('q') ?? '';
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (key !== 'count') next.delete('count');
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: key !== 'level' });
  }
  const limit = listLimit(params, PAGE_SIZE);
  const words = useLiveQuery(() => contentDb.words.orderBy("wordId").toArray(), []);
  const priorities = useLiveQuery(() => contentDb.examPriorities.toArray(), []);
  const { byWord, meanings, ready } = useWordSearchMeanings(words, !!search.trim());
  const remember = useWordListPosition(ready && !!priorities);
  const priorityByWord = useMemo(() => new Map((priorities ?? []).map((row) => [row.word, row.priorityTier])), [priorities]);
  const topExamWordSet = useMemo(() => buildTopExamWordSet(priorities ?? []), [priorities]);

  const filtered = useMemo(() => {
    if (!words) return [];
    const query = normalizeWordQuery(search.trim());
    const matches = words.filter((word) => {
      if (level === TOP_EXAM_FILTER && !topExamWordSet.has(word.word)) return false;
      if (level !== TOP_EXAM_FILTER && level !== "全部" && word.level !== level) return false;
      if (!query) return true;
      return normalizeWordQuery([word.word, word.meaningZh, meanings.get(word.wordId)].join(' ')).includes(query);
    });
    return level === TOP_EXAM_FILTER
      ? sortExamWordsByPriority(matches, priorities ?? [])
      : matches;
  }, [words, priorities, search, level, topExamWordSet, meanings]);

  const shown = filtered.slice(0, limit);

  return (
    <div className="realm-page browse-page">
      <Link to="/modes/words" className="browse-back">← 單字模式</Link>
      <header className="realm-header">
        <div><h1>單字總表</h1></div>
        <span className="realm-count"><b>{level === TOP_EXAM_FILTER ? topExamWordSet.size || "—" : words?.length ?? "—"}</b> {level === TOP_EXAM_FILTER ? "已解鎖 S+A" : "總收錄"}</span>
      </header>

      <section className="archive-tools" aria-label="搜尋與篩選">
        <label className="archive-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
          <input type="search" value={search} onChange={(event) => update("q", event.target.value)} placeholder="搜尋英文單字或中文意思" />
          {search && <button onClick={() => update("q", "")} aria-label="清除搜尋">×</button>}
        </label>
        <div className="level-tabs" aria-label="篩選等級">
          {LEVELS.map((item) => <button key={item} aria-pressed={level === item} onClick={() => update("level", item)}>{item}</button>)}
        </div>
      </section>

      <Link to="/units" className="archive-unit-entry">
        <span><b>依 Unit 連續學習</b><small>同等級每 30 字一單元</small></span><i>開始 →</i>
      </Link>

      <div className="archive-result-head">
        <span>{search ? `「${search}」的結果` : level === TOP_EXAM_FILTER ? "S+A 學測高頻字" : level === "全部" ? "全部真名" : `${level} 卷`}</span>
        <b>{filtered.length} 枚</b>
      </div>

      {!words ? <div className="realm-loading"><i /><p>載入中</p></div> : (
        <>
          <ol className="archive-atlas">
            {shown.map((word) => {
              const display = getWordDisplaySense(word, byWord.get(word.wordId) ?? []);
              const asset = getWordBeastAsset(word.wordId, word.word, word.imageWordId);
              return (
                <li key={word.wordId}>
                  <Link id={'word-row-' + word.wordId} to={`/word/${word.wordId}`} state={{ wordListOrigin: location.pathname + location.search }}
                    onClick={() => remember(word.wordId)} aria-label={`${word.word}，${display.pos}，${display.meaning}`}>
                    <span className="atlas-portrait">
                      {asset
                        ? <ResilientBeastImage src={asset} word={word.word} alt="" />
                        : <span className="atlas-sigil" aria-hidden="true">{word.word.charAt(0).toUpperCase()}</span>}
                    </span>
                    <span className="atlas-name">{word.word}</span>
                    <span className="atlas-gloss"><b>{display.pos}</b>{display.meaning}</span>
                    <span className="atlas-meta">
                      <ExamTierBadge tier={priorityByWord.get(word.word)} compact />
                      <small>{word.level}</small>
                      {display.needsReview && <i title="主要意思待人工確認">待校</i>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          {filtered.length > limit && <button className="archive-more" onClick={() => update("count", String(limit + PAGE_SIZE))}>再展開 {Math.min(PAGE_SIZE, filtered.length - limit)} 枚 <span>↓</span></button>}
          {filtered.length === 0 && <div className="archive-empty"><span>無</span><h2>查無這個單字</h2><p>換個拼法或等級再找找看。</p>{search.trim() && level !== '全部' && <button className="archive-more" onClick={() => update('level', '全部')}>搜尋全部等級</button>}</div>}
        </>
      )}
    </div>
  );
}
