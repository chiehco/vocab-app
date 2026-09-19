import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { progressDb } from '../../db/progressDb';
import { templateGroup, unitItems, findUnit, allQuestions, practiceQuestions, questionForMode, sessionMode, unitsForLevel, isCorrectAnswer } from '../direct/model';
import { saveGroup, startGroupSession, startSession, switchPracticeMode, updateQuestion, submitAnswer, nextQuestion } from '../direct/store';
import { reviewedExample, practiceIds } from './model';

beforeEach(async()=>{await progressDb.delete();await progressDb.open();});
afterEach(async()=>{await progressDb.delete();});

it('registers LV4 Unit 17 beside the LV3 units without changing them',()=>{
 expect(unitsForLevel('LV3').map(u=>u.unit)).toEqual([1,2]);expect(unitsForLevel('LV4').map(u=>u.unit)).toEqual([17,18,19,20]);
 expect(templateGroup().itemIds).toHaveLength(176);expect(templateGroup(2).itemIds).toHaveLength(178);
 const unit=findUnit('LV4-U17')!;expect(unit.revision).toBe('20260914-LV4U17-3');
 const items=unitItems(17,'LV4'),voc=items.filter(i=>i.kind==='vocabulary'),usage=items.filter(i=>i.kind!=='vocabulary');
 expect(items).toHaveLength(89);expect(voc).toHaveLength(46);expect(usage).toHaveLength(43);expect(templateGroup('LV4-U17').itemIds).toHaveLength(89);
 expect(voc.every(i=>!!reviewedExample(i))).toBe(true);
 expect(voc.every(i=>!!i.illustration&&existsSync(join(process.cwd(),'public',i.illustration.path)))).toBe(true);
 for(const i of items){expect(i.sourcePage).toBeGreaterThanOrEqual(185);expect(i.sourcePage).toBeLessThanOrEqual(194);expect(allQuestions.filter(q=>q.learningItemId===i.learningItemId)).toHaveLength(1);}
 for(const i of voc){const e=i.originalExample!;expect(e.blankSentence.replace('_____',e.answer)).toBe(e.sentenceEn);}
 expect(unit.relatedNotes).toHaveLength(74);
});
it('switches vocabulary between choice and cloze while usage items keep their options',()=>{
 const cloze='CLOZE-ORIG-LV4U17-elementary';
 expect(questionForMode(cloze,'basic')).toBe('CHOICE-CLOZE-ORIG-LV4U17-elementary');
 expect(practiceQuestions.find(q=>q.questionId==='CHOICE-CLOZE-ORIG-LV4U17-elementary')!.options).toHaveLength(4);
 expect(questionForMode('USAGE-LV4U17-001','advanced')).toBe('USAGE-LV4U17-001');
 expect(practiceQuestions.find(q=>q.questionId==='USAGE-LV4U17-001')!.options).toHaveLength(4);
 const ids=practiceIds(unitItems(17,'LV4'));expect(ids).toHaveLength(89);expect(ids.filter(id=>id.startsWith('CLOZE-'))).toHaveLength(46);
});
it('accepts catalogue as a spelling variant only for the cloze question',()=>{
 const cloze=practiceQuestions.find(q=>q.questionId==='CLOZE-ORIG-LV4U17-catalog')!;
 expect(isCorrectAnswer(cloze,'Catalogue ')).toBe(true);expect(isCorrectAnswer(cloze,'catalog')).toBe(true);expect(isCorrectAnswer(cloze,'catalogs')).toBe(false);
 const choice=practiceQuestions.find(q=>q.questionId==='CHOICE-CLOZE-ORIG-LV4U17-catalog')!;
 expect(isCorrectAnswer(choice,choice.answer)).toBe(true);expect(isCorrectAnswer(choice,'catalogue')).toBe(false);
});
it('answers the whole unit in basic mode, then continues the same unit in advanced mode with separate records',async()=>{
 const g=templateGroup('LV4-U17');await saveGroup(g);
 const s=await startGroupSession(g.id);expect(sessionMode(s)).toBe('basic');expect(s.questionIds).toHaveLength(89);
 for(const id of s.questionIds){const q=practiceQuestions.find(q=>q.questionId===id)!;expect(q.options.length).toBe(4);await updateQuestion(s.id,id,{choice:q.answer});await submitAnswer(s.id,id);await nextQuestion(s.id);}
 expect((await progressDb.directAttempts.toArray()).every(a=>a.correct&&a.firstAttempt&&!a.schedulingApplied)).toBe(true);
 const adv=await switchPracticeMode(s.id,'advanced');expect(sessionMode(adv)).toBe('advanced');
 expect(adv.questionIds.filter(id=>id.startsWith('CLOZE-'))).toHaveLength(46);expect(adv.questionIds.filter(id=>id.startsWith('USAGE-'))).toHaveLength(43);
 const first=adv.questionIds[0];await updateQuestion(adv.id,first,{choice:'catalogue'});
 expect(await progressDb.directAttempts.count()).toBe(89);expect(await progressDb.cardStates.count()).toBe(0);
 const plain=await startSession(practiceIds(unitItems(17,'LV4')).slice(0,3),'LV4 Unit 17 · 詞彙自由練習');expect(plain.questionIds.every(id=>id.startsWith('CHOICE-CLOZE-'))).toBe(true);
});
