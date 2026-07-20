import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import ExamTierBadge from "../wordbeast/ExamTierBadge";
import WordTraitBadges from "../wordbeast/WordTraitBadges";
import { buildConfusableWordSet, buildMorphemeWordSet, buildSenseCountByWord } from "../wordbeast/wordTraits";
import "../realm-pages.css";

const LEVELS = ["全部", "LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];
const PAGE_SIZE = 100;

export default function WordBrowserScreen() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("全部");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const words = useLiveQuery(() => contentDb.words.orderBy("wordId").toArray(), []);
  const priorities = useLiveQuery(() => contentDb.examPriorities.toArray(), []);
  const senses = useLiveQuery(() => contentDb.senses.toArray(), []);
  const relations = useLiveQuery(() => contentDb.relations.toArray(), []);
  const morphemes = useLiveQuery(() => contentDb.morphemes.toArray(), []);
  const priorityByWord = useMemo(() => new Map((priorities ?? []).map((row) => [row.word, row.priorityTier])), [priorities]);
  const senseCountByWord = useMemo(() => buildSenseCountByWord(senses ?? []), [senses]);
  const confusableWords = useMemo(() => buildConfusableWordSet(relations ?? []), [relations]);
  const morphemeWords = useMemo(() => buildMorphemeWordSet(morphemes ?? []), [morphemes]);

  const filtered = useMemo(() => {
    if (!words) return [];
    const query = search.trim().toLowerCase();
    return words.filter((word) => {
      if (level !== "全部" && word.level !== level) return false;
      if (!query) return true;
      return word.word.toLowerCase().includes(query) || (word.meaningZh ?? "").includes(query);
    });
  }, [words, search, level]);

  const shown = filtered.slice(0, limit);

  return (
    <div className="realm-page archive-page">
      <header className="realm-header">
        <div><p>WORD BEAST ARCHIVE</p><h1>萬字譜</h1></div>
        <span className="realm-count"><b>{words?.length ?? "—"}</b> 總收錄</span>
      </header>

      <section className="archive-tools" aria-label="搜尋與篩選">
        <label className="archive-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
          <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(PAGE_SIZE); }} placeholder="輸入真名或中文釋義" />
          {search && <button onClick={() => setSearch("")} aria-label="清除搜尋">×</button>}
        </label>
        <div className="realm-levels">
          {LEVELS.map((item) => <button key={item} className={level === item ? "active" : ""} onClick={() => { setLevel(item); setLimit(PAGE_SIZE); }}>{item}</button>)}
        </div>
      </section>

      <div className="archive-result-head">
        <span>{search ? `「${search}」的結果` : level === "全部" ? "全部真名" : `${level} 卷`}</span>
        <b>{filtered.length} 枚</b>
      </div>

      {!words ? <div className="realm-loading"><i /><p>正在展開萬字譜</p></div> : (
        <>
          <ol className="archive-index">
            {shown.map((word, index) => (
              <li key={word.wordId}>
                <Link to={`/word/${word.wordId}`}>
                  <span className="archive-number">{String(index + 1).padStart(4, "0")}</span>
                  <span className="archive-word"><strong>{word.word}</strong><small>{word.pos || "—"}</small><WordTraitBadges senseCount={senseCountByWord.get(word.word)} hasConfusables={confusableWords.has(word.word)} hasMorphemes={morphemeWords.has(word.word)} compact /></span>
                  <span className="archive-meaning">{word.meaningZh || "尚無釋義"}</span>
                  <span className="archive-level"><ExamTierBadge tier={priorityByWord.get(word.word)} compact /><small>{word.level}</small></span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M13 7l5 5-5 5" /></svg>
                </Link>
              </li>
            ))}
          </ol>
          {filtered.length > limit && <button className="archive-more" onClick={() => setLimit(limit + PAGE_SIZE)}>再展開 {Math.min(PAGE_SIZE, filtered.length - limit)} 枚 <span>↓</span></button>}
          {filtered.length === 0 && <div className="archive-empty"><span>無</span><h2>譜中查無此名</h2><p>換一個拼法或等級再找找看。</p></div>}
        </>
      )}
    </div>
  );
}
