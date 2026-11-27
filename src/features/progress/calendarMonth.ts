import { addDays, endOfMonth, format, getDay, parseISO, startOfMonth } from "date-fns";

export interface CalendarCell {
  /** "YYYY-MM-DD"；月初前的補位格為 null */
  key: string | null;
  day: number | null;
}

/** 某月的月曆格：週日開頭，月初前補空格，月底後補到滿週。 */
export function monthCells(month: string): CalendarCell[] {
  const first = startOfMonth(parseISO(`${month}-01`));
  const last = endOfMonth(first);
  const cells: CalendarCell[] = Array.from({ length: getDay(first) }, () => ({ key: null, day: null }));
  for (let d = first; d <= last; d = addDays(d, 1)) cells.push({ key: format(d, "yyyy-MM-dd"), day: d.getDate() });
  while (cells.length % 7) cells.push({ key: null, day: null });
  return cells;
}

/** "YYYY-MM" 加減月份 */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** 可翻的範圍：最早到第一筆打卡的月份（沒有紀錄就是本月），最晚到本月，不給翻到未來。 */
export function monthBounds(dates: string[], today: string) {
  const current = today.slice(0, 7);
  const earliest = dates.reduce((min, d) => (d.slice(0, 7) < min ? d.slice(0, 7) : min), current);
  return { earliest, current };
}

export const monthLabel = (month: string) => `${Number(month.slice(0, 4))} 年 ${Number(month.slice(5, 7))} 月`;
