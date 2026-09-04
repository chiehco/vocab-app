import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import type { SenseRecord } from "../../db/types";
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
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState(TOP_EXAM_FILTER);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const words = useLiveQuery(() => contentDb.words.orderBy("wordId").toArray(), []);
  const priorities = useLiveQuery(() => contentDb.examPriorities.toArray(), []);
  const senses = useLiveQuery(() => contentDb.senses.toArray(), []);
  const priorityByWord = useMemo(() => new Map((priorities ?? []).map((row) => [row.word, row.priorityTier])), [priorities]);
  const topExamWordSet = useMemo(() => buildTopExamWordSet(priorities ?? []), [priorities]);
  const sensesByWord = useMemo(() => {
    const grouped = new Map<string, SenseRecord[]>();
    for (const sense of senses ?? []) {
      const rows = grouped.get(sense.word) ?? [];
      rows.push(sense);
      grouped.set(sense.word, rows);
    }
    return grouped;
  }, [senses]);

  const filtered = useMemo(() => {
    if (!words) return [];
    const query = search.trim().toLowerCase();
    const matches = words.filter((word) => {
      if (level === TOP_EXAM_FILTER && !topExamWordSet.has(word.word)) return false;
      if (level !== TOP_EXAM_FILTER && level !== "全部" && word.level !== level) return false;
      if (!query) return true;
      return word.word.toLowerCase().includes(query) || (word.meaningZh ?? "").includes(query);
    });
    return level === TOP_EXAM_FILTER
      ? sortExamWordsByPriority(matches, priorities ?? [])
      : matches;
  }, [words, priorities, search, level, topExamWordSet]);

  const shown = filtered.slice(0, limit);

  return (
    <div className="realm-page archive-page">
      <header className="realm-header">
        <div><p>WORD BEAST ARCHIVE</p><h1>單字總表</h1></div>
        <span className="realm-count"><b>{level === TOP_EXAM_FILTER ? topExamWordSet.size || "—" : words?.length ?? "—"}</b> {level === TOP_EXAM_FILTER ? "已解鎖 S+A" : "總收錄"}</span>
      </header>

      <section className="archive-tools" aria-label="搜尋與篩選">
        <label className="archive-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
          <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(PAGE_SIZE); }} placeholder="搜尋英文單字或中文意思" />
          {search && <button onClick={() => setSearch("")} aria-label="清除搜尋">×</button>}
        </label>
        <div className="realm-levels">
          {LEVELS.map((item) => <button key={item} className={level === item ? "active" : ""} onClick={() => { setLevel(item); setLimit(PAGE_SIZE); }}>{item}</button>)}
        </div>
      </section>

      <div className="archive-result-head">
        <span>{search ? `「${search}」的結果` : level === TOP_EXAM_FILTER ? "S+A 學測高頻字" : level === "全部" ? "全部真名" : `${level} 卷`}</span>
        <b>{filtered.length} 枚</b>
      </div>

      {!words ? <div className="realm-loading"><i /><p>載入中</p></div> : (
        <>
          <ol className="archive-atlas">
            {shown.map((word, index) => {
              const display = getWordDisplaySense(word, sensesByWord.get(word.word) ?? []);
              const asset = getWordBeastAsset(word.wordId, word.word, word.imageWordId);
              return (
                <li key={word.wordId}>
                  <Link to={`/word/${word.wordId}`} aria-label={`${word.word}，${display.pos}，${display.meaning}`}>
                    <span className="atlas-number">{String(index + 1).padStart(3, "0")}</span>
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
          {filtered.length > limit && <button className="archive-more" onClick={() => setLimit(limit + PAGE_SIZE)}>再展開 {Math.min(PAGE_SIZE, filtered.length - limit)} 枚 <span>↓</span></button>}
          {filtered.length === 0 && <div className="archive-empty"><span>無</span><h2>查無這個單字</h2><p>換個拼法或等級再找找看。</p></div>}
        </>
      )}
    </div>
  );
}
