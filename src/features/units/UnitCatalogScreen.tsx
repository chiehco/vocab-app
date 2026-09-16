import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useSearchParams } from "react-router-dom";
import { contentDb } from "../../db/contentDb";
import { getLogicalCardStates } from "../../db/progressIdentity";
import { buildStudyUnits, parseUnitOrder, unitOrderLabel } from "./unitPlan";
import AddUnitGroupButton from "./AddUnitGroupButton";
import "./units.css";

const LEVELS = ["LV1", "LV2", "LV3", "LV4", "LV5", "LV6"] as const;

function isLevel(value: string | null): value is (typeof LEVELS)[number] {
  return value !== null && LEVELS.includes(value as (typeof LEVELS)[number]);
}

export default function UnitCatalogScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const order = parseUnitOrder(searchParams.get("order"));
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

  const units = useMemo(
    () => data ? buildStudyUnits(data.words, selectedLevel, order) : [],
    [data, selectedLevel, order],
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
        <nav><Link to="/modes/words">← 單字模式</Link></nav>
        <p>LV1–LV6 單字</p>
        <h1>依 Unit 連續學習</h1>
        <p className="unit-catalog-intro">每 30 字一個 Unit，最後一組可少於 30 字。兩種排序共用原字卡與學習進度。</p>
      </header>

      <main className="unit-catalog-main">
        <section className="unit-level-picker" aria-labelledby="unit-level-title">
          <div className="unit-section-heading">
            <h2 id="unit-level-title">選擇等級</h2>
            <span>{learnedInLevel}／{totalInLevel || "—"} 已學</span>
          </div>
          <div className="level-tabs unit-level-buttons" aria-label="選擇等級">
            {LEVELS.map((level) => (
              <button
                type="button"
                key={level}
                aria-pressed={selectedLevel === level}
                onClick={() => chooseLevel(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </section>

        <section className="unit-order-picker" aria-label="單字排序">
          {(['exam','alphabet'] as const).map(value => <button key={value} aria-pressed={order===value} onClick={()=>{const next=new URLSearchParams(searchParams);next.set('order',value);setSearchParams(next,{replace:true});}}>{unitOrderLabel(value)}</button>)}
          <p>{order==='exam' ? '依 110–115 年考頻優先排列，未出現的字接在後面按字母排序。' : '依英文字母 A–Z 排列。'} 字卡依目前已安裝內容分組。</p>
        </section>
        {!data ? (
          <div className="unit-catalog-state" role="status"><i /><p>正在整理 Unit…</p></div>
        ) : units.length === 0 ? (
          <div className="unit-catalog-state empty"><b>空</b><h2>這個等級目前沒有可用字卡</h2><p>可先選擇其他等級。</p></div>
        ) : (
          <ol className="unit-list">
            {units.map((unit) => {
              const learned = unit.words.filter((word) => learnedWords.has(word.word)).length;
              const progress = unit.words.length ? Math.round((learned / unit.words.length) * 100) : 0;
              const preview = unit.words.slice(0, 3).map((word) => word.word).join(" · ");
              return (
                <li key={unit.unitId}>
                  <Link
                    to={`/units/${unit.level}/${unit.unitNumber}?index=0&order=${order}`}
                  >
                    <span className="unit-number"><small>Unit</small><b>{String(unit.unitNumber).padStart(2, "0")}</b></span>
                    <span className="unit-list-copy">
                      <span><b>{unit.words.length} 個單字</b><small>{learned === unit.words.length ? "已完成" : `已學 ${learned} 個`}</small></span>
                      <p>{preview}</p>
                      <span className="unit-progress-track" aria-label={`已學 ${learned}／${unit.words.length} 個`}><i style={{ width: `${progress}%` }} /></span>
                    </span>
                    <span className="unit-enter" aria-hidden="true">→</span>
                  </Link>
                  <AddUnitGroupButton unit={unit} orderLabel={unitOrderLabel(order)} />
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
