import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { contentDb } from '../../db/contentDb';
import { recordQuizAnswer, gradeFlashcard, markWordKnown } from '../../checkin/recordActivity';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';
import { practiceQuestions } from '../direct/model';
import { startScopeSession, startSession, submitAnswer, updateQuestion } from '../direct/store';
import { practiceIds } from '../vocabulary/model';
import { TOWN_ITEMS } from '../town/townModel';
import { presentRewardRound, claimDailyCheckIn } from './store';
import { CHALLENGES, directRoundId, quizChallenge, quizRoundId, taiwanDate } from './model';
import { directChallenge, directRewardWord, directRoundChallenge } from './directScope';
import type { ReviewMode } from '../../db/types';

beforeEach(async()=>{await progressDb.delete();await progressDb.open();await contentDb.delete();await contentDb.open();});
afterEach(async()=>{vi.restoreAllMocks();await progressDb.delete();await contentDb.delete();});
const balance = async()=> (await progressDb.rewardWallet.get('local'))?.balance ?? 0;
const now = (time:number)=>vi.spyOn(Date,'now').mockReturnValue(time);
async function quiz(index:number, correct=true, word=`word-${index}`, sid='round',mode:ReviewMode='quiz-w2m') {
  await recordQuizAnswer(word,correct,mode,sid,index===0,{index});
}

it('answer evidence, reward and balance are one transaction; retries and concurrent calls issue once',async()=>{
  await presentRewardRound(quizRoundId('round'),20,Date.now());
  vi.spyOn(progressDb.rewardWallet,'put').mockRejectedValueOnce(Error('disk full'));
  await expect(quiz(0)).rejects.toThrow('disk full');
  expect(await progressDb.reviewLogs.count()).toBe(0);
  expect(await progressDb.quizStats.count()).toBe(0);
  expect(await progressDb.checkIns.count()).toBe(0);
  expect(await progressDb.cardStates.count()).toBe(0);
  expect(await progressDb.rewardLedger.count()).toBe(0);
  await Promise.all([quiz(0),quiz(0),quiz(0)]);
  expect(await balance()).toBe(5);
  expect(await progressDb.reviewLogs.count()).toBe(1);
  expect(await progressDb.quizStats.get('word-0')).toMatchObject({timesAsked:1,timesCorrect:1});
  await quiz(0,false);
  expect(await balance()).toBe(5);
  expect(await progressDb.quizStats.get('word-0')).toMatchObject({timesAsked:1,timesCorrect:1});
  await quiz(1,false);
  expect(await balance()).toBe(6);
});

it('Direct answer failure rolls everything back, correct/wrong retry once, and old saved answers never pay',async()=>{
  const session=await startScopeSession(practiceIds(TOWN_ITEMS.slice(0,2)),'reward test');
  const q=practiceQuestions.find(q=>q.questionId===session.questionIds[0])!;
  await presentRewardRound(directRoundId(session.id),2,Date.now());
  await updateQuestion(session.id,q.questionId,{choice:q.answer});
  vi.spyOn(progressDb.rewardLedger,'add').mockRejectedValueOnce(Error('disk full'));
  await expect(submitAnswer(session.id,q.questionId,true)).rejects.toThrow();
  expect(await progressDb.directAttempts.count()).toBe(0);
  expect(await balance()).toBe(0);
  await Promise.all([submitAnswer(session.id,q.questionId,true),submitAnswer(session.id,q.questionId,true)]);
  expect(await progressDb.directAttempts.count()).toBe(1); expect(await balance()).toBe(5);
  const old=await startScopeSession(practiceIds([TOWN_ITEMS[2]]),'old saved');
  const oldq=practiceQuestions.find(q=>q.questionId===old.questionIds[0])!;
  await updateQuestion(old.id,oldq.questionId,{choice:oldq.answer});await submitAnswer(old.id,oldq.questionId);
  await submitAnswer(old.id,oldq.questionId,true);
  expect(await balance()).toBe(5);
});

