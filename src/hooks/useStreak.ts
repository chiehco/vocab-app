import { useLiveQuery } from "dexie-react-hooks";
import { progressDb } from "../db/progressDb";
import { computeCurrentStreak, computeLongestStreak } from "../checkin/streak";
import { useToday } from "./useToday";

export function useStreak() {
  const today = useToday();
  return useLiveQuery(async () => {
    const dates = new Set(
      (await progressDb.checkIns.toCollection().primaryKeys()) as string[],
    );
    const { streak, atRisk } = computeCurrentStreak(dates, new Date());
    return { streak, atRisk, longest: computeLongestStreak(dates) };
  }, [today]);
}
