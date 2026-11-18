import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { useToday } from "../../hooks/useToday";
import { examTaskSteps, getExamOverview } from "./examOverview";

export default function ExamTaskNextLink({ className }: { className?: string }) {
  const today = useToday();
  const task = useLiveQuery(async () => {
    try {
      return (await getExamOverview(today)).task;
    } catch {
      return null;
    }
  }, [today]);
  if (task === undefined) return <p role="status">正在整理下一步…</p>;
  const next = task && examTaskSteps.find(step => task[step.key] > 0);
  return <Link className={className} to={next ? next.to : "/"}>
    {next ? next.next : task ? "完成，返回首頁" : "返回首頁"}
  </Link>;
}