it('Direct reward scope includes textbook word variants and excludes grammar labels/new contexts',async()=>{
  const grammar=practiceQuestions.find(q=>q.sourceType==='new_grammar_authored')!;
  const context=practiceQuestions.find(q=>q.sourceType==='new_context_authored')!;
  expect(directRewardWord(grammar.questionId)).toBeUndefined();expect(directRewardWord(context.questionId)).toBeUndefined();
  const session=await startSession([grammar.questionId],'grammar');await updateQuestion(session.id,grammar.questionId,{choice:grammar.answer});
  await submitAnswer(session.id,grammar.questionId,true);
  expect(await progressDb.directAttempts.count()).toBe(1);expect(await balance()).toBe(0);expect(await progressDb.rewardRounds.count()).toBe(0);
  for(const mode of ['basic','advanced'] as const) {
    const word=await startScopeSession(practiceIds([TOWN_ITEMS[0]]),'word',undefined,mode);
    expect(directRewardWord(word.questionIds[0])).toBe('elementary');
  }
});

it('10 different correct meaning targets within 30 seconds pay one +30; wrong/repeated words do not count',async()=>{
  now(1000);
  await presentRewardRound(quizRoundId('round'),40,1000,'meaning-v2');
  await quiz(0,false,'incorrect');
  for(let i=1;i<=15;i++)await quiz(i,true,'Same Word');
  expect(await balance()).toBe(76);
  expect(await progressDb.rewardLedger.where('kind').equals('round-bonus').count()).toBe(0);
  for(let i=16;i<25;i++)await quiz(i,true,`distinct-${i}`);
  expect(await balance()).toBe(151); // 24 correct answers, one wrong, one meaning bonus.
  await quiz(25,true,'extra');await quiz(25,true,'extra');
  expect(await balance()).toBe(156);
  expect(await progressDb.rewardLedger.where('kind').equals('round-bonus').count()).toBe(1);
});

it.each([CHALLENGES['meaning-v2'].windowMs,CHALLENGES['meaning-v2'].windowMs+1])('meaning boundary %s is measured from presentation and persists on reopen',async elapsed=>{
  const clock=now(1000);await presentRewardRound(quizRoundId('round'),20,1000,'meaning-v2');
  for(let i=0;i<9;i++)await quiz(i);
  progressDb.close();await progressDb.open();
  await presentRewardRound(quizRoundId('round'),20,99_000,'fill-v2');
  expect((await progressDb.rewardRounds.get(quizRoundId('round')))?.startedAt).toBe(1000);
  expect((await progressDb.rewardRounds.get(quizRoundId('round')))?.challenge).toBe('meaning-v2');
  clock.mockReturnValue(1000+elapsed);await quiz(9);
  expect(await balance()).toBe(elapsed===CHALLENGES['meaning-v2'].windowMs?80:50);
});

it('failed 10th meaning answer/bonus retries atomically and cannot consume the bonus',async()=>{
  now(1000);await presentRewardRound(quizRoundId('round'),20,1000,'meaning-v2');
  for(let i=0;i<9;i++)await quiz(i);
  const add=progressDb.rewardLedger.add.bind(progressDb.rewardLedger);
  const spy=vi.spyOn(progressDb.rewardLedger,'add').mockImplementation(event=>event.kind==='round-bonus' ? Dexie.Promise.reject(Error('bonus failed')) : add(event));
  await expect(quiz(9)).rejects.toThrow('bonus failed');
  expect(await balance()).toBe(45);expect(await progressDb.reviewLogs.count()).toBe(9);
  spy.mockRestore();await quiz(9);expect(await balance()).toBe(80);
});

it('different rounds never pool words toward the bonus',async()=>{
  now(1000);
  for(const sid of ['round-a','round-b']) {
    await presentRewardRound(quizRoundId(sid),20,1000,'meaning-v2');
    for(let index=0;index<8;index++)await quiz(index,true,`${sid}-${index}`,sid);
  }
  expect(await balance()).toBe(80);
  expect(await progressDb.rewardLedger.where('kind').equals('round-bonus').count()).toBe(0);
  for(let index=8;index<10;index++)await quiz(index,true,`round-a-${index}`,'round-a');
  expect(await balance()).toBe(120);
  expect((await progressDb.rewardLedger.where('kind').equals('round-bonus').toArray())[0].roundId).toBe(quizRoundId('round-a'));
});

