import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import variants from './practiceVariantsLV4Unit17.json';
import { progressDb } from '../../db/progressDb';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';
import { allQuestions, canonicalQuestionId, firstTargetAttempts, isCorrectAnswer, practiceQuestions, questionForMode, selectPracticeVariant, variantQuestions, wrongQuestionIds, type DirectAttempt } from './model';
import { orderPracticeScope } from './practiceOrder';
import { startScopeSession, startReviewSession, startSession, submitAnswer, switchPracticeMode, updateQuestion } from './store';

beforeEach(async () => { await progressDb.delete(); await progressDb.open(); });
afterEach(async () => { await progressDb.delete(); });
const base = 'CLOZE-ORIG-LV4U17-elementary';
const history = (id: string, correct: boolean, time: number): DirectAttempt => ({
  id: `s${time}:${id}`, sessionId: `s${time}`, questionId: id, correct, answeredAt: time,
  choice: 'A', revision: '20260912-1', firstAttempt: true, hintUsed: false, lookedUpWords: [], schedulingApplied: false,
});
const answer = async (s: { id: string; questionIds: string[] }, correct = true) => {
  const q = practiceQuestions.find(q => q.questionId === s.questionIds[0])!;
  await updateQuestion(s.id, q.questionId, { choice: correct ? q.answer : q.options.find(o => o.id !== q.answer)!.id });
  await submitAnswer(s.id, q.questionId);
};

it('adds two distinct, reconstructable contexts for all 46 targets without changing legacy questions', () => {
  expect(variants).toHaveLength(92);
  expect(variantQuestions).toHaveLength(184);
  expect(new Set(practiceQuestions.map(q => q.questionId)).size).toBe(practiceQuestions.length);
  expect(new Set(variants.map(v => v.baseQuestionId)).size).toBe(46);
  for (const v of variants) {
    const original = allQuestions.find(q => q.questionId === v.baseQuestionId)!;
    expect(v.stem.match(/_____/g)).toHaveLength(1);
    expect(v.stem.replace('_____', v.answer)).toBe(v.sentenceEn);
    expect(v.sentenceEn).not.toBe(original.sentenceEn);
    expect(v.targetMeaningZh).toBe(original.targetMeaningZh);
    const pair = variants.filter(p => p.baseQuestionId === v.baseQuestionId);
    expect(pair).toHaveLength(2);
    expect(new Set(pair.map(p => p.sentenceEn)).size).toBe(2);
    const choice = practiceQuestions.find(q => q.questionId === questionForMode(v.questionId, 'basic'))!;
    expect(choice.options).toHaveLength(4);
    const correct = choice.options.find(o => o.id === choice.answer)!;
    expect(correct.text).toBe(v.answer);
    expect(correct.rationaleZh).toContain(v.sentenceZh);
    expect(correct.rationaleZh).not.toContain(original.sentenceZh!);
  }
  for (const q of variantQuestions.filter(q => q.targetWord === 'catalog' && !q.options.length)) {
    expect(isCorrectAnswer(q, ' Catalogue ')).toBe(true);
    expect(isCorrectAnswer(q, 'catalogs')).toBe(false);
  }
});

it('rotates unseen contexts across modes and never immediately repeats the last answered sentence', () => {
  const first = selectPracticeVariant(base, [], () => 0);
  const second = selectPracticeVariant(base, [history(first, true, 1)], () => 0);
  expect(second).not.toBe(first);
  expect(selectPracticeVariant(base, [history(first, true, 1), history(second, true, 2)], () => 0)).toBe(first);
  expect(selectPracticeVariant(questionForMode(base, 'basic'), [history(first, true, 1)], () => 0)).toBe(questionForMode(second, 'basic'));
  const untouched = 'CLOZE-ORIG-LV4U18-hollow';
  expect(selectPracticeVariant(untouched, [])).toBe(untouched);
});

it('counts coverage by target so a new context cannot push an already-practiced word ahead of unseen words', () => {
  const other = variants.find(v => v.targetWord === 'intermediate')!.baseQuestionId;
  const first = selectPracticeVariant(questionForMode(base, 'basic'), [], () => 0);
  const rows = [history(first, true, 1), history(questionForMode(base, 'basic'), false, 2)];
  expect(orderPracticeScope([base, first, other], rows, 'basic', () => .5)).toEqual([questionForMode(other, 'basic'), questionForMode(base, 'basic')]);
  expect(firstTargetAttempts(rows)).toEqual([rows[0]]);
});

it('a correct new context clears the old-context mistake, while spelling remains independent', () => {
  const first = selectPracticeVariant(base, [], () => 0);
  const second = selectPracticeVariant(base, [history(first, false, 1)], () => 0);
  const rows = [history(first, false, 1), history(questionForMode(first, 'basic'), false, 2), history(second, true, 3)];
  expect(wrongQuestionIds(rows)).toEqual([questionForMode(first, 'basic')]);
  expect(firstTargetAttempts(rows)).toHaveLength(2);
  expect(firstTargetAttempts(rows).every(a => !a.correct)).toBe(true);
});

it('retries with a new context inside the full scope, preserves old answers, and resumes each mode', async () => {
  const scope = [...new Set(variants.map(v => v.baseQuestionId))];
  const old = await startSession([base], 'Unit 17', undefined, scope);
  await answer(old, false);
  const oldSnapshot = await progressDb.directSessions.get(old.id);
  const retry = await startReviewSession(wrongQuestionIds(await progressDb.directAttempts.toArray()), old.title, undefined, old.scopeQuestionIds);
  expect(retry.questionIds).toHaveLength(1);
  expect(retry.scopeQuestionIds).toHaveLength(46);
  expect(retry.scopeQuestionIds).toContain(retry.questionIds[0]);
  expect(retry.questionIds[0]).not.toBe(old.questionIds[0]);
  const advanced = await switchPracticeMode(retry.id, 'advanced');
  expect(advanced.questionIds[0]).toBe(questionForMode(retry.questionIds[0], 'advanced'));
  expect((await switchPracticeMode(advanced.id, 'basic')).id).toBe(retry.id);
  await answer(retry);
  expect(wrongQuestionIds(await progressDb.directAttempts.toArray())).toEqual([]);
  const next = await startScopeSession(retry.scopeQuestionIds!, old.title!);
  expect(new Set(next.questionIds.map(canonicalQuestionId)).size).toBe(46);
  const repeated = next.questionIds.find(id => canonicalQuestionId(id) === canonicalQuestionId(retry.questionIds[0]));
  expect(repeated).not.toBe(retry.questionIds[0]);
  expect(await progressDb.directSessions.get(old.id)).toEqual(oldSnapshot);
});

it('round-trips legacy and variant snapshots and records through the existing progress backup', async () => {
  const legacy = await startSession([base]);
  await answer(legacy);
  const fresh = await startScopeSession([base], 'Unit 17');
  await answer(fresh);
  const backup = await exportProgress();
  expect(validateBackup(backup)).toBeNull();
  await progressDb.delete(); await progressDb.open();
  await importProgress(backup);
  expect(await progressDb.directSessions.get(legacy.id)).toEqual(backup.data.directSessions!.find(s => s.id === legacy.id));
  expect(await progressDb.directSessions.get(fresh.id)).toEqual(backup.data.directSessions!.find(s => s.id === fresh.id));
  expect(await progressDb.directAttempts.toArray()).toEqual(backup.data.directAttempts);
});
