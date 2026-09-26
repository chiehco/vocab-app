import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { practiceIds } from '../vocabulary/model';
import { unitItems, questionForMode, canonicalQuestionId, practiceQuestions, type DirectAttempt } from './model';
import { orderPracticeScope } from './practiceOrder';
import { startScopeSession, startSession, submitAnswer, updateQuestion } from './store';

beforeEach(async () => { await progressDb.delete(); await progressDb.open(); });
afterEach(async () => { await progressDb.delete(); });
const ids = practiceIds(unitItems(17, 'LV4').filter(i => i.kind === 'vocabulary'));

it('covers every word, putting the unseen tail before the previously repeated first 15', () => {
  const attempts = ids.slice(0, 15).map(id => ({ questionId: questionForMode(id, 'basic') } as DirectAttempt));
  const ordered = orderPracticeScope(ids, attempts, 'basic', () => .4);
  expect(ordered).toHaveLength(46);
  expect(new Set(ordered)).toEqual(new Set(ids.map(id => questionForMode(id, 'basic'))));
  expect(ordered.slice(0, 31).every(id => !attempts.some(a => a.questionId === id))).toBe(true);
  expect(orderPracticeScope(ids, [], 'advanced', () => 0)).not.toEqual(ids);
});

it('orders by practice count while keeping recognition and spelling independent', () => {
  const base = ids.slice(0, 3);
  const a = questionForMode(base[0], 'basic'), b = questionForMode(base[1], 'basic');
  const attempts = [a, a, b, base[2]].map(questionId => ({questionId} as DirectAttempt));
  expect(orderPracticeScope(base, attempts, 'basic', () => .5)).toEqual([questionForMode(base[2], 'basic'), b, a]);
  expect(orderPracticeScope(base, attempts, 'advanced', () => .5).at(-1)).toBe(base[2]);
});

it('new full-scope sessions preserve old in-progress answers and attempts', async () => {
  const old = await startSession(ids.slice(0, 10), 'LV4 Unit 17', undefined, ids);
  const first = practiceQuestions.find(q => q.questionId === old.questionIds[0])!;
  await updateQuestion(old.id, first.questionId, { choice: first.answer });
  await submitAnswer(old.id, first.questionId);
  const original = await progressDb.directSessions.get(old.id);
  const full = await startScopeSession(old.scopeQuestionIds!, old.title!);
  expect(full.questionIds).toHaveLength(46);
  expect(full.scopeQuestionIds).toHaveLength(46);
  expect(canonicalQuestionId(full.questionIds.at(-1)!)).toBe(first.questionId);
  expect(await progressDb.directSessions.get(old.id)).toEqual(original);
  expect(await progressDb.directAttempts.count()).toBe(1);
});
