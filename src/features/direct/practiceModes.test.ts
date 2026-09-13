import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { allQuestions, choiceQuestions, practiceQuestions, questionForMode, sessionMode, wrongQuestionIds } from './model';
import { startSession, switchPracticeMode, updateQuestion, submitAnswer, nextQuestion } from './store';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';

beforeEach(async () => { await progressDb.delete(); await progressDb.open(); });
afterEach(async () => { await progressDb.delete(); });
const original = allQuestions.find(q => !q.options.length)!;

it('all 261 vocabulary items have four unique stable choices and the original answer', () => {
  expect(choiceQuestions).toHaveLength(261);
  for (const q of choiceQuestions) {
    const spelling = allQuestions.find(x => x.questionId === questionForMode(q.questionId, 'advanced'))!;
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options.map(o => o.text.toLowerCase())).size).toBe(4);
    expect(q.options.find(o => o.id === q.answer)?.text).toBe(spelling.answer);
    expect(q.sentenceEn).toBe(spelling.sentenceEn);
    expect(q.sentenceZh).toBe(spelling.sentenceZh);
  }
});

it('defaults to choices, rejects typed answers, keeps spelling and recognition first attempts independent', async () => {
  const s = await startSession([original.questionId]);
  expect(sessionMode(s)).toBe('basic');
  const q = practiceQuestions.find(q => q.questionId === s.questionIds[0])!;
  await updateQuestion(s.id, q.questionId, {choice: original.answer});
  await expect(submitAnswer(s.id, q.questionId)).rejects.toThrow();
  await updateQuestion(s.id, q.questionId, {choice: q.options.find(o => o.id !== q.answer)!.id});
  await submitAnswer(s.id, q.questionId);
  const advanced = await switchPracticeMode(s.id, 'advanced');
  await updateQuestion(advanced.id, original.questionId, {choice: original.answer, lookup:'[首字母提示]'});
  progressDb.close(); await progressDb.open();
  expect((await switchPracticeMode(s.id, 'advanced')).id).toBe(advanced.id);
  await submitAnswer(advanced.id, original.questionId);
  const rows = await progressDb.directAttempts.toArray();
  expect(rows.filter(a => a.firstAttempt)).toHaveLength(2);
  expect(rows.find(a => a.sessionId === advanced.id)).toMatchObject({correct:true,hintUsed:true,schedulingApplied:false});
  expect(wrongQuestionIds(rows)).toEqual([q.questionId]);
  expect((await switchPracticeMode(advanced.id, 'basic')).id).toBe(s.id);
  const retry = await startSession([q.questionId]);
  await updateQuestion(retry.id, q.questionId, {choice:q.answer}); await submitAnswer(retry.id, q.questionId);
  expect((await progressDb.directAttempts.toArray()).filter(a => a.firstAttempt)).toHaveLength(2);
  expect(wrongQuestionIds(await progressDb.directAttempts.toArray())).toEqual([]);
  const backup = await exportProgress(); expect(validateBackup(backup)).toBeNull();
  await progressDb.directAttempts.clear(); await progressDb.directSessions.clear();
  await importProgress(backup); expect((await exportProgress()).data).toEqual(backup.data);
  expect(await progressDb.cardStates.count()).toBe(0);
});

it('preserves old spelling sessions, empty input, scope, and advanced retries', async () => {
  const old = await startSession([original.questionId], '舊練習', undefined, [original.questionId], 'advanced');
  await updateQuestion(old.id, original.questionId, {choice:'u'});
  await updateQuestion(old.id, original.questionId, {choice:''});
  await expect(submitAnswer(old.id, original.questionId)).rejects.toThrow();
  await updateQuestion(old.id, original.questionId, {choice:original.answer.toUpperCase()});
  await submitAnswer(old.id, original.questionId); await nextQuestion(old.id);
  const basic = await switchPracticeMode(old.id, 'basic');
  expect((await switchPracticeMode(basic.id, 'advanced')).index).toBe(1);
  const retry = await startSession(old.questionIds,old.title,old.groupId,old.scopeQuestionIds, 'advanced');
  expect(retry.questionIds).toEqual(old.questionIds);
  expect((await progressDb.directAttempts.toArray())[0].firstAttempt).toBe(true);
});
