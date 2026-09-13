import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';
import { gsatQuestions, gsatPassages, idsForYear, startGsat, editGsat, submitGsat, advanceGsat, activeQuestions } from './gsatStore';
import { writtenQuestions, writtenGroups, multipleScore, validRaw, validSelfScore } from './writtenModel';
import { startWritten, editWritten, submitWritten, assessWritten } from './writtenStore';
import { examArchive, originalImages } from './archive';

beforeEach(async()=>{await progressDb.delete();await progressDb.open();});
afterEach(async()=>{await progressDb.delete();});

it('covers all 559 source records, preserves blanks, group membership and original page references',()=>{
  expect(gsatQuestions).toHaveLength(510);expect(writtenQuestions).toHaveLength(49);
  const all=[...gsatQuestions,...writtenQuestions];expect(new Set(all.map(q=>q.question_id)).size).toBe(559);
  for(let y=106;y<=115;y++){
    expect(idsForYear(String(y))).toHaveLength(y<=110?56:46);
    expect(all.filter(q=>q.question_id.startsWith(`gsat-${y}-`))).toHaveLength(y<=110?59:y===111?52:53);
    expect(all.filter(q=>q.question_id.startsWith(`gsat-${y}-`)).reduce((n,q)=>n+q.points,0)).toBe(100);
  }
  for(const q of gsatQuestions){
    expect(q.explanationZh.length).toBeGreaterThan(10);
    expect(Object.keys(q.options)).toContain(q.answer.value);
    if(!q.passage_id)expect(q.stem).toMatch(/_{2,}/);
  }
  for(const p of gsatPassages){
    expect(gsatQuestions.filter(q=>q.passage_id===p.passage_id).map(q=>q.question_id)).toEqual(p.question_ids);
    if(p.passage_id.startsWith('gsat-115-'))continue;
    expect(originalImages(p.passage_id.split('-')[1],p.sourcePages).length).toBe(p.sourcePages!.length);
  }
  const p=examArchive.passages.find(p=>p.passage_id==='gsat-110-p01')!;
  expect(p.text).toContain('decrease of 20 percent');
  expect(p.text.match(/\{\{20\}\}/g)).toHaveLength(1);
  expect(gsatQuestions.find(q=>q.question_id==='gsat-112-q46')?.options.D).toBe('archipelago, settlements, paths, islands');
});

it('completes and restores every single-choice year without cross-year first attempts or SRS writes',async()=>{
  for(let y=106;y<=115;y++){
    const s=await startGsat(idsForYear(String(y)));
    while(true){
      const current=(await progressDb.directSessions.get(s.id))!;
      const qs=activeQuestions(current);if(!qs.length)break;
      for(const q of qs)await editGsat(s.id,{questionId:q.question_id,choice:q.answer.value});
      await submitGsat(s.id);await advanceGsat(s.id);
    }
  }
  const rows=await progressDb.directAttempts.toArray();expect(rows).toHaveLength(510);
  expect(rows.every(a=>a.firstAttempt&&a.correct&&!a.schedulingApplied)).toBe(true);
  const b=await exportProgress();expect(validateBackup(b)).toBeNull();await importProgress(b);
  expect(await progressDb.directAttempts.count()).toBe(510);expect(await progressDb.cardStates.count()).toBe(0);
},30000);

it('scores six, eight and ten option multiple-choice questions with the official partial credit and validates raw selections',()=>{
  expect(multipleScore('CD','gsat-111-q49')).toBe(4);
  expect(multipleScore('C','gsat-111-q49')).toBeCloseTo(8/3);
  expect(multipleScore('DF','gsat-112-q49')).toBe(4);
  expect(multipleScore('D','gsat-112-q49')).toBe(3);
  expect(multipleScore('CF','gsat-113-q49')).toBe(4);
  expect(multipleScore('CDGI','gsat-114-q49')).toBe(4);
  expect(multipleScore('CDG','gsat-114-q49')).toBe(3.2);
  expect(multipleScore('','gsat-114-q49')).toBe(0);
  expect(multipleScore('ABEFHJ','gsat-114-q49')).toBe(0);
  expect(validRaw('gsat-112-q49','I')).toBe(false);
  expect(validRaw('gsat-114-q49','CC')).toBe(false);
  expect(validRaw('gsat-114-q49','DC')).toBe(false);
  expect(validSelfScore('gsat-111-q47',4)).toBe(true);
  expect(validSelfScore('gsat-112-q47',4)).toBe(false);
});

it('retains all 49 written first answers and self assessments in a third-version backup',async()=>{
  for(const g of writtenGroups){
    const s=await startWritten(g.id);
    for(const id of g.ids){const q=writtenQuestions.find(q=>q.question_id===id)!;await editWritten(s.id,{questionId:id,answer:q.question_type==='multiple_choice'?(q.answerKey??'ADE'):'A: first original answer; B: second original answer'});}
    await submitWritten(s.id);
    for(const id of g.ids)if(validSelfScore(id,1))await assessWritten(`${s.id}:${id}`,1);
  }
  const b=await exportProgress();expect(validateBackup(b)).toBeNull();await importProgress(b);
  const rows=await progressDb.writtenSubmissions.toArray();expect(rows).toHaveLength(49);
  expect(rows.filter(a=>a.autoScore===4)).toHaveLength(5);
  expect(rows.filter(a=>a.assessments[0]?.score===1)).toHaveLength(44);
  expect(rows.every(a=>a.firstAttempt)).toBe(true);
  expect(await progressDb.cardStates.count()).toBe(0);
});
