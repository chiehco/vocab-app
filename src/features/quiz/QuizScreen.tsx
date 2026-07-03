import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";
import { progressDb } from "../../db/progressDb";
import type { ExampleRecord, WordRecord } from "../../db/types";
import { pickDistractors, shuffle } from "../../quiz/distractors";
import { recordQuizAnswer } from "../../checkin/recordActivity";

const QUIZ_SIZE = 10;

type QuizMode = "w2m" | "m2w" | "fill";

interface McqQuestion {
  target: WordRecord;
  options: WordRecord[];
}

export default function QuizScreen() {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [questions, setQuestions] = useState<McqQuestion[] | null>(null);
  const [fillQuestions, setFillQuestions] = useState<ExampleRecord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [fillInput, setFillInput] = useState("");
  const [fillResult, setFillResult] = useState<"correct" | "wrong" | null>(null);
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);

  const fillPool = useLiveQuery(
    () =>
      contentDb.examples
        .filter((e) => !!e.blankSentence && !!e.answer)
        .toArray(),
    [],
  );

  const allWords = useLiveQuery(() => contentDb.words.toArray(), []);

  async function startMcq(m: QuizMode) {
    if (!allWords) return;
    const learned = new Set(
      (await progressDb.cardStates.toCollection().primaryKeys()) as string[],
    );
    const learnedWords = allWords.filter((w) => learned.has(w.word));
    const pool = learnedWords.length >= 4 ? learnedWords : allWords;
    const subjects = shuffle(pool).slice(0, QUIZ_SIZE);
    setQuestions(
      subjects.map((target) => ({
        target,
        options: shuffle([target, ...pickDistractors(target, allWords)]),
      })),
    );
    setMode(m);
    setIndex(0);
    setScore(0);
    setAnswered(null);
  }

  function startFill() {
    if (!fillPool || fillPool.length === 0) return;
    setFillQuestions(shuffle(fillPool).slice(0, QUIZ_SIZE));
    setMode("fill");
    setIndex(0);
    setScore(0);
    setFillInput("");
    setFillResult(null);
  }

  const total = useMemo(
    () => (mode === "fill" ? fillQuestions?.length ?? 0 : questions?.length ?? 0),
    [mode, questions, fillQuestions],
  );

  // ---- 模式選擇畫面 ----
  if (mode === null) {
    return (
      <div className="p-4">
        <h1 className="mb-4 text-xl font-bold">測驗</h1>
        <div className="space-y-3">
          <button
            onClick={() => startMcq("w2m")}
            disabled={!allWords}
            className="w-full rounded-xl bg-white p-5 text-left shadow-sm"
          >
            <p className="font-bold">看字選義 🇬🇧→🇹🇼</p>
            <p className="mt-1 text-sm text-slate-500">看英文單字，選出正確的中文意思</p>
          </button>
          <button
            onClick={() => startMcq("m2w")}
            disabled={!allWords}
            className="w-full rounded-xl bg-white p-5 text-left shadow-sm"
          >
            <p className="font-bold">看義選字 🇹🇼→🇬🇧</p>
            <p className="mt-1 text-sm text-slate-500">看中文意思，選出正確的英文單字</p>
          </button>
          {fillPool && fillPool.length > 0 ? (
            <button onClick={startFill} className="w-full rounded-xl bg-white p-5 text-left shadow-sm">
              <p className="font-bold">例句填空 ✍️</p>
              <p className="mt-1 text-sm text-slate-500">
                根據例句填入正確單字（目前共 {fillPool.length} 題）
              </p>
            </button>
          ) : (
            <div className="w-full rounded-xl bg-slate-100 p-5 text-left">
              <p className="font-bold text-slate-400">例句填空 ✍️</p>
              <p className="mt-1 text-sm text-slate-400">
                尚無例句可練習，請先在 Excel 中新增例句後重新匯入。
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- 結算畫面 ----
  if (index >= total) {
    return (
      <div className="flex flex-col items-center p-8 text-center">
        <p className="mb-2 text-4xl">{score === total ? "🏆" : "📝"}</p>
        <p className="text-lg font-bold">
          答對 {score} / {total} 題
        </p>
        <p className="mt-1 text-sm text-slate-500">已計入今日打卡。</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setMode(null)}
            className="rounded-xl border-2 border-blue-600 bg-white px-5 py-2.5 font-bold text-blue-600"
          >
            再測一次
          </button>
          <Link to="/" className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white">
            回首頁
          </Link>
        </div>
      </div>
    );
  }

  // ---- 例句填空 ----
  if (mode === "fill" && fillQuestions) {
    const q = fillQuestions[index];

    async function submitFill() {
      if (fillResult !== null) return;
      const correct =
        fillInput.trim().toLowerCase() === (q.answer ?? "").trim().toLowerCase();
      setFillResult(correct ? "correct" : "wrong");
      if (correct) setScore((s) => s + 1);
      const isNewSession = !sessionStarted.current;
      sessionStarted.current = true;
      await recordQuizAnswer(q.word, correct, "fill-blank", sessionId.current, isNewSession);
    }

    return (
      <div className="p-4">
        <p className="mb-3 text-sm text-slate-500">
          例句填空 {index + 1}/{total}｜得分 {score}
        </p>
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-lg">{q.blankSentence}</p>
          {q.sentenceZh && <p className="mt-2 text-sm text-slate-500">{q.sentenceZh}</p>}
          <input
            type="text"
            value={fillInput}
            onChange={(e) => setFillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitFill()}
            disabled={fillResult !== null}
            placeholder="填入單字…"
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500"
          />
          {fillResult === "correct" && (
            <p className="mt-3 font-bold text-green-600">✅ 答對了！</p>
          )}
          {fillResult === "wrong" && (
            <p className="mt-3 font-bold text-red-500">❌ 正確答案：{q.answer}</p>
          )}
        </div>
        <button
          onClick={() => {
            if (fillResult === null) {
              submitFill();
            } else {
              setIndex((i) => i + 1);
              setFillInput("");
              setFillResult(null);
            }
          }}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow"
        >
          {fillResult === null ? "送出答案" : "下一題"}
        </button>
      </div>
    );
  }

  // ---- 選擇題 ----
  if (!questions) return null;
  const q = questions[index];
  const prompt = mode === "w2m" ? q.target.word : q.target.meaningZh;
  const promptSub = mode === "w2m" ? q.target.pos : `（${q.target.pos}）`;

  async function pick(option: WordRecord) {
    if (answered !== null) return;
    setAnswered(option.word);
    const correct = option.word === q.target.word;
    if (correct) setScore((s) => s + 1);
    const isNewSession = !sessionStarted.current;
    sessionStarted.current = true;
    await recordQuizAnswer(
      q.target.word,
      correct,
      mode === "w2m" ? "quiz-w2m" : "quiz-m2w",
      sessionId.current,
      isNewSession,
    );
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
        {mode === "w2m" ? "看字選義" : "看義選字"} {index + 1}/{total}｜得分 {score}
      </p>
      <div className="rounded-2xl bg-white p-6 text-center shadow">
        <p className={mode === "w2m" ? "text-3xl font-bold" : "text-xl font-bold"}>{prompt}</p>
        <p className="mt-1 text-sm text-slate-400">{promptSub}</p>
      </div>
      <div className="mt-4 space-y-2.5">
        {q.options.map((option) => (
          <button
            key={option.word}
            onClick={() => pick(option)}
            className={`w-full rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${optionClass(option)}`}
          >
            {mode === "w2m" ? option.meaningZh : option.word}
          </button>
        ))}
      </div>
      {answered !== null && (
        <button
          onClick={() => {
            setIndex((i) => i + 1);
            setAnswered(null);
          }}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow"
        >
          下一題
        </button>
      )}
    </div>
  );
}