it('daily claims use Taiwan midnight, are explicit and once per date, with failure retry',async()=>{
  const before=Date.UTC(2026,9,12,15,59,59,999), after=before+1;
  expect(taiwanDate(before)).toBe('2026-10-12');expect(taiwanDate(after)).toBe('2026-10-13');
  vi.spyOn(progressDb.rewardWallet,'put').mockRejectedValueOnce(Error('no room'));
  await expect(claimDailyCheckIn(before)).rejects.toThrow();
  expect(await progressDb.rewardLedger.count()).toBe(0);
  await Promise.all([claimDailyCheckIn(before),claimDailyCheckIn(before),claimDailyCheckIn(before)]);
  expect(await balance()).toBe(30);expect(await progressDb.checkIns.count()).toBe(0);
  await claimDailyCheckIn(after);await claimDailyCheckIn(after);
  expect(await balance()).toBe(60);expect(await progressDb.rewardLedger.count()).toBe(2);
});

it('only the opted-in four quiz modes and Direct screen pay; other learning records are untouched',async()=>{
  await recordQuizAnswer('plain',true,'quiz-w2m','no-opt-in',true);
  await gradeFlashcard('card',2,'card-round',true);await markWordKnown('known','known-round');
  await recordQuizAnswer('slash',true,'slash','slash-round',true);
  expect(await balance()).toBe(0);expect(await progressDb.rewardRounds.count()).toBe(0);
  await expect(recordQuizAnswer('slash',true,'slash','x',true,{index:0})).rejects.toThrow('Invalid rewarded');
  for(const [index,mode] of (['quiz-w2m','quiz-m2w','quiz-image','fill-blank'] as const).entries()) {
    const id=`${mode}-round`;await presentRewardRound(quizRoundId(id),10,Date.now());
    await recordQuizAnswer('word',true,mode,id,true,{index});
  }
  expect(await balance()).toBe(20);
});

it('v3 upgrade adds empty reward tables and preserves every original progress row',async()=>{
  await gradeFlashcard('kept',2,'kept-round',true);await progressDb.settings.put({key:'fontScale',value:1.15});
  await recordQuizAnswer('quiz-kept',false,'quiz-m2w','old-quiz',true);
  const direct=await startScopeSession(practiceIds([TOWN_ITEMS[0]]),'personal title');
  const question=practiceQuestions.find(q=>q.questionId===direct.questionIds[0])!;
  await updateQuestion(direct.id,question.questionId,{choice:question.answer,lookup:question.targetWord});await submitAnswer(direct.id,question.questionId);
  await progressDb.customGroups.put({id:'personal-group',name:'My preserved group',itemIds:[TOWN_ITEMS[0].learningItemId],templateId:null,templateRevision:null,updatedAt:Date.now()});
  const original=await exportProgress();progressDb.close();await Dexie.delete('VocabProgressDB');
  const old=new Dexie('VocabProgressDB');old.version(3).stores({cardStates:'word, dueDate, state',reviewLogs:'++id, word, reviewedAt, sessionId',checkIns:'date',quizStats:'word',settings:'key',customGroups:'id, updatedAt',directSessions:'id, updatedAt',directAttempts:'id, questionId, sessionId, answeredAt',writtenSessions:'id, updatedAt',writtenSubmissions:'id, sessionId, questionId, submittedAt'});
  await old.open();
  const names=['cardStates','reviewLogs','checkIns','quizStats','settings','customGroups','directSessions','directAttempts','writtenSessions','writtenSubmissions'] as const;
  for(const name of names)await old.table(name).bulkPut(original.data[name] ?? []);
  old.close();await progressDb.open();
  const upgraded=await exportProgress();for(const name of names)expect(upgraded.data[name]).toEqual(original.data[name]);
  expect(upgraded.data.rewardLedger).toEqual([]);expect(upgraded.data.rewardWallet).toEqual([]);expect(upgraded.data.rewardRounds).toEqual([]);
});

