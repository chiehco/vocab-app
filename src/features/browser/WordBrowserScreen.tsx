import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { contentDb } from "../../db/contentDb";

const LEVELS = ["全部", "LV1", "LV2", "LV3", "LV4", "LV5", "LV6"];
const PAGE_SIZE = 100;

export default function WordBrowserScreen() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("全部");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const words = useLiveQuery(() => contentDb.words.orderBy("wordId").toArray(), []);

  const filtered = useMemo(() => {
    if (!words) return [];
    const q = search.trim().toLowerCase();
    return words.filter((w) => {
      if (level !== "全部" && w.level !== level) return false;
      if (!q) return true;
      return w.word.toLowerCase().includes(q) || (w.meaningZh ?? "").includes(q);
    });
  }, [words, search, level]);

  const shown = filtered.slice(0, limit);

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-bold">單字瀏覽</h1>
      <input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setLimit(PAGE_SIZE);
        }}
        placeholder="搜尋單字或中文意思…"
        className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500"
      />
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => {
              setLevel(lv);
              setLimit(PAGE_SIZE);
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${
              level === lv ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-300"
            }`}
          >
            {lv}
          </button>
        ))}
      </div>
      {!words ? (
        <p className="py-8 text-center text-slate-400">載入中…</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-500">共 {filtered.length} 個單字</p>
          <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow-sm">
            {shown.map((w) => (
              <li key={w.wordId}>
                <Link to={`/word/${w.wordId}`} className="flex items-baseline gap-2 px-4 py-3">
                  <span className="font-semibold">{w.word}</span>
                  <span className="text-xs text-slate-400">{w.pos}</span>
                  <span className="ml-auto max-w-[50%] truncate text-sm text-slate-600">
                    {w.meaningZh}
                  </span>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {w.level}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {filtered.length > limit && (
            <button
              onClick={() => setLimit(limit + PAGE_SIZE)}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-slate-600"
            >
              顯示更多（還有 {filtered.length - limit} 個）
            </button>
          )}
        </>
      )}
    </div>
  );
}
