import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { addDays, format } from 'date-fns';
import { calculateDailyPlan, getDailyLearningPlan } from './dailyPlan';
import { contentDb } from '../db/contentDb';
import { progressDb, setSetting } from '../db/progressDb';
import { buildTodayQueue } from './queue';
import { newCardState } from './sm2';
import { todayStr } from '../lib/dates';
import { sortStandaloneStudyWords } from '../quiz/examScope';
import pack from '../../public/data/v1/sa-pack.json';
import type { WordRecord, ExamPriorityRecord } from '../db/types';

const base={unseen:663,due:0,daysLeft:126,cap:15,newToday:0,answersToday:0};
beforeEach(async()=>{await contentDb.open();await progressDb.open();});
afterEach(async()=>{await contentDb.delete();await progressDb.delete();});
it('starts with eight words and reduces new words as reviews fill the time budget',()=>{
  expect(calculateDailyPlan(base).remainingNew).toBe(8);
  expect(calculateDailyPlan({...base,due:20}).remainingNew).toBe(6);
  expect(calculateDailyPlan({...base,due:30}).remainingNew).toBe(3);
  expect(calculateDailyPlan({...base,due:45}).remainingNew).toBe(0);
  const overloaded=calculateDailyPlan({...base,due:60});
  expect(overloaded.overBudget).toBe(true);expect(overloaded.due).toBe(60);expect(overloaded.estimatedRemainingMinutes).toBe(20);
});
it('accounts for work already done, respects smaller settings and never escalates above ten',()=>{
  expect(calculateDailyPlan({...base,cap:5}).remainingNew).toBe(5);
  expect(calculateDailyPlan({...base,cap:0}).remainingNew).toBe(0);
  expect(calculateDailyPlan({...base,newToday:8,answersToday:8}).remainingNew).toBe(0);
  const before=calculateDailyPlan({...base,due:30});
  const after=calculateDailyPlan({...base,due:10,answersToday:20});
  expect(after.remainingNew).toBe(before.remainingNew);
  const urgent=calculateDailyPlan({...base,daysLeft:29,cap:30});
  expect(urgent.dailyTarget).toBe(10);expect(urgent.paceTooSlow).toBe(true);
});
it('handles completed, expired and invalid inputs without introducing new words',()=>{
  expect(calculateDailyPlan({...base,unseen:0}).remainingNew).toBe(0);
  expect(calculateDailyPlan({...base,daysLeft:0}).remainingNew).toBe(0);
  expect(calculateDailyPlan({...base,daysLeft:-5}).remainingNew).toBe(0);
  expect(calculateDailyPlan({...base,cap:NaN}).remainingNew).toBe(0);
  expect(calculateDailyPlan({...base,newToday:10,answersToday:200}).remainingNew).toBe(0);
});
it('keeps automatic queue and shared plan consistent, prioritizes all due cards and does not alter progress',async()=>{
  const words=pack.words as WordRecord[], priorities=pack.examPriorities as ExamPriorityRecord[];
  await contentDb.words.bulkPut(words);await contentDb.examPriorities.bulkPut(priorities);
  const today=todayStr();await setSetting('examDate',format(addDays(new Date(),126),'yyyy-MM-dd'));await setSetting('dailyNewWordCap',15);
  const eligible=sortStandaloneStudyWords(words,priorities);
  const due=eligible.slice(0,30).map(w=>({...newCardState(w.word,today),state:'review' as const,dueDate:today,practicePending:false}));
  await progressDb.cardStates.bulkPut(due);
  const before=await progressDb.cardStates.toArray();
  const plan=await getDailyLearningPlan(today);
  const queue=await buildTodayQueue(undefined,eligible.map(w=>w.word),true);
  expect(plan.remainingNew).toBe(3);expect(queue.filter(i=>i.isNew)).toHaveLength(3);
  expect(queue.slice(0,30).every(i=>!i.isNew)).toBe(true);
  expect(await progressDb.cardStates.toArray()).toEqual(before);
  // Mark twenty reviews completed; the apparent free time must not be reset by reopening.
  for(const c of due.slice(0,20))await progressDb.cardStates.put({...c,dueDate:format(addDays(new Date(),6),'yyyy-MM-dd')});
  await progressDb.checkIns.put({date:today,reviewCount:20,newWordsCount:0,sessionsCount:1});
  expect((await getDailyLearningPlan(today)).remainingNew).toBe(3);
});
