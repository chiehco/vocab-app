import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import Dexie from 'dexie';
import { progressDb } from '../../db/progressDb';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';
import { curriculum, questions, allQuestions, templateGroup, wrongQuestionIds } from './model';
import { saveGroup, startSession, startGroupSession, updateQuestion, submitAnswer, nextQuestion } from './store';
import { lookupWord } from './lookup';
import type { WordRecord } from '../../db/types';

beforeEach(async () => { await progressDb.delete(); await progressDb.open(); });
afterEach(async () => { await progressDb.delete(); });

it('migrates existing v1 progress without clearing it', async () => {
  await progressDb.delete();
  const old = new Dexie('VocabProgressDB');
  old.version(1).stores({cardStates:'word, dueDate, state',reviewLogs:'++id, word, reviewedAt, sessionId',checkIns:'date',quizStats:'word',settings:'key'});
  await old.table('settings').put({key:'sentinel',value:'keep'}); old.close();
  await progressDb.open();
  expect((await progressDb.settings.get('sentinel'))?.value).toBe('keep');
  expect(await progressDb.directAttempts.count()).toBe(0);
});
it('imports independent groups and preserves source; validates references', async () => {
  const a=templateGroup(), b=templateGroup();
  await saveGroup(a); await saveGroup(b);
  await saveGroup({...a,name:'我的考前',itemIds:a.itemIds.slice(1).reverse()});
  expect((await progressDb.customGroups.get(b.id))?.itemIds).toEqual(b.itemIds);
  expect(templateGroup().itemIds).toHaveLength(176);
  await expect(saveGroup({...a,itemIds:['missing']})).rejects.toThrow();
  await expect(saveGroup({...a,itemIds:[a.itemIds[0],a.itemIds[0]]})).rejects.toThrow();
});
it('persists hint and selection; submit is idempotent, retries retain first answer and leave SRS untouched', async () => {
  await progressDb.settings.put({key:'sentinel',value:42});
  const before=await exportProgress();
  const s=await startSession([questions[0].questionId]); const q=questions[0];
  await updateQuestion(s.id,q.questionId,{lookup:'material'});
  await updateQuestion(s.id,q.questionId,{choice:'B'});
  progressDb.close(); await progressDb.open();
  expect((await progressDb.directSessions.get(s.id))?.choices[q.questionId]).toBe('B');
  await Promise.all([submitAnswer(s.id,q.questionId),submitAnswer(s.id,q.questionId)]);
  const first=await progressDb.directAttempts.toArray(); expect(first).toHaveLength(1);
  expect(first[0]).toMatchObject({correct:false,firstAttempt:true,hintUsed:true,lookedUpWords:['material'],schedulingApplied:false});
  await updateQuestion(s.id,q.questionId,{lookup:'property'});
  expect(await progressDb.directAttempts.toArray()).toEqual(first);
  await nextQuestion(s.id);
  expect((await progressDb.directSessions.get(s.id))?.index).toBe(1);
  const retry=await startSession(wrongQuestionIds(first));
  await updateQuestion(retry.id,q.questionId,{choice:'A'}); await submitAnswer(retry.id,q.questionId);
  const attempts=await progressDb.directAttempts.toArray();
  expect(attempts.filter(a=>a.firstAttempt)).toEqual(first);
  expect(wrongQuestionIds(attempts)).toEqual([]);
  const after=await exportProgress();
  for (const key of ['cardStates','reviewLogs','checkIns','quizStats','settings'] as const) expect(after.data[key]).toEqual(before.data[key]);
});
it('roundtrips all new data; rejects malformed restore before mutation; v1 preserves new tables', async () => {
  const g=templateGroup(); await saveGroup(g);
  const s=await startSession();const q=questions[0];await updateQuestion(s.id,q.questionId,{choice:'A'});await submitAnswer(s.id,q.questionId);
  const backup=await exportProgress(); expect(validateBackup(backup)).toBeNull();
  await progressDb.customGroups.clear(); await progressDb.directAttempts.clear(); await progressDb.directSessions.clear();
  await importProgress(backup); expect((await exportProgress()).data).toEqual(backup.data);
  const invalid=structuredClone(backup);invalid.data.directSessions![0].index=-1;
  await expect(importProgress(invalid)).rejects.toThrow();expect((await exportProgress()).data).toEqual(backup.data);
  // A write failure after clearing must roll back every table.
  const broken=structuredClone(backup);broken.data.settings=[{value:5} as never];
  await expect(importProgress(broken)).rejects.toThrow();expect((await exportProgress()).data).toEqual(backup.data);
  await importProgress({app:'vocab-app-progress',schemaVersion:1,exportedAt:'2026-09-12',data:{cardStates:[],reviewLogs:[],checkIns:[],quizStats:[],settings:[]}});
  expect(await progressDb.customGroups.count()).toBe(1); expect(await progressDb.directAttempts.count()).toBe(1);
});
it('contains only authored examples and resolves every question token offline', () => {
  expect(curriculum.learningItems.filter(i=>i.kind==='vocabulary')).toHaveLength(123);
  expect(curriculum.learningItems.filter(i=>i.kind==='grammar')).toHaveLength(53);
  for (const i of curriculum.learningItems) if (i.originalExample) {
    expect(i.originalExample.provenance).toBe('authored_in_this_task');
    expect(i.originalExample.blankSentence.replace('_____',i.originalExample.answer)).toBe(i.originalExample.sentenceEn);
  }
  for (const q of questions) for (const text of [q.stem,...q.options.map(o=>o.text)]) for (const token of text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []) expect(lookupWord(token).source,token).not.toBe('尚未收錄');
  expect(lookupWord('zzzzzz').source).toBe('尚未收錄');
  expect(lookupWord('WOMEN', [{word:'woman',meaningZh:'女人'} as WordRecord]).word).toBe('women → woman');
  expect(lookupWord('to make').source).toBe('逐字參考・非片語或整句翻譯');
  expect(lookupWord('to make').meaning).toContain('make：');
});
it('all 176 group items have distinct questions; session snapshots preserve group order and text input across updates', async () => {
  expect(allQuestions).toHaveLength(495); // 360 LV3 + 135 LV4 Unit 17
  expect(new Set(allQuestions.map(q=>q.questionId)).size).toBe(495);
  for (const i of curriculum.learningItems) expect(allQuestions.filter(q=>q.learningItemId===i.learningItemId)).toHaveLength(1);
  const g=templateGroup();g.itemIds=[g.itemIds[1],g.itemIds[0],curriculum.learningItems.find(i=>i.kind==='grammar')!.learningItemId];await saveGroup(g);
  const groupSession=await startGroupSession(g.id);const s=await startSession(groupSession.questionIds,groupSession.title,g.id,groupSession.scopeQuestionIds,'advanced');const q=allQuestions.find(q=>q.questionId===s.questionIds[0])!;
  expect(q.targetWord).toBe('unity');
  await saveGroup({...g,itemIds:[]});
  expect((await progressDb.directSessions.get(s.id))?.questionIds).toEqual(s.questionIds);
  await expect(startGroupSession(g.id)).rejects.toThrow();
  await updateQuestion(s.id,q.questionId,{choice:'wrong'});
  await updateQuestion(s.id,q.questionId,{choice:''});
  await expect(submitAnswer(s.id,q.questionId)).rejects.toThrow();
  await Promise.all(['u','un','uni','unit',' UNITY '].map(choice=>updateQuestion(s.id,q.questionId,{choice})));
  await submitAnswer(s.id,q.questionId);
  const a=await progressDb.directAttempts.get(`${s.id}:${q.questionId}`);expect(a).toMatchObject({choice:' UNITY ',correct:true,schedulingApplied:false});
  const backup=await exportProgress();await importProgress(backup);
  expect((await progressDb.directSessions.get(s.id))?.scopeQuestionIds).toEqual(s.questionIds);
  const invalid=structuredClone(backup);invalid.data.directSessions![0].scopeQuestionIds=[];expect(validateBackup(invalid)).not.toBeNull();
});
it('grammar keys have one correct choice and group retries keep original scope', async () => {
  for(const q of allQuestions.filter(q=>q.sourceType==='new_grammar_authored')) {
    expect(q.options).toHaveLength(4);expect(new Set(q.options.map(o=>o.text)).size).toBe(4);
    expect(q.options.filter(o=>o.id===q.answer)).toHaveLength(1);
  }
  const group=templateGroup();await saveGroup(group);const s=await startGroupSession(group.id);
  const retry=await startSession([s.questionIds[0]],s.title,s.groupId,s.scopeQuestionIds);
  expect(retry.scopeQuestionIds).toHaveLength(176);expect(retry.questionIds).toHaveLength(1);
});
