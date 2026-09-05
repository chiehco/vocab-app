import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useSearchParams } from "react-router-dom";
import { contentDb } from "../../db/contentDb";
import { getLogicalCardStates } from "../../db/progressIdentity";
import { DEFAULT_SETTINGS, getSetting } from "../../db/progressDb";
import { speak } from "../../lib/speech";
import { buildExamUnits } from "./unitPlan";
import "./units.css";

const LEVELS = ["LV1", "LV2", "LV3", "LV4", "LV5", "LV6"] as const;

function isLevel(value: string | null): value is (typeof LEVELS)[number] {
  return value !== null && LEVELS.includes(value as (typeof LEVELS)[number]);
}

export default function UnitCatalogScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLevel = searchParams.get("level")?.toUpperCase() ?? null;
  const selectedLevel = isLevel(requestedLevel) ? requestedLevel : LEVELS[0];
  const data = useLiveQuery(async () => {
    const [words, priorities, cards] = await Promise.all([
      contentDb.words.toArray(),
      contentDb.examPriorities.toArray(),
      getLogicalCardStates(),
    ]);
    return { words, priorities, cards };
  }, []);
  const autoPronounce = useLiveQuery(
    () => getSetting<boolean>("autoPronounce"),
    [],
    DEFAULT_SETTINGS.autoPronounce,
  );

  const units = useMemo(
    () => data ? buildExamUnits(data.words, data.priorities, selectedLevel) : [],
    [data, selectedLevel],
  );
  const learnedWords = useMemo(
    () => new Set((data?.cards ?? []).map((card) => card.word)),
    [data?.cards],
  );
  const learnedInLevel = units.reduce(
    (sum, unit) => sum + unit.words.filter((word) => learnedWords.has(word.word)).length,
    0,
  );
  const totalInLevel = units.reduce((sum, unit) => sum + unit.words.length, 0);

  function chooseLevel(level: (typeof LEVELS)[number]) {
    const next = new URLSearchParams(searchParams);
    next.set("level", level);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="unit-catalog-page">
      <header className="unit-catalog-hero">
        <nav><Link to="/exam">← 千單斬</Link><span>S+A UNIT STUDY</span></nav>
        <p>學測高頻單字</p>
        <h1>依 Unit 連續學習</h1>
        <p className="unit-catalog-intro">每個 Unit 依學測考頻排列 30 個字。進入後可一路看完，不必反覆回到單字表。</p>
      </header>

      <main className="unit-catalog-main">
        <section className="unit-level-picker" aria-labelledby="unit-level-title">
          <div className="unit-section-heading">
            <div><p>CHOOSE A LEVEL</p><h2 id="unit-level-title">選擇等級</h2></div>
            <span>{learnedInLevel}／{totalInLevel || "—"} 已學</span>
          </div>
          <div className="unit-level-buttons">
            {LEVELS.map((level) => (
              <button
                type="button"
                key={level}
                className={selectedLevel === level ? "active" : ""}
                aria-pressed={selectedLevel === level}
                onClick={() => chooseLevel(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </section>

        {!data ? (
          <div className="unit-catalog-state" role="status"><i /><p>正在整理 Unit…</p></div>
        ) : units.length === 0 ? (
          <div className="unit-catalog-state empty"><b>空</b><h2>這個等級目前沒有 S+A 單字</h2><p>可先選擇其他等級。</p></div>
        ) : (
          <ol className="unit-list">
            {units.map((unit) => {
              const learned = unit.words.filter((word) => learnedWords.has(word.word)).length;
              const progress = unit.words.length ? Math.round((learned / unit.words.length) * 100) : 0;
              const preview = unit.words.slice(0, 3).map((word) => word.word).join(" · ");
              return (
                <li key={unit.unitId}>
                  <Link
                    to={`/units/${unit.level}/${unit.unitNumber}?index=0`}
                    onClick={() => {
                      if (autoPronounce && unit.words[0]) speak(unit.words[0].word);
                    }}
                  >
                    <span className="unit-number"><small>UNIT</small><b>{String(unit.unitNumber).padStart(2, "0")}</b></span>
                    <span className="unit-list-copy">
                      <span><b>{unit.words.length} 個高頻字</b><small>{learned === unit.words.length ? "已完成" : `已學 ${learned} 個`}</small></span>
                      <p>{preview}</p>
                      <span className="unit-progress-track" aria-label={`已學 ${learned}／${unit.words.length} 個`}><i style={{ width: `${progress}%` }} /></span>
                    </span>
                    <span className="unit-enter" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        <p className="unit-catalog-note">Unit 負責安排學習順序；到期複習仍由記憶曲線統一安排。</p>
      </main>
    </div>
  );
}
