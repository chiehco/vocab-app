import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { contentDb } from "../../db/contentDb";
import { getLogicalCardStates } from "../../db/progressIdentity";
import { getSetting, progressDb } from "../../db/progressDb";
import type { CardState, ExamPriorityRecord, WordRecord } from "../../db/types";
import { sortStandaloneStudyWords } from "../../quiz/examScope";
import { getDailyLearningPlan } from "../../srs/dailyPlan";
import type { QueueItem } from "../../srs/queue";
import { selectDailyWords } from "../wordbeast/dailyCapture";
import { buildExamHubProgress } from "./examHub";
import { estimateCoverage } from "./studyPlan";

export const examTaskSteps = [
  { key: "due", label: "到期複習", start: "從複習開始", next: "接著複習", to: "/review?task=due" },
  { key: "new", label: "今日新字", start: "從新字開始", next: "接著學新字", to: "/wordbeast?task=new" },
  { key: "confirm", label: "當日再確認", start: "從再確認開始", next: "接著再確認", to: "/review?task=confirm" },
] as const;

export function buildExamTaskReviewQueues(
  words: WordRecord[],
  priorities: ExamPriorityRecord[],
  cards: CardState[],
  today: string,
) {
  const cardByWord = new Map(cards.map(card => [card.word, card]));
  const queues: { due: QueueItem[]; confirm: QueueItem[] } = { due: [], confirm: [] };
  for (const wordRecord of sortStandaloneStudyWords(words, priorities)) {
    const card = cardByWord.get(wordRecord.word);
    if (!card || (card.dueDate > today && !card.practicePending)) continue;
    const created = new Date(card.createdAt);
    const step = isValid(created) && format(created, "yyyy-MM-dd") === today ? "confirm" : "due";
    queues[step].push({ wordRecord, isNew: false, isPractice: !!card.practicePending });
  }
  return queues;
}

export async function getExamDetails(today: string) {
  const [date, examName] = await Promise.all([
    getSetting<string>("examDate"),
    getSetting<string>("examName"),
  ]);
  const name = typeof examName === "string" ? examName.trim() : "";
  const parsedDate = parseISO(typeof date === "string" ? date : "");
  return {
    name: name || "學測",
    isGsat: !name,
    countdown: isValid(parsedDate) ? {
      daysLeft: Math.max(0, differenceInCalendarDays(parsedDate, parseISO(today))),
      date: format(parsedDate, "yyyy.MM.dd"),
    } : null,
  };
}

async function getExamStudyData() {
  const [words, priorities, cards] = await Promise.all([
    contentDb.words.toArray(),
    contentDb.examPriorities.toArray(),
    getLogicalCardStates(),
  ]);
  return { words, priorities, cards };
}

export async function getExamTaskReviewQueue(today: string, step: "due" | "confirm") {
  const { words, priorities, cards } = await getExamStudyData();
  return buildExamTaskReviewQueues(words, priorities, cards, today)[step];
}

export async function getExamOverview(today: string) {
  const [{ words, priorities, cards }, dailyPlan, checkIn] = await Promise.all([
    getExamStudyData(),
    getDailyLearningPlan(today),
    progressDb.checkIns.get(today),
  ]);
  const installed = new Set(words.map(word => word.word));
  const progress = buildExamHubProgress(priorities.filter(row => installed.has(row.word)), cards, today);
  const queues = buildExamTaskReviewQueues(words, priorities, cards, today);
  const newWords = selectDailyWords({
    words, priorities, examples: [], relations: [],
    known: new Set(cards.map(card => card.word)), remaining: dailyPlan.remainingNew,
  }).length;
  return {
    ...progress,
    dailyPlan,
    coverage: estimateCoverage(progress.total - progress.learned, dailyPlan.dailyTarget, dailyPlan.daysLeft),
    task: { due: queues.due.length, new: newWords, confirm: queues.confirm.length },
    practiced: checkIn?.reviewCount ?? 0,
  };
}
