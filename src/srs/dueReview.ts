import { contentDb } from '../db/contentDb';
import { getLogicalCardStates } from '../db/progressIdentity';
import { todayStr } from '../lib/dates';
import { buildFunctionWordSet } from '../quiz/examScope';
import type { QueueItem } from './queue';

// The home entry and its destination share this queue. No fresh cards or same-day recap.
export async function getDueReviewQueue(today = todayStr()): Promise<QueueItem[]> {
  const states = (await getLogicalCardStates()).filter(c => c.state !== 'new' && c.dueDate <= today);
  if (!states.length) return [];
  const functions = buildFunctionWordSet(await contentDb.examPriorities.toArray());
  const words = await contentDb.words.where('word').anyOf(states.map(c => c.word)).toArray();
  const due = new Map(states.map(c => [c.word, c.dueDate]));
  return words.filter(w => !functions.has(w.word))
    .sort((a,b) => due.get(a.word)!.localeCompare(due.get(b.word)!) || a.wordId.localeCompare(b.wordId))
    .map(wordRecord => ({ wordRecord, isNew: false }));
}
