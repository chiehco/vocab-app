import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';
import { activeQuestions, advanceGsat, editGsat, gsatIds, gsatPassage, gsatPassages, gsatQuestions, gsatWrongIds, startGsat, submitGsat } from './gsatStore';

beforeEach(async () => { await progressDb.delete(); await progressDb.open(); });
afterEach(async () => { await progressDb.delete(); });
const passageIds = gsatPassage.question_ids;
it('preserves first-15 sessions and separately validates each new shared-option group', async () => {
  const old = await startGsat(gsatIds.slice(0,15));
  expect(old.questionIds).toHaveLength(15);
  for (const p of gsatPassages.slice(1)) {
    await expect(startGsat(p.question_ids.slice(1))).rejects.toThrow();
    const s = await startGsat(p.question_ids);
    await editGsat(s.id,{lookup:'the'});
    for (const id of p.question_ids) {
      const q = gsatQuestions.find(q => q.question_id === id)!;
      await editGsat(s.id,{questionId:id,choice:q.answer.value});
    }
    await submitGsat(s.id);
    const rows = await progressDb.directAttempts.where('sessionId').equals(s.id).toArray();
    expect(rows).toHaveLength(p.question_ids.length);
    expect(rows.every(a => a.correct && a.hintUsed)).toBe(true);
    await advanceGsat(s.id);
    expect((await progressDb.directSessions.get(s.id))?.index).toBe(p.question_ids.length);
  }
  const b = await exportProgress(); expect(validateBackup(b)).toBeNull();
  await importProgress(b); expect((await progressDb.directSessions.get(old.id))?.questionIds).toHaveLength(15);
  b.data.directAttempts!.pop(); expect(validateBackup(b)).not.toBeNull();
});
it('retries only the affected passage and rolls back the entire group on a storage failure', async () => {
  const p=gsatPassages[2], s=await startGsat(p.question_ids);
  for(const id of p.question_ids) await editGsat(s.id,{questionId:id,choice:gsatQuestions.find(q=>q.question_id===id)!.answer.value});
  const fail=(_key: unknown,obj: {questionId:string})=>{if(obj.questionId===p.question_ids[5])throw new Error('simulated write failure');};
  progressDb.directAttempts.hook('creating',fail);
  try { await expect(submitGsat(s.id)).rejects.toThrow('simulated'); }
  finally { progressDb.directAttempts.hook('creating').unsubscribe(fail); }
  expect(await progressDb.directAttempts.count()).toBe(0);
  await editGsat(s.id,{questionId:p.question_ids[0],choice:'A'});await submitGsat(s.id);
  expect(gsatWrongIds(await progressDb.directAttempts.toArray())).toEqual(p.question_ids);
});
async function choose(id: string, values = ['B','C','D','D','A']) {
  for (const [i,qid] of passageIds.entries()) await editGsat(id,{questionId:qid,choice:values[i]});
}
it('rejects broken passage scopes and keeps vocabulary submissions individual', async () => {
  await expect(startGsat([passageIds[0]])).rejects.toThrow();
  const s = await startGsat();
  await editGsat(s.id,{questionId:gsatIds[0],choice:'B'});
  await submitGsat(s.id); await advanceGsat(s.id);
  expect(await progressDb.directAttempts.count()).toBe(1);
  expect(activeQuestions((await progressDb.directSessions.get(s.id))!)[0].number).toBe(2);
});
it('persists drafts across reopen, refuses partial submission and advance without any attempt writes', async () => {
  const s = await startGsat(passageIds);
  await editGsat(s.id,{questionId:passageIds[0],choice:'B'});
  progressDb.close(); await progressDb.open();
  expect((await progressDb.directSessions.get(s.id))?.choices[passageIds[0]]).toBe('B');
  await expect(submitGsat(s.id)).rejects.toThrow(); await advanceGsat(s.id);
  expect(await progressDb.directAttempts.count()).toBe(0);
  expect((await progressDb.directSessions.get(s.id))?.index).toBe(0);
});
it('commits all five once even with duplicate submissions; post-answer lookup cannot change hints', async () => {
  const s = await startGsat(passageIds); await choose(s.id);
  await Promise.all([submitGsat(s.id),submitGsat(s.id)]);
  await editGsat(s.id,{lookup:'rhinos',questionId:passageIds[0],choice:'A'});
  const rows = await progressDb.directAttempts.toArray();
  expect(rows).toHaveLength(5); expect(rows.every(a => a.correct && a.firstAttempt && !a.hintUsed)).toBe(true);
  expect((await progressDb.directSessions.get(s.id))?.choices[passageIds[0]]).toBe('B');
  await advanceGsat(s.id); expect((await progressDb.directSessions.get(s.id))?.index).toBe(5);
});
it('marks all passage items when looking up and keeps original errors after whole-passage retry', async () => {
  const s = await startGsat(passageIds); await editGsat(s.id,{lookup:'rhinos'}); await choose(s.id,['A','C','D','D','A']); await submitGsat(s.id);
  expect((await progressDb.directAttempts.toArray()).every(a => a.hintUsed)).toBe(true);
  expect(gsatWrongIds(await progressDb.directAttempts.toArray())).toEqual(passageIds);
  const retry = await startGsat(passageIds); await choose(retry.id); await submitGsat(retry.id);
  const rows = await progressDb.directAttempts.toArray();
  expect(rows.filter(a => a.firstAttempt && a.correct)).toHaveLength(4);
  expect(rows.filter(a => a.firstAttempt)).toHaveLength(5);
  expect(gsatWrongIds(rows)).toEqual([]);
  expect(await progressDb.cardStates.count()).toBe(0); expect(await progressDb.reviewLogs.count()).toBe(0);
});
it('round-trips draft and submitted groups without affecting other settings; rejects truncated group restores', async () => {
  await progressDb.settings.put({key:'sentinel',value:42});
  const draft = await startGsat(); await editGsat(draft.id,{questionId:gsatIds[0],choice:'C'});
  const s = await startGsat(passageIds); await choose(s.id); await submitGsat(s.id);
  const backup = await exportProgress(); expect(validateBackup(backup)).toBeNull();
  await progressDb.directSessions.clear(); await progressDb.directAttempts.clear();
  await importProgress(backup);
  expect(await progressDb.directAttempts.count()).toBe(5);
  expect((await progressDb.directSessions.get(draft.id))?.choices[gsatIds[0]]).toBe('C');
  expect((await progressDb.settings.get('sentinel'))?.value).toBe(42);
  backup.data.directAttempts!.pop();
  await expect(importProgress(backup)).rejects.toThrow();
  expect(await progressDb.directAttempts.count()).toBe(5);
});