it('wallet and ledger round-trip through backup; old backups preserve them and broken balances are rejected',async()=>{
  await presentRewardRound(quizRoundId('round'),20,Date.now());await quiz(0);await claimDailyCheckIn();
  const backup=await exportProgress();expect(validateBackup(backup)).toBeNull();
  const broken=structuredClone(backup);broken.data.rewardWallet![0].balance++;
  expect(validateBackup(broken)).toContain('金幣');await expect(importProgress(broken)).rejects.toThrow();
  const duplicateIndex=structuredClone(backup);duplicateIndex.data.rewardLedger!.find(event=>event.kind==='answer')!.id='answer:quiz:round:00';
  expect(validateBackup(duplicateIndex)).toContain('金幣');
  await progressDb.delete();await progressDb.open();await importProgress(backup);
  expect((await exportProgress()).data).toEqual(backup.data);expect(await balance()).toBe(35);
  await quiz(0);await claimDailyCheckIn();expect(await balance()).toBe(35);
  const legacy=structuredClone(backup);legacy.schemaVersion=5;delete legacy.data.rewardWallet;delete legacy.data.rewardRounds;delete legacy.data.rewardLedger;
  await importProgress(legacy);expect(await balance()).toBe(35);await claimDailyCheckIn();expect(await balance()).toBe(35);
});

it('old quiz evidence is not back-paid; old backups may restore learning while paid event IDs still block rewards',async()=>{
  await recordQuizAnswer('old',true,'quiz-w2m','legacy-round',true);
  const legacy=await recordQuizAnswer('old',false,'quiz-w2m','legacy-round',true,{index:0});
  expect(legacy.rewardVerdict).toMatchObject({correct:true,duplicate:true,score:1});expect(await balance()).toBe(0);
  await presentRewardRound(quizRoundId('round'),20,Date.now());
  const before=await exportProgress();before.schemaVersion=5;delete before.data.rewardWallet;delete before.data.rewardRounds;delete before.data.rewardLedger;
  await quiz(0);await claimDailyCheckIn();expect(await balance()).toBe(35);
  await importProgress(before);
  await quiz(0,false);await quiz(0,true);
  expect(await balance()).toBe(35);
  const logs=await progressDb.reviewLogs.where('sessionId').equals('round').toArray();
  expect(logs).toHaveLength(1);expect(logs[0].grade).toBe(0);
  expect(await progressDb.rewardLedger.count()).toBe(2);
});

it.each([180_000,180_001])('fill uses 15 different targets, three minutes, and one extra +60 (elapsed %s)',async elapsed=>{
  const clock=now(1000);await presentRewardRound(quizRoundId('fill'),20,1000,'fill-v2');
  for(let index=0;index<14;index++)await quiz(index,true,`fill-${index}`,'fill','fill-blank');
  expect(await balance()).toBe(70);expect(await progressDb.rewardLedger.where('kind').equals('round-bonus').count()).toBe(0);
  clock.mockReturnValue(1000+elapsed);await quiz(14,true,'fill-14','fill','fill-blank');
  expect(await balance()).toBe(elapsed===180_000?135:75);
  await quiz(15,true,'extra','fill','fill-blank');await quiz(15,true,'extra','fill','fill-blank');
  expect(await balance()).toBe(elapsed===180_000?140:80);
  expect((await exportProgress()).data.rewardLedger?.filter(event=>event.kind==='round-bonus').map(event=>event.amount)).toEqual(elapsed===180_000?[60]:[]);
  expect(validateBackup(await exportProgress())).toBeNull();
});

