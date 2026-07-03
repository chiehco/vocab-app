import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Grade } from "../../db/types";
import { buildTodayQueue, type QueueItem } from "../../srs/queue";
import { gradeFlashcard } from "../../checkin/recordActivity";
import { GRADE_LABELS } from "../../srs/sm2";

const GRADE_STYLES: Record<Grade, string> = {
  0: "bg-red-500",
  1: "bg-orange-400",
  2: "bg-green-500",
  3: "bg-blue-500",
};

export default function ReviewScreen() {
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const sessionId = useRef(crypto.randomUUID());
  const sessionStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    buildTodayQueue().then((q) => {
      if (!cancelled) setQueue(q);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (queue === null) {
    return <p className="p-8 text-center text-slate-400">準備今日隊列中…</p>;
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center p-8 text-center">
        <p className="mb-2 text-4xl">🎉</p>
        <p className="text-lg font-bold">今天沒有待複習的單字</p>
        <p className="mt-1 text-sm text-slate-500">明天再來，或先去測驗練練手感。</p>
        <Link to="/" className="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white">
          回首頁
        </Link>
      </div>
    );
  }

  if (index >= queue.length) {
    return (
      <div className="flex flex-col items-center p-8 text-center">
        <p className="mb-2 text-4xl">✅</p>
        <p className="text-lg font-bold">完成！今天練了 {doneCount} 張卡</p>
        <p className="mt-1 text-sm text-slate-500">已自動打卡，明天見！</p>
        <Link to="/" className="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white">
          回首頁
        </Link>
      </div>
    );
  }

  const item = queue[index];
  const w = item.wordRecord;

  async function handleGrade(grade: Grade) {
    const isNewSession = !sessionStarted.current;
    sessionStarted.current = true;
    await gradeFlashcard(w.word, grade, sessionId.current, isNewSession);
    setDoneCount((c) => c + 1);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-col p-4" style={{ minHeight: "calc(100vh - 5rem)" }}>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${(index / queue.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-slate-500">
          {index + 1}/{queue.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="rounded-2xl bg-white p-6 text-center shadow">
          {item.isNew && (
            <span className="mb-2 inline-block rounded-full bg-green-100 px-3 py-0.5 text-xs font-bold text-green-700">
              新字
            </span>
          )}
          <p className="text-4xl font-bold">{w.word}</p>
          <p className="mt-1 text-slate-400">{w.pos}</p>

          {flipped && (
            <div className="mt-5 border-t border-slate-100 pt-5 text-left">
              <p className="text-center text-xl">{w.meaningZh}</p>
              {w.meaningEn && (
                <p className="mt-2 text-center text-sm text-slate-500">{w.meaningEn}</p>
              )}
              {w.usagePattern && (
                <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  用法：{w.usagePattern}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        {!flipped ? (
          <button
            onClick={() => setFlipped(true)}
            className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white shadow"
          >
            顯示答案
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {([0, 1, 2, 3] as Grade[]).map((g) => (
              <button
                key={g}
                onClick={() => handleGrade(g)}
                className={`rounded-xl py-3.5 font-bold text-white shadow ${GRADE_STYLES[g]}`}
              >
                {GRADE_LABELS[g]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
