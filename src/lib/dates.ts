import { addDays, format, parseISO } from "date-fns";

/** 本機日期字串 "YYYY-MM-DD"（打卡與到期判斷都以裝置當地日為準） */
export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function addDaysStr(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), "yyyy-MM-dd");
}