it('a failed +60 bonus cannot save the 15th fill answer, progress or base award',async()=>{
  now(1000);await presentRewardRound(quizRoundId('fill'),20,1000,'fill-v2');
  for(let index=0;index<14;index++)await quiz(index,true,`fill-${index}`,'fill','fill-blank');
  const before=(await exportProgress()).data,add=progressDb.rewardLedger.add.bind(progressDb.rewardLedger);
  const failure=vi.spyOn(progressDb.rewardLedger,'add').mockImplementation(event=>event.kind==='round-bonus'?Dexie.Promise.reject(Error('bonus full')):add(event));
  await expect(quiz(14,true,'fill-14','fill','fill-blank')).rejects.toThrow('bonus full');expect((await exportProgress()).data).toEqual(before);
  failure.mockRestore();await quiz(14,true,'fill-14','fill','fill-blank');expect(await balance()).toBe(135);
});

it('sentence choices, image/m2w and mixed modes never impersonate recognition or pool fill answers',async()=>{
  now(1000);await presentRewardRound(quizRoundId('mixed'),40,1000,'meaning-v2');
  for(let index=0;index<20;index++)await quiz(index,true,`fill-${index}`,'mixed','fill-blank');
  expect(await balance()).toBe(100);expect(await progressDb.rewardLedger.where('kind').equals('round-bonus').count()).toBe(0);
  for(const mode of ['quiz-image','quiz-m2w'] as const) {
    const sid=`basic-${mode}`;await presentRewardRound(quizRoundId(sid),20,1000,quizChallenge(mode));
    for(let index=0;index<15;index++)await quiz(index,true,`${mode}-${index}`,sid,mode);
  }
  expect(await progressDb.rewardLedger.where('kind').equals('round-bonus').count()).toBe(0);
  const basic=await startScopeSession(practiceIds(TOWN_ITEMS.slice(0,16)),'sentence',undefined,'basic');
  expect(directRoundChallenge(basic.questionIds)).toBe('basic-only-v2');
  const fill=await startScopeSession(practiceIds(TOWN_ITEMS.slice(0,16)),'fill',undefined,'advanced');
  expect(directRoundChallenge(fill.questionIds)).toBe('fill-v2');
  expect(fill.questionIds.every(id=>directChallenge(id)==='fill-v2')).toBe(true);
  await presentRewardRound(directRoundId(fill.id),fill.questionIds.length,1000,'fill-v2');
  for(const id of fill.questionIds) {const question=practiceQuestions.find(question=>question.questionId===id)!;await updateQuestion(fill.id,id,{choice:question.answer});await submitAnswer(fill.id,id,true);const {nextQuestion}=await import('../direct/store');await nextQuestion(fill.id);}
  expect((await progressDb.rewardLedger.where('roundId').equals(directRoundId(fill.id)).toArray()).filter(event=>event.kind==='round-bonus').map(event=>event.amount)).toEqual([60]);
});

it('v6 historical three-minute +30 records survive import without enabling that policy for new answers',async()=>{
  now(1000);await presentRewardRound(quizRoundId('legacy'),20,1000,'fill-v2');
  for(let index=0;index<15;index++)await quiz(index,true,`legacy-${index}`,'legacy','fill-blank');
  const legacy=await exportProgress();legacy.schemaVersion=6;
  legacy.data.rewardRounds!.forEach(round=>{delete round.challenge;delete round.distinctWordCount;});
  legacy.data.rewardLedger!.forEach(event=>{delete event.challenge;if(event.kind==='round-bonus')event.amount=30;});
  legacy.data.rewardWallet![0].balance=105;
  expect(validateBackup(legacy)).toBeNull();await importProgress(legacy);expect(await balance()).toBe(105);
  await presentRewardRound(quizRoundId('legacy'),20,99_000,'meaning-v2');
  expect((await progressDb.rewardRounds.get(quizRoundId('legacy')))?.challenge).toBeUndefined();
  await quiz(15,true,'more','legacy');expect(await balance()).toBe(110);expect(validateBackup(await exportProgress())).toBeNull();
  const broken=structuredClone(legacy);broken.data.rewardLedger!.find(event=>event.kind==='round-bonus')!.amount=60;broken.data.rewardWallet![0].balance=135;expect(validateBackup(broken)).toContain('金幣');
});
