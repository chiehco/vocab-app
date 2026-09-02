import { useEffect, useRef, useState } from "react";
import { addDays, format, getDay, parseISO, startOfWeek, subWeeks } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { progressDb } from "../../db/progressDb";
import { useToday } from "../../hooks/useToday";

function bucketClass(count: number): string {
  if (count === 0) return "bg-slate-100";
  if (count <= 4) return "bg-blue-200";
  if (count <= 9) return "bg-blue-400";
  return "bg-blue-600";
}

/** GitHub 風格打卡熱力圖：直欄=週、橫列=週日到週六。 */
export default function CheckInHeatmap({ weeks = 53 }: { weeks?: number }) {
  const [selected, setSelected] = useState<string | null>(null);

  const checkIns = useLiveQuery(() => progressDb.checkIns.toArray(), []);
  const byDate = new Map((checkIns ?? []).map((c) => [c.date, c]));

  const todayKey = useToday();
  const today = parseISO(todayKey);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, [todayKey, weeks]);
  const start = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 0 });
  const cells: { date: Date; key: string }[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) {
    cells.push({ date: d, key: format(d, "yyyy-MM-dd") });
  }

  const selectedRecord = selected ? byDate.get(selected) : undefined;

  return (
    <div>
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div
          className="grid grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: "repeat(7, 1fr)" }}
        >
          {/* 補齊第一週開頭的空格，讓每欄從週日開始 */}
          {Array.from({ length: getDay(cells[0]?.date ?? today) }).map((_, i) => (
            <div key={`pad-${i}`} className="h-3 w-3" />
          ))}
          {cells.map(({ key }) => {
            const count = byDate.get(key)?.reviewCount ?? 0;
            return (
              <button
                key={key}
                onClick={() => setSelected(selected === key ? null : key)}
                className={`h-3 w-3 rounded-[3px] ${bucketClass(count)} ${
                  selected === key ? "ring-2 ring-blue-600" : ""
                }`}
                aria-label={`${key}：${count} 次練習`}
              />
            );
          })}
        </div>
      </div>
      {selected && (
        <p className="mt-2 text-xs text-slate-500">
          {selected}：
          {selectedRecord
            ? `練習 ${selectedRecord.reviewCount} 次，新學 ${selectedRecord.newWordsCount} 字`
            : "沒有練習紀錄"}
        </p>
      )}
    </div>
  );
}
