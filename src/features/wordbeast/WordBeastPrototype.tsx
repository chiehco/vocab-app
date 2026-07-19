import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { speak } from "../../lib/speech";
import "./wordbeast.css";

const BASE = import.meta.env.BASE_URL;

interface BeastSpec {
  word: string;
  cueType: "image" | "motion";
  image?: string;
  clue: string;
  pos: string;
  meaning: string;
  shortMeaning: string;
  choices: string[];
  alt: string;
  example: string;
  translation: string;
  related: Array<{ word: string; meaning: string; relation: string }>;
}

const BEASTS: BeastSpec[] = [
  {
    word: "pest",
    cueType: "image",
    image: `${BASE}wordbeast/pest-beast.png`,
    clue: "害蟲；討厭的人",
    pos: "名詞",
    meaning: "害蟲；討厭的人或事物",
    shortMeaning: "害蟲",
    choices: ["prey", "pest", "seed", "beast"],
    alt: "偷啃葉片、嘴邊掉著碎屑的毛毛蟲字獸",
    example: "A swarm of pests destroyed the crops.",
    translation: "一大群害蟲摧毀了農作物。",
    related: [
      { word: "pesticide", meaning: "殺蟲劑；農藥", relation: "由 pest 延伸出的防治物" },
      { word: "pest control", meaning: "害蟲防治", relation: "常見搭配" },
      { word: "pesky", meaning: "惱人的；麻煩的", relation: "同源形容詞" },
    ],
  },
  {
    word: "red",
    cueType: "image",
    image: `${BASE}wordbeast/red-beast.png`,
    clue: "紅色的；紅色",
    pos: "形容詞・名詞",
    meaning: "紅色的；紅色",
    shortMeaning: "紅色的",
    choices: ["blue", "red", "green", "gold"],
    alt: "揮舞畫筆、畫出鮮紅筆觸的朱紅顏料字獸",
    example: "She wore a bright red coat.",
    translation: "她穿著一件鮮紅色的外套。",
    related: [
      { word: "reddish", meaning: "略帶紅色的", relation: "形容顏色接近紅色" },
      { word: "redden", meaning: "（使）變紅", relation: "動詞形態" },
      { word: "redness", meaning: "紅色；發紅", relation: "名詞形態" },
    ],
  },
  {
    word: "move",
    cueType: "motion",
    clue: "移動；搬動",
    pos: "動詞",
    meaning: "移動；搬動；搬家",
    shortMeaning: "移動",
    choices: ["hold", "move", "rest", "stay"],
    alt: "墨點沿著路徑從一個位置移動到另一個位置",
    example: "The dot moved from one place to another.",
    translation: "墨點從一個位置移動到另一個位置。",
    related: [
      { word: "movement", meaning: "移動；動作；運動", relation: "名詞形態" },
      { word: "moving", meaning: "移動中的；令人感動的", relation: "分詞與形容詞" },
      { word: "movable", meaning: "可移動的", relation: "能力形容詞" },
    ],
  },
];

function MotionGlyph({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={`move-glyph ${compact ? "compact" : ""}`}
      viewBox="0 0 360 250"
      role="img"
      aria-label="墨點沿著路徑從一個位置移動到另一個位置"
    >
      <path className="move-trail-shadow" d="M74 88 C142 42 170 191 280 140" />
      <path className="move-trail" d="M74 88 C142 42 170 191 280 140" />
      <g className="move-node move-node-start" transform="translate(74 88)">
        <circle r="31" />
        <circle r="13" />
        <path d="M-13 25 L0 45 L13 25" />
      </g>
      <g className="move-node move-node-end" transform="translate(280 140)">
        <circle r="31" />
        <circle r="13" />
        <path d="M-13 25 L0 45 L13 25" />
      </g>
      <circle className="moving-ink moving-ink-ghost ghost-one" cx="74" cy="88" r="12" />
      <circle className="moving-ink moving-ink-ghost ghost-two" cx="74" cy="88" r="12" />
      <circle className="moving-ink" cx="74" cy="88" r="13" />
    </svg>
  );
}

function BeastVisual({ beast, compact = false }: { beast: BeastSpec; compact?: boolean }) {
  if (beast.cueType === "motion") return <MotionGlyph compact={compact} />;
  return <img src={beast.image} alt={beast.alt} />;
}

type Phase = "encounter" | "binding" | "archive";

