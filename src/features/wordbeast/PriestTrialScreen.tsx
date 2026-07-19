import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PriestCueVisual from "./PriestCueVisual";
import { CATEGORIES, PRIEST_TRIALS, type PriestTrial, type TrialCategory } from "./priestTrials";
import "./priest-trial.css";

type Filter = "全部" | TrialCategory;

function LevelPips({ level }: { level: number }) {
  return <span className="priest-level" aria-label={`難度 ${level} 級`}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < level ? "on" : ""} />)}</span>;
}

function TrialCard({ trial, onOpen }: { trial: PriestTrial; onOpen: () => void }) {
  return (
    <button className="priest-card" onClick={onOpen} aria-label={`查看 ${trial.word} 的祭司試煉`}>
      <span className="priest-card-number">NO. {String(PRIEST_TRIALS.indexOf(trial) + 1).padStart(2, "0")}</span>
      <span className="priest-card-visual"><PriestCueVisual trial={trial} compact /></span>
      <span className="priest-card-copy">
        <span className="priest-card-word">{trial.word}</span>
        <span className="priest-card-meaning">{trial.meaning}</span>
      </span>
      <span className="priest-card-foot"><span>{trial.category}</span><LevelPips level={trial.level} /></span>
    </button>
  );
}

function TrialDetail({ trial, onClose }: { trial: PriestTrial; onClose: () => void }) {
  const [sense, setSense] = useState(trial.word === "bear" ? 0 : 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("priest-modal-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("priest-modal-open");
    };
  }, [onClose]);

  return (
    <div className="priest-dialog-backdrop" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="priest-dialog" role="dialog" aria-modal="true" aria-labelledby="trial-title">
        <button className="priest-dialog-close" onClick={onClose} aria-label="關閉">×</button>
        <div className="priest-dialog-art">
          <div className="priest-orbit" />
          <PriestCueVisual trial={trial} sense={sense} />
          <span className="priest-seal">斬</span>
        </div>
        <div className="priest-dialog-copy">
          <div className="priest-dialog-kicker"><span>{trial.category}</span><LevelPips level={trial.level} /></div>
          <h2 id="trial-title">{trial.word}</h2>
          <p className="priest-dialog-meaning">{trial.meaning}</p>

          {trial.senses && (
            <div className="priest-senses" aria-label="切換義項">
              {trial.senses.map((item, index) => (
                <button key={item.label} className={sense === index ? "active" : ""} onClick={() => setSense(index)}>
                  <b>{item.label}</b><small>{item.cue}</small>
                </button>
              ))}
            </div>
          )}

          <div className="priest-notes">
            <div><span>這題考驗</span><p>{trial.challenge}</p></div>
            <div><span>祭司判定</span><p>{trial.verdict}</p></div>
          </div>
          <p className="priest-utterance">念出「{trial.word}」，符印才會顯出完整形態。</p>
        </div>
      </section>
    </div>
  );
}

export default function PriestTrialScreen() {
  const [filter, setFilter] = useState<Filter>("全部");
  const [selected, setSelected] = useState<PriestTrial | null>(null);
  const filtered = useMemo(() => filter === "全部" ? PRIEST_TRIALS : PRIEST_TRIALS.filter((trial) => trial.category === filter), [filter]);

  return (
    <div className="priest-page">
      <header className="priest-hero">
        <nav><Link to="/wordbeast">← 返回收服場</Link><span>WORD BEAST · FIELD TEST 01</span></nav>
        <div className="priest-hero-grid">
          <div>
            <p className="priest-eyebrow">祭司挑選 · 視覺記憶壓力測試</p>
            <h1>祭司<br /><em>試煉冊</em></h1>
            <p className="priest-lead">不是每個字都該被畫成一隻有臉的怪物。這一冊用 30 個難字，測出三種真正能擴充到七千字的記憶語法。</p>
          </div>
          <div className="priest-hero-sigil" aria-hidden="true">
            <span>30</span><small>TEST<br />WORDS</small>
            <i /><i /><i />
          </div>
        </div>
        <div className="priest-legend">
          <div><b>專屬字獸</b><span>具體物件、人物、強情緒</span></div>
          <div><b>活墨符印</b><span>動作、質感、心理、抽象</span></div>
          <div><b>關係圖騰</b><span>位置、程度、頻率、多義卡面</span></div>
        </div>
      </header>

      <main className="priest-main">
        <div className="priest-toolbar">
          <div className="priest-filters" role="group" aria-label="篩選字類">
            {(["全部", ...CATEGORIES] as Filter[]).map((item) => (
              <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
          <p><strong>{filtered.length}</strong> 枚符印</p>
        </div>

        <section className="priest-grid" aria-live="polite">
          {filtered.map((trial) => <TrialCard key={trial.word} trial={trial} onOpen={() => setSelected(trial)} />)}
        </section>
      </main>

      <footer className="priest-footer">
        <span>圖像不是答案，是讓記憶有地方落腳。</span>
        <b>祭司試煉 · 第一冊</b>
      </footer>

      {selected && <TrialDetail key={selected.word} trial={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
