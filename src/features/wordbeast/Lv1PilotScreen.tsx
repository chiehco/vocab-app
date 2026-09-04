import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Lv1PilotGlyph from "./Lv1PilotGlyph";
import { LV1_PILOT_WORDS, PILOT_KIND_LABEL } from "./lv1PilotData";
import "./lv1-pilot.css";

type Rating = "A" | "B" | "C";
const STORAGE_KEY = "wordbeast-lv1-pilot-ratings-v1";

function readRatings(): Record<string, Rating> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

export default function Lv1PilotScreen() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Record<string, Rating>>(readRatings);
  const [finished, setFinished] = useState(false);
  const current = LV1_PILOT_WORDS[index];

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings)); }, [ratings]);
  const totals = useMemo(() => ({
    A: Object.values(ratings).filter((rating) => rating === "A").length,
    B: Object.values(ratings).filter((rating) => rating === "B").length,
    C: Object.values(ratings).filter((rating) => rating === "C").length,
  }), [ratings]);

  function rate(rating: Rating) {
    const nextRatings = { ...ratings, [current.word]: rating };
    setRatings(nextRatings);
    if (index >= LV1_PILOT_WORDS.length - 1) { setFinished(true); return; }
    setIndex((currentIndex) => currentIndex + 1);
    setRevealed(false);
  }

  function goTo(nextIndex: number) { setIndex(nextIndex); setRevealed(Boolean(ratings[LV1_PILOT_WORDS[nextIndex].word])); setFinished(false); }
  function reset() { localStorage.removeItem(STORAGE_KEY); setRatings({}); setIndex(0); setRevealed(false); setFinished(false); }

  if (finished) {
    return (
      <div className="lv1-pilot-page pilot-finished">
        <header className="pilot-header"><Link to="/wordbeast">← 練習</Link><span>LV1 PILOT · COMPLETE</span></header>
        <div className="pilot-finish-seal"><span>試</span></div>
        <p>FIRST BATCH COMPLETE</p><h1>三十枚判定完成</h1>
        <div className="pilot-score"><div><b>{totals.A}</b><span>A · 一眼命中</span></div><div><b>{totals.B}</b><span>B · 看後合理</span></div><div><b>{totals.C}</b><span>C · 造成誤導</span></div></div>
        <p className="pilot-finish-copy">結果已保存在這台裝置。大叔會優先分析 C，再從重複出現的 B 修整整類視覺語法。</p>
        <div className="pilot-finish-actions"><button onClick={() => { setFinished(false); setIndex(0); setRevealed(true); }}>逐張檢查</button><button onClick={reset}>重新測驗</button></div>
      </div>
    );
  }

  return (
    <div className={`lv1-pilot-page ${revealed ? "is-revealed" : "is-blind"}`}>
      <header className="pilot-header"><Link to="/wordbeast">← 練習</Link><span>LV1 · 第一批試產</span><b>{String(index + 1).padStart(2, "0")} / 30</b></header>
      <div className="pilot-progress"><i style={{ width: `${((index + 1) / 30) * 100}%` }} /><span>{Object.keys(ratings).length} 枚已判定</span></div>

      <main className="pilot-stage">
        <section className="pilot-card">
          <div className="pilot-card-border" /><span className="pilot-card-number">NO. {String(index + 1).padStart(2, "0")}</span>
          <div className="pilot-visual"><span className="pilot-orbit" /><Lv1PilotGlyph cue={current.cue} /></div>
          {!revealed ? <div className="pilot-blind-copy"><p>THREE-SECOND TEST</p><h1>這張圖在說哪個單字？</h1><span>先在腦中說出答案，再揭示真名。</span></div> : <div className="pilot-reveal-copy"><div><span>{PILOT_KIND_LABEL[current.kind]}</span><b>LV1</b></div><h1>{current.word}</h1><h2>{current.meaning}</h2><p>{current.recipe}</p></div>}
          <span className="pilot-card-seal">初</span>
        </section>

        {!revealed ? <button className="pilot-reveal-button" onClick={() => setRevealed(true)}><span>揭示真名</span><b>開封</b></button> : (
          <section className="pilot-rating" aria-label="圖像判定">
            <p>祭司判定</p>
            <div><button className={ratings[current.word] === "A" ? "selected" : ""} onClick={() => rate("A")}><b>A</b><span>一眼命中</span><small>不看字就猜到概念</small></button><button className={ratings[current.word] === "B" ? "selected" : ""} onClick={() => rate("B")}><b>B</b><span>看後合理</span><small>知道答案才看得懂</small></button><button className={ratings[current.word] === "C" ? "selected" : ""} onClick={() => rate("C")}><b>C</b><span>造成誤導</span><small>第一眼猜成別的意思</small></button></div>
          </section>
        )}
      </main>

      <nav className="pilot-index" aria-label="三十枚試產卡">
        {LV1_PILOT_WORDS.map((word, wordIndex) => <button key={word.word} onClick={() => goTo(wordIndex)} className={`${wordIndex === index ? "current" : ""} ${ratings[word.word] ? `rated rated-${ratings[word.word].toLowerCase()}` : ""}`} aria-label={`第 ${wordIndex + 1} 張${ratings[word.word] ? `，判定 ${ratings[word.word]}` : ""}`}>{wordIndex + 1}</button>)}
      </nav>
    </div>
  );
}
