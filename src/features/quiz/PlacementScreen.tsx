import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { setSetting, ALL_LEVELS } from "../../db/progressDb";
import type { WordRecord } from "../../db/types";
import {
  buildPlacementQuiz,
  scorePlacement,
  type LevelResult,
  type PlacementQuestion,
} from "../../quiz/placement";
import SpeakerButton from "../../components/SpeakerButton";

type Stage = "intro" | "quiz" | "result";

export default function PlacementScreen() {
  const [stage, setStage] = useState<Stage>("intro");
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [correctByLevel, setCorrectByLevel] = useState<Map<string, number>>(new Map());
  const [applied, setApplied] = useState(false);
  const navigate = useNavigate();

  const allWords = useLiveQuery(() => contentDb.words.toArray(), []);

  function start() {
    if (!allWords) return;
    setQuestions(buildPlacementQuiz(allWords));
    setIndex(0);
    setAnswered(null);
    setCorrectByLevel(new Map());
    setApplied(false);
    setStage("quiz");
  }

  if (stage === "intro") {
    return (
      <div className="p-4">
        <Link to="/quiz" className="text-sm text-blue-600">
          ← 回測驗
        </Link>
        <div className="mt-3 rounded-2xl bg-white p-6 text-center shadow">
          <p className="text-4xl">🧭</p>
          <h1 className="mt-2 text-xl font-bold">單字程度測試</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            從 LV1 到 LV6 各抽 4 個單字（共 24 題選擇題），由易到難，
            大約 3–5 分鐘。測完會估算目前的單字程度，
            並可以一鍵設定適合的學習範圍。
          </p>
          <p className="mt-2 text-xs text-slate-400">
            不會計入學習進度或打卡，隨時可以重測。
          </p>
          <button
            onClick={start}
            disabled={!allWords}
            className="mt-5 w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow"
          >
            開始測試
          </button>
        </div>
      </div>
    );
  }

  if (stage === "result") {
    const { results, recommendedLevel } = scorePlacement(
      ALL_LEVELS.map((lv) => ({
        level: lv,
        correct: correctByLevel.get(lv) ?? 0,
        total: questions.filter((q) => q.target.level === lv).length,
      })),
    );
    return (
      <div className="p-4">
        <h1 className="mb-1 text-xl font-bold">測試結果</h1>
        <p className="mb-4 text-sm text-slate-500">各等級答對率（每級 4 題）</p>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {results.map((r: LevelResult) => {
            const pct = r.total > 0 ? (r.correct / r.total) * 100 : 0;
            return (
              <div key={r.level} className="mb-3 flex items-center gap-3">
                <span className="w-9 text-sm font-bold text-slate-600">{r.level}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-orange-400" : "bg-red-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm text-slate-500">
                  {r.correct}/{r.total}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl bg-blue-50 p-5">
          <p className="font-bold text-blue-800">
            建議從 <span className="text-xl">{recommendedLevel}</span> 開始學習
          </p>
          <p className="mt-1 text-sm text-blue-700">
            {recommendedLevel === "LV1"
              ? "從基礎打起最穩！"
              : `${recommendedLevel} 之前的等級已相當熟悉，把力氣花在刀口上。`}
          </p>
          {applied ? (
            <p className="mt-3 text-sm font-bold text-green-600">
              ✅ 已將學習範圍設為 {recommendedLevel}，新字會從這一級開始引入。
            </p>
          ) : (
            <button
              onClick={async () => {
                await setSetting("learningLevels", [recommendedLevel]);
                setApplied(true);
              }}
              className="mt-3 w-full rounded-xl bg-blue-600 py-3 font-bold text-white"
            >
              套用建議（學習範圍設為 {recommendedLevel}）
            </button>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={start}
            className="flex-1 rounded-xl border-2 border-blue-600 bg-white py-2.5 font-bold text-blue-600"
          >
            重測一次
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white"
          >
            回首頁
          </button>
        </div>
      </div>
    );
  }

  // ---- 作答中 ----
  const q = questions[index];

  function pick(option: WordRecord) {
    if (answered !== null) return;
    setAnswered(option.word);
    if (option.word === q.target.word) {
      setCorrectByLevel((m) => {
        const next = new Map(m);
        next.set(q.target.level, (next.get(q.target.level) ?? 0) + 1);
        return next;
      });
    }
  }

  function optionClass(option: WordRecord): string {
    if (answered === null) return "border-slate-200 bg-white";
    if (option.word === q.target.word) return "border-green-500 bg-green-50";
    if (option.word === answered) return "border-red-400 bg-red-50";
    return "border-slate-200 bg-white opacity-50";
  }

  return (
    <div className="p-4">
      <p className="mb-3 text-sm text-slate-500">
        程度測試 {index + 1}/{questions.length}
      </p>
      <div className="rounded-2xl bg-white p-6 text-center shadow">
        <p className="text-3xl font-bold">
          {q.target.word}
          <SpeakerButton text={q.target.word} className="ml-2 align-middle" />
        </p>
        <p className="mt-1 text-sm text-slate-400">{q.target.pos}</p>
      </div>
      <div className="mt-4 space-y-2.5">
        {q.options.map((option) => (
          <button
            key={option.word}
            onClick={() => pick(option)}
            className={`w-full rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${optionClass(option)}`}
          >
            {option.meaningZh}
          </button>
        ))}
      </div>
      {answered !== null && (
        <button
          onClick={() => {
            if (index + 1 >= questions.length) setStage("result");
            else {
              setIndex((i) => i + 1);
              setAnswered(null);
            }
          }}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow"
        >
          {index + 1 >= questions.length ? "看結果" : "下一題"}
        </button>
      )}
    </div>
  );
}
