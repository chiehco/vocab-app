import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import words from '../../../public/data/v1/words.json';
import bootstrap from '../../../public/data/v1/sa-pack.json';
import unit from '../direct/curriculumLV4Unit19.json';
import type { WordRecord, ExamPriorityRecord } from '../../db/types';
import { progressDb } from '../../db/progressDb';
import { templateGroup, unitItems, practiceQuestions, questionForMode, isCorrectAnswer } from '../direct/model';
import { saveGroup, startGroupSession, switchPracticeMode, updateQuestion, submitAnswer, nextQuestion } from '../direct/store';
import { reviewedExample, practiceIds } from './model';
import { approvedCurriculumCards, approvedCurriculumIllustration, approvedCurriculumUsage, approvedCurriculumUsageZh } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { getWordDisplaySense } from '../browser/wordDisplay';
import { sortWorkspaceWords, workspaceWords } from '../modes/wordLists';
beforeEach(async()=>{await progressDb.delete();await progressDb.open();});
afterEach(async()=>{await progressDb.delete();});
it('makes all 77 reviewed items available with reconstructable practice examples',()=>{
 const items=unitItems(19,'LV4');expect(items).toHaveLength(77);expect(practiceIds(items)).toHaveLength(77);
 expect(items.filter(i=>i.kind==='vocabulary')).toHaveLength(46);expect(unit.questions).toHaveLength(123);expect(unit.relatedNotes).toHaveLength(62);
 for(const i of items){expect(reviewedExample(i)).toBeDefined();const e=i.originalExample!;expect(e.blankSentence.replace('_____',e.answer)).toBe(e.sentenceEn);
  const q=practiceQuestions.find(q=>q.questionId===questionForMode(practiceIds([i])[0],'basic'))!;expect(q.options).toHaveLength(4);expect(q.options.filter(o=>o.id===q.answer)).toHaveLength(1);}
});
it('exposes approved art and meaning for every actual official word on a fresh installation',()=>{
 const cards=unit.learningItems.filter(i=>i.kind==='vocabulary');expect(new Set(cards.map(c=>c.illustration!.path)).size).toBe(39);
 expect(cards.filter(c=>c.officialWordId)).toHaveLength(39);
 for(const c of cards){expect(existsSync('public/'+c.illustration!.path)).toBe(true);if(!c.officialWordId)continue;
  const w=words.find(w=>w.wordId===c.officialWordId)!;expect(w).toBeDefined();expect(bootstrap.words.find(x=>x.wordId===w.wordId)).toEqual(w);
  const registered=approvedCurriculumCards(w.word,w.wordId);expect(registered.some(x=>x.learningItemId===c.learningItemId)).toBe(true);
  const path=getWordBeastAsset(w.wordId,w.word)!;expect(registered.some(x=>path.includes(x.illustration.path))).toBe(true);
  expect(approvedCurriculumIllustration(c.displayWord!, '/'+c.illustration!.path+'?v=test')).toEqual(c.illustration);
  expect(getWordDisplaySense(w as WordRecord,[]).needsReview).toBe(false);
 }
 const group=workspaceWords(bootstrap.words as WordRecord[],templateGroup('LV4-U19'),'all','');expect(group).toHaveLength(39);
 expect(sortWorkspaceWords(group,bootstrap.examPriorities as ExamPriorityRecord[])).toHaveLength(39);
});
it('retains the final two revisions and accepts sled without accepting a different vehicle',()=>{
 for(const name of ['hardware','software']){const w=words.find(w=>w.word===name)!;expect(approvedCurriculumUsage(name,w.wordId)).toBe('a piece of '+name);expect(approvedCurriculumUsageZh(name,w.wordId)).toBe(name==='hardware'?'一件硬體設備':'一套軟體');expect(approvedCurriculumUsage(name,'W000001')).toBeUndefined();expect(approvedCurriculumUsageZh(name,'W000001')).toBeUndefined();}
 const h=unit.learningItems.find(i=>i.displayWord==='hardware')!;expect(h.illustration!.captionEn).toBe('The screen is a piece of computer hardware.');expect(h.originalExample.provenance).toBe('translated_from_user_chinese');
 expect(unit.learningItems.find(i=>i.displayWord==='autograph')!.illustration!.path).toContain('19-30-v2.webp');
 const q=practiceQuestions.find(q=>q.questionId==='CLOZE-ORIG-LV4U19-sledge')!;expect(isCorrectAnswer(q,' SLED ')).toBe(true);expect(isCorrectAnswer(q,'sleigh')).toBe(false);
 const blossom=practiceQuestions.find(q=>q.questionId==='CLOZE-ORIG-LV4U19-blossom')!;expect(isCorrectAnswer(blossom,'blossoms')).toBe(true);expect(isCorrectAnswer(blossom,'blossom')).toBe(false);
});
it('completes every basic item and switches to the correct advanced scope without affecting SRS',async()=>{
 const group=templateGroup('LV4-U19');await saveGroup(group);const session=await startGroupSession(group.id);expect(session.questionIds).toHaveLength(77);
 for(const id of session.questionIds){const q=practiceQuestions.find(q=>q.questionId===id)!;await updateQuestion(session.id,id,{choice:q.answer});await submitAnswer(session.id,id);await nextQuestion(session.id);}
 expect(await progressDb.directAttempts.count()).toBe(77);expect((await progressDb.directAttempts.toArray()).every(a=>a.correct&&a.firstAttempt&&!a.schedulingApplied)).toBe(true);
 const advanced=await switchPracticeMode(session.id,'advanced');expect(advanced.questionIds.filter(id=>id.startsWith('CLOZE-'))).toHaveLength(46);expect(advanced.questionIds.filter(id=>id.startsWith('USAGE-'))).toHaveLength(31);expect(await progressDb.cardStates.count()).toBe(0);
});
