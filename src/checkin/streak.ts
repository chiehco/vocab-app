import { differenceInCalendarDays, parseISO, subDays, format } from "date-fns";

/** 從今天（或昨天）往回數連續打卡天數。回傳 { streak, atRisk }：
 *  atRisk = 今天還沒打卡，streak 是「到昨天為止」的天數，今天不練就斷。 */
export function computeCurrentStreak(
  checkInDates: Set<string>,
  today: Date,
): { streak: number; atRisk: boolean } {
  const todayKey = format(today, "yyyy-MM-dd");
  const atRisk = !checkInDates.has(todayKey);
  let cursor = atRisk ? subDays(today, 1) : today;
  let streak = 0;
  while (checkInDates.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return { streak, atRisk: atRisk && streak > 0 };
}

export function computeLongestStreak(checkInDates: Set<string>): number {
  const sorted = [...checkInDates].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev !== null && differenceInCalendarDays(parseISO(d), parseISO(prev)) === 1) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }
  return longest;
}
