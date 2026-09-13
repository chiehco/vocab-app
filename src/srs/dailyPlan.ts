import { differenceInCalendarDays, parseISO } from 'date-fns';
import { contentDb } from '../db/contentDb';
import { getLogicalCardStates } from '../db/progressIdentity';
import { getSetting, progressDb } from '../db/progressDb';
import { todayStr } from '../lib/dates';
import { sortStandaloneStudyWords } from '../quiz/examScope';

// Planning estimates, not measured learning speed or a claim of mastery.
export const DAILY_PLAN_MINUTES = 15;
export const REVIEW_SECONDS = 20;
export const NEW_WORD_SECONDS = 60;
export const CONSOLIDATION_DAYS = 28;
const count = (n: number) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;

export function calculateDailyPlan(input: {
  unseen: number; due: number; daysLeft: number; cap: number; newToday: number; answersToday: number;
}) {
  const unseen=count(input.unseen), due=count(input.due), daysLeft=count(input.daysLeft);
  const newToday=count(input.newToday), answersToday=Math.max(newToday,count(input.answersToday));
  const cap=Math.min(10,count(input.cap));
  const learningDays=Math.max(1,daysLeft-CONSOLIDATION_DAYS);
  const neededPerDay=Math.ceil((unseen+newToday)/learningDays);
  const dailyTarget=daysLeft > 0 ? Math.min(cap,Math.max(8,neededPerDay)) : 0;
  const spentSeconds=newToday*NEW_WORD_SECONDS+(answersToday-newToday)*REVIEW_SECONDS;
  const remainingSeconds=Math.max(0,DAILY_PLAN_MINUTES*60-spentSeconds-due*REVIEW_SECONDS);
  // Reserve the initial encounter AND one formal recall for each new word.
  const timeSlots=Math.floor(remainingSeconds/(NEW_WORD_SECONDS+REVIEW_SECONDS));
  const remainingNew=Math.min(unseen,Math.max(0,dailyTarget-newToday),timeSlots);
  const overBudget=spentSeconds+due*REVIEW_SECONDS>DAILY_PLAN_MINUTES*60;
  return {unseen,due,daysLeft,cap,dailyTarget,neededPerDay,newToday,remainingNew,spentSeconds,
    estimatedRemainingMinutes:Math.ceil((due*REVIEW_SECONDS+remainingNew*(NEW_WORD_SECONDS+REVIEW_SECONDS))/60),
    overBudget,paceTooSlow:unseen>0 && neededPerDay>cap,
    consolidationDays:CONSOLIDATION_DAYS};
}

/** Shared by the GSAT overview, automatic new-word entry and review queue. Read-only. */
export async function getDailyLearningPlan(today=todayStr()) {
  const [words,priorities,cards,cap,checkIn,examDate] = await Promise.all([
    contentDb.words.toArray(),contentDb.examPriorities.toArray(),getLogicalCardStates(),
    getSetting<number>('dailyNewWordCap'),progressDb.checkIns.get(today),getSetting<string>('examDate'),
  ]);
  const eligible=sortStandaloneStudyWords(words,priorities);
  const eligibleSet=new Set(eligible.map(w=>w.word)), known=new Set(cards.map(c=>c.word));
  const due=cards.filter(c=>eligibleSet.has(c.word) && (c.dueDate<=today || c.practicePending)).length;
  const unseen=eligible.filter(w=>!known.has(w.word)).length;
  return calculateDailyPlan({unseen,due,daysLeft:differenceInCalendarDays(parseISO(examDate),parseISO(today)),cap,
    newToday:checkIn?.newWordsCount ?? 0,answersToday:checkIn?.reviewCount ?? 0});
}
