import { progressDb } from '../../db/progressDb';
import { allQuestions, canonicalQuestionId, questionForMode, REVISION, sessionMode } from '../direct/model';
import { startScopeSession } from '../direct/store';
import { practiceIds } from '../vocabulary/model';
import { TOWN_ITEMS } from './townModel';

/** Navigation only: returning to town never submits an answer or advances a session. */
export interface TownPracticeReturn {
  to: string;
  state?: unknown;
}

export function directTownItem(questionId: string) {
  const baseId = questionForMode(canonicalQuestionId(questionId), 'advanced');
  const itemId = allQuestions.find(q => q.questionId === baseId)?.learningItemId;
  return TOWN_ITEMS.find(item => item.learningItemId === itemId);
}

export async function openTownDirectPractice(itemId: string) {
  const item = TOWN_ITEMS.find(item => item.learningItemId === itemId);
  const ids = item ? practiceIds([item]) : [];
  if (!ids.length) throw new Error('這個單字的題目暫時無法開啟。');
  // A cancelled, unanswered exercise can be resumed, including its choice and lookups.
  const existing = await progressDb.directSessions.orderBy('updatedAt').filter(session =>
    session.revision === REVISION && sessionMode(session) === 'basic'
    && session.questionIds.length === 1 && session.index === 0
    && questionForMode(canonicalQuestionId(session.questionIds[0]), 'advanced') === ids[0],
  ).last();
  if (existing && !await progressDb.directAttempts.get(`${existing.id}:${existing.questionIds[0]}`)) return existing;
  return startScopeSession(ids, `LV4 Unit 17 · ${item!.displayWord}`);
}