export default function WordBeastPrototype() {
  const [phase, setPhase] = useState<Phase>("encounter");
  const [encounterIndex, setEncounterIndex] = useState(0);
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [selectedBeast, setSelectedBeast] = useState<BeastSpec | null>(null);
  const current = BEASTS[encounterIndex];

  useEffect(() => {
    if (phase !== "binding") return;
    const timer = window.setTimeout(() => {
      if (encounterIndex < BEASTS.length - 1) {
        setEncounterIndex((index) => index + 1);
        setWrongChoice(null);
        setPhase("encounter");
      } else {
        setPhase("archive");
      }
    }, 1650);
    return () => window.clearTimeout(timer);
  }, [phase, encounterIndex]);

  function answer(choice: string) {
    if (choice === current.word) {
      setWrongChoice(null);
      speak(current.word);
      setPhase("binding");
      return;
    }
    setWrongChoice(choice);
  }

  function restart() {
    setSelectedBeast(null);
    setWrongChoice(null);
    setEncounterIndex(0);
    setPhase("encounter");
  }

  if (phase === "archive") {
    const detail = selectedBeast;
    return (
      <div className="wordbeast-page archive-page">
        <header className="archive-header">
          <Link to="/" className="wordbeast-back" aria-label="返回首頁">
            ←
          </Link>
          <div>
            <p className="wordbeast-eyebrow">萬字譜・卷一</p>
            <h1>真名錄</h1>
          </div>
          <button className="archive-replay" onClick={restart}>
            重遇
          </button>
        </header>

        <main className="archive-main">
          <p className="archive-note">三隻字獸已留下真名。點開牠們查看知識。</p>
          <div className="archive-grid">
            {BEASTS.map((beast, index) => (
              <button
                className="word-entry captured"
                style={{ animationDelay: `${index * 90}ms` }}
                key={beast.word}
                onClick={() => setSelectedBeast(beast)}
              >
                <span className="entry-index">{["壹", "貳", "參"][index]}</span>
                <BeastVisual beast={beast} compact />
                <span className="entry-name">{beast.word.toUpperCase()}</span>
                <span className="entry-meaning">{beast.shortMeaning}・{beast.pos.split("・")[0]}</span>
                <span className="entry-seal" aria-label="已收服">
                  錄
                </span>
              </button>
            ))}
            <div className="word-entry unknown" aria-label="尚未遭遇的字獸">
              <span className="entry-index">肆</span>
              <span className="unknown-mark">?</span>
              <span className="entry-name">未識</span>
            </div>
          </div>
        </main>

        {detail && (
          <div className="detail-veil" role="dialog" aria-modal="true" aria-labelledby="beast-title">
            <section className="beast-dossier">
              <button
                className="detail-close"
                onClick={() => setSelectedBeast(null)}
                aria-label="關閉字獸資料"
              >
                ×
              </button>
              <div className="dossier-portrait">
                <BeastVisual beast={detail} />
                <span>封印穩固</span>
              </div>
              <div className="dossier-copy">
                <p className="wordbeast-eyebrow">真名解讀・{detail.pos}</p>
                <h2 id="beast-title">{detail.word}</h2>
                <button
                  className="pronounce"
                  aria-label={`播放 ${detail.word} 發音`}
                  onClick={() => speak(detail.word)}
                >
                  ♪　再次喚名
                </button>
                <p className="dossier-meaning">{detail.meaning}</p>
                <div className="dossier-rule" />
                <dl>
                  <div>
                    <dt>遭遇紀錄</dt>
                    <dd>{detail.example}</dd>
                    <dd className="translation">{detail.translation}</dd>
                  </div>
                  <div>
                    <dt>同族痕跡</dt>
                    <dd className="related-traces">
                      {detail.related.map((item) => (
                        <span className="related-trace" key={item.word}>
                          <span><strong>{item.word}</strong><small>{item.relation}</small></span>
                          <b>{item.meaning}</b>
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`wordbeast-page encounter-page ${phase}`}>
      <Link to="/" className="wordbeast-back light" aria-label="返回首頁">
        ×
      </Link>
      <Link to="/wordbeast/priest" className="priest-trial-entry">
        祭司試煉冊 <span>30</span>
      </Link>
      <Link to="/wordbeast/lv1" className="lv1-pilot-entry">
        LV1 圖卡盲測 <span>30</span>
      </Link>
      <div className="mist mist-one" />
      <div className="mist mist-two" />

      <header className="encounter-header">
        <p className="wordbeast-eyebrow">
          萬字譜・野外遭遇　{encounterIndex + 1}/{BEASTS.length}
        </p>
        <h1>{phase === "binding" ? "真名顯現" : "字獸來襲"}</h1>
        <div className="encounter-rule" />
      </header>

      <main className="encounter-main">
        <div className="beast-stage">
          <div className="ink-halo" />
          <div key={current.word} className="beast-visual">
            <BeastVisual beast={current} />
          </div>
          {phase === "binding" && (
            <>
              <div className="binding-ring" />
              <div className="true-name">{current.word.toUpperCase()}</div>
              <div className="capture-seal">錄</div>
            </>
          )}
        </div>

        {phase === "encounter" ? (
          <section className="naming-panel" aria-labelledby="naming-prompt">
            <p className="beast-clue" id="naming-prompt">
              「{current.clue}」
            </p>
            <p className="naming-instruction">看穿牠的偽裝，喚出英文真名</p>
            <div className="name-choices">
              {current.choices.map((choice) => (
                <button
                  key={choice}
                  className={wrongChoice === choice ? "wrong" : ""}
                  onClick={() => answer(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
            <p className={`encounter-feedback ${wrongChoice ? "visible" : ""}`}>
              偽名破碎了。再看清牠留下的線索。
            </p>
          </section>
        ) : (
          <section className="binding-copy" aria-live="polite">
            <p>真名已被喚醒</p>
            <strong>{current.word}</strong>
            <span>{current.shortMeaning}・{current.pos}</span>
            <small>
              {encounterIndex < BEASTS.length - 1 ? "下一道氣息正在靠近…" : "正在收錄《萬字譜》…"}
            </small>
          </section>
        )}
      </main>
    </div>
  );
}
