import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { progressDb } from "../../db/progressDb";
import { useToday } from "../../hooks/useToday";
import { monthBounds, monthCells, monthLabel, shiftMonth } from "./calendarMonth";
import "./checkin-calendar.css";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/**
 * 打卡月曆（2026-10-09 取代年度熱力圖）：有學的那天蓋章，沒學的日子留白、不畫叉，
 * 只記得來過，不提醒缺席。
 */
export default function CheckInCalendar() {
  const today = useToday();
  const checkIns = useLiveQuery(() => progressDb.checkIns.toArray(), []);
  const byDate = new Map((checkIns ?? []).map((c) => [c.date, c]));
  const { earliest, current } = monthBounds([...byDate.keys()], today);
  // null＝跟著本月走：頁面開著跨過月底也會自動換到新月份
  const [month, setMonth] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const wanted = month ?? current;
  const shown = wanted > current ? current : wanted < earliest ? earliest : wanted;
  const cells = monthCells(shown);
  const studied = cells.filter((c) => c.key && byDate.has(c.key)).length;
  // 跟隨本月跨月底時，前一個月的選取不應留在新月份的明細。
  const visibleSelected = selected?.slice(0, 7) === shown ? selected : null;
  const record = visibleSelected ? byDate.get(visibleSelected) : undefined;

  function go(delta: number) { setMonth(shiftMonth(shown, delta)); setSelected(null); }

  return (
    <div className="checkin-calendar">
      <div className="checkin-calendar-head">
        <button type="button" onClick={() => go(-1)} disabled={shown <= earliest} aria-label="上個月">‹</button>
        <div><strong>{monthLabel(shown)}</strong><small>{checkIns === undefined ? "讀取紀錄中…" : studied ?`這個月學了 ${studied} 天` : shown === current ? "這個月還沒開始，隨時都可以" : "這個月沒有紀錄"}</small></div>
        <button type="button" onClick={() => go(1)} disabled={shown >= current} aria-label="下個月">›</button>
      </div>
      <div className="checkin-calendar-grid" role="group" aria-label={`${monthLabel(shown)}學習紀錄`}>
        {WEEKDAYS.map((w) => <span key={w} className="checkin-weekday" aria-hidden="true">{w}</span>)}
        {cells.map((c, i) => {
          if (!c.key) return <span key={`pad-${i}`} />;
          const has = byDate.has(c.key);
          const future = c.key > today;
          return (
            <button type="button" key={c.key} disabled={future}
              className={`checkin-day${has ? " stamped" : ""}${c.key === today ? " today" : ""}`}
              aria-pressed={selected === c.key}
              aria-label={`${monthLabel(shown)} ${c.day} 日${has ? "，有學習" : ""}${c.key === today ? "，今天" : ""}`}
              onClick={() => setSelected(selected === c.key ? null : c.key)}>
              {c.day}
            </button>
          );
        })}
      </div>
      <p className="checkin-calendar-detail" aria-live="polite">
        {visibleSelected
          ? `${Number(visibleSelected.slice(5, 7))} 月 ${Number(visibleSelected.slice(8))} 日：${record ? `練習 ${record.reviewCount} 次，新學 ${record.newWordsCount} 個字` : "這天沒有紀錄"}`
          : "點日期看當天學了什麼。"}
      </p>
    </div>
  );
}