it('isolates years, rejects mixed-year sessions and restores both first answers without touching written data', async () => {
  await expect(startGsat(['gsat-115-q01','gsat-114-q01'])).rejects.toThrow();
  const old = await startGsat(['gsat-115-q01']);
  await editGsat(old.id,{questionId:'gsat-115-q01',choice:'A'}); await submitGsat(old.id);
  const fresh = await startGsat(['gsat-114-q01']);
  expect(fresh.scopeQuestionIds?.every(id => id.startsWith('gsat-114-'))).toBe(true);
  await editGsat(fresh.id,{questionId:'gsat-114-q01',choice:'C'}); await submitGsat(fresh.id);
  let rows = await progressDb.directAttempts.toArray();
  expect(rows.filter(a => a.firstAttempt)).toHaveLength(2);
  expect(gsatWrongIds(rows,'114')).toEqual([]);
  expect(gsatWrongIds(rows,'115')).toEqual(['gsat-115-q01']);
  const retry = await startGsat(['gsat-114-q01']);
  await editGsat(retry.id,{questionId:'gsat-114-q01',choice:'A'}); await submitGsat(retry.id);
  const b = await exportProgress(); expect(validateBackup(b)).toBeNull();
  await importProgress(b); rows = await progressDb.directAttempts.toArray();
  expect(rows.filter(a => a.firstAttempt)).toHaveLength(2);
  expect(rows.find(a => a.sessionId === fresh.id)?.correct).toBe(true);
  expect(gsatWrongIds(rows,'114')).toEqual(['gsat-114-q01']);
  expect(gsatWrongIds(rows,'115')).toEqual(['gsat-115-q01']);
});
