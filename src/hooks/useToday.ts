import { useEffect, useState } from "react";
import { todayStr } from "../lib/dates";

/** 長時間開著或從背景返回時，打卡與到期清單仍跟隨裝置本地日期。 */
export function useToday(): string {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    let timer: number;
    const refresh = () => {
      setToday(todayStr());
      window.clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(refresh, Math.max(100, midnight.getTime() - now.getTime() + 50));
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return today;
}
