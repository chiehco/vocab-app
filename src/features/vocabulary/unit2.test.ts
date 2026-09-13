import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { templateGroup, unitItems, allQuestions, validGroup, practiceQuestions } from '../direct/model';
import { saveGroup, startGroupSession, updateQuestion, submitAnswer, nextQuestion } from '../direct/store';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';
import { reviewedExample } from './model';

beforeEach(async()=>{await progressDb.delete();await progressDb.open();});
afterEach(async()=>{await progressDb.delete();});
it('covers Unit 2 source entries, original examples and grammar without changing the Unit 1 template',()=>{
 const items=unitItems(2),voc=items.filter(i=>i.kind==='vocabulary');
 expect(items).toHaveLength(178);expect(voc).toHaveLength(138);
 expect(templateGroup().itemIds).toHaveLength(176);expect(templateGroup(2).itemIds).toHaveLength(178);
 expect(voc.every(i=>!!reviewedExample(i))).toBe(true);
 for(const i of items){expect(i.sourcePage).toBeGreaterThanOrEqual(11);expect(i.sourcePage).toBeLessThanOrEqual(21);expect(allQuestions.filter(q=>q.learningItemId===i.learningItemId)).toHaveLength(1);}
 for(const i of voc){const e=i.originalExample!;expect(e.blankSentence.replace('_____',e.answer)).toBe(e.sentenceEn);}
});
it('submits all 178 Unit 2 items and restores both templates and first answers without SRS changes',async()=>{
 const g1=templateGroup(),g2=templateGroup(2);await saveGroup(g1);await saveGroup(g2);
 expect(validGroup({...g2,itemIds:[g1.itemIds[0],g2.itemIds[0]]})).toBe(true);
 const s=await startGroupSession(g2.id);
 for(const id of s.questionIds){const q=practiceQuestions.find(q=>q.questionId===id)!;await updateQuestion(s.id,id,{choice:q.answer});await submitAnswer(s.id,id);await nextQuestion(s.id);}
 const b=await exportProgress();expect(validateBackup(b)).toBeNull();await importProgress(b);
 expect(await progressDb.customGroups.count()).toBe(2);
 const rows=await progressDb.directAttempts.toArray();expect(rows).toHaveLength(178);expect(rows.every(a=>a.correct&&a.firstAttempt&&!a.schedulingApplied)).toBe(true);expect(await progressDb.cardStates.count()).toBe(0);
});
