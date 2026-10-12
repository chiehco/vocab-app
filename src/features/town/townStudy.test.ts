import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { contentDb } from '../../db/contentDb';
import { progressDb, setSetting } from '../../db/progressDb';
import type { ReviewLogEntry, WordRecord } from '../../db/types';
import words from '../../../public/data/v1/words.json';
import { todayStr, addDaysStr } from '../../lib/dates';
import { newCardState } from '../../srs/sm2';
import { buildStudyQueue } from '../../srs/queue';
import { gradeFlashcard } from '../../checkin/recordActivity';
import { exportProgress, importProgress } from '../../backup/backup';
import { getTownProgress, TOWN_ITEMS } from './townModel';
import { getLV1TownItems, getLV1TownProgress } from './lv1TownModel';
import { activeTownStudy, nextTownStudy, pickTownStudy, prepareTownStudyOptions, readTownStudyRound, replanTownStudy, resolveTownStudy, saveTownStudy, startTownStudy, townScope, townStudyQueue } from './townStudy';

beforeEach(async()=>{
  await progressDb.delete();await progressDb.open();await contentDb.delete();await contentDb.open();
  await contentDb.words.bulkPut(words as WordRecord[]);
});
afterEach(async()=>{vi.restoreAllMocks();await progressDb.delete();await contentDb.delete();});

it('uses the regular scoped queue, global remaining cap, all due words, and chapter identity',async()=>{
  const lv4=await townScope('LV4/17'),lv1=await townScope('LV1/1');
  expect(lv4.words).toHaveLength(43);expect(lv4.missing.toSorted()).toEqual(['frustrated','frustrating','reluctance']);
  expect(lv1.words).toHaveLength(38);expect(lv1.words.find(word=>word.word==='woman')?.level).toBe('LV2');
  await setSetting('dailyNewWordCap',7);
  await progressDb.checkIns.put({date:todayStr(),newWordsCount:3,reviewCount:3,sessionsCount:1});
  await progressDb.cardStates.bulkPut(lv4.words.slice(0,23).map(word=>({...newCardState(word.word,todayStr()),state:'review' as const,dueDate:addDaysStr(todayStr(),-1),createdAt:'2026-01-01T00:00:00Z',lastReviewedAt:'2026-01-01T00:00:00Z'})));
  const queue=await townStudyQueue('LV4/17');
  expect(queue).toEqual(await buildStudyQueue(undefined,lv4.words.map(word=>word.word)));
  expect(queue.filter(item=>!item.isNew)).toHaveLength(23);expect(queue.filter(item=>item.isNew)).toHaveLength(4);
  expect(queue).toHaveLength(27);expect(queue[0].isNew).toBe(false);expect(queue.slice(0,-1).some(item=>item.isNew)).toBe(true);
  await setSetting('dailyNewWordCap',50);
  expect((await townStudyQueue('LV1/1')).some(item=>item.wordRecord.word==='woman')).toBe(true);
});

it.each(['LV1/1','LV4/17'] as const)('%s: opening, picking, restarting and returning preserve the round without creating evidence',async town=>{
  await setSetting('dailyNewWordCap',3);
  const [a,b]=await Promise.all([startTownStudy(town),startTownStudy(town)]);expect(a.id).toBe(b.id);expect(a.items).toHaveLength(3);
  await prepareTownStudyOptions(a.id,0);
  await pickTownStudy(a.id,0,'wrong choice');
  await progressDb.close();await progressDb.open();
  const resumed=await startTownStudy(town);expect(resumed.id).toBe(a.id);
  expect(resumed.choices[0]).toBe('wrong choice');expect(resumed.flipped[0]).toBe(true);
  expect(resumed.options[0]).toHaveLength(4);await prepareTownStudyOptions(a.id,0);
  expect((await readTownStudyRound(a.id))?.options).toEqual(resumed.options);
  expect(await progressDb.reviewLogs.count()).toBe(0);expect(await progressDb.cardStates.count()).toBe(0);expect(await progressDb.directAttempts.count()).toBe(0);
});

it.each([0,2] as const)('grade %s saves actual evidence once, restores its result, and advances only once',async grade=>{
  const round=await startTownStudy('LV4/17');await pickTownStudy(round.id,0,round.items[0].word);
  await Promise.all([saveTownStudy(round.id,0,grade),saveTownStudy(round.id,0,grade===0?2:0)]);
  const saved=await resolveTownStudy(round.id),card=await progressDb.cardStates.get(round.items[0].word),checkin=await progressDb.checkIns.get(todayStr());
  expect(saved.saved?.grade).toBe(grade);expect(saved.round.index).toBe(0);expect(checkin).toMatchObject({reviewCount:1,newWordsCount:1,sessionsCount:1});
  expect(await progressDb.reviewLogs.count()).toBe(1);expect(await progressDb.directAttempts.count()).toBe(0);
  await saveTownStudy(round.id,0,2);expect(await progressDb.cardStates.get(round.items[0].word)).toEqual(card);expect(await progressDb.checkIns.get(todayStr())).toEqual(checkin);
  const scope=await townScope('LV4/17');expect(getTownProgress([],await progressDb.reviewLogs.toArray(),scope.bindings).filter(row=>row.attempted)).toHaveLength(1);
  await Promise.all([nextTownStudy(round.id,0),nextTownStudy(round.id,0)]);expect((await activeTownStudy('LV4/17'))?.index).toBe(1);
  await saveTownStudy(round.id,0,0);expect(await progressDb.reviewLogs.count()).toBe(1);
});

it('cannot save before a selection/reveal, skip an unsaved card or claim an incorrect word is known',async()=>{
  const round=await startTownStudy('LV1/1');
  await expect(saveTownStudy(round.id,0,2)).rejects.toThrow('先完成本題');
  await expect(nextTownStudy(round.id,0)).rejects.toThrow('尚未保存');
  await pickTownStudy(round.id,0,'not-the-word');
  await expect(saveTownStudy(round.id,0,3,true)).rejects.toThrow('完成本題選擇');
  expect(await progressDb.reviewLogs.count()).toBe(0);
});

it('atomically rolls back scheduling, check-in and log if the round receipt cannot be saved',async()=>{
  const round=await startTownStudy('LV1/1');await pickTownStudy(round.id,0,round.items[0].word);
  const put=progressDb.settings.put.bind(progressDb.settings);
  const failure=vi.spyOn(progressDb.settings,'put').mockImplementation((row,...args)=>{
    if(row.key===`town-study:${round.id}` && (row.value as typeof round).answers[0])return Dexie.Promise.reject(Error('receipt write failed'));
    return put(row,...args);
  });
  await expect(saveTownStudy(round.id,0,2)).rejects.toThrow('receipt write failed');
  expect(await progressDb.reviewLogs.count()).toBe(0);expect(await progressDb.cardStates.count()).toBe(0);expect(await progressDb.checkIns.count()).toBe(0);
  expect((await readTownStudyRound(round.id))?.answers).toEqual({});failure.mockRestore();
  await saveTownStudy(round.id,0,2);expect(await progressDb.reviewLogs.count()).toBe(1);
});

it('rechecks a globally consumed new-word cap and replans without claiming an answer',async()=>{
  await setSetting('dailyNewWordCap',1);const round=await startTownStudy('LV1/1');await pickTownStudy(round.id,0,round.items[0].word);
  await progressDb.checkIns.put({date:todayStr(),newWordsCount:1,reviewCount:1,sessionsCount:1});
  await expect(saveTownStudy(round.id,0,2)).rejects.toThrow('額度已用完');
  expect(await progressDb.reviewLogs.count()).toBe(0);
  const replanned=await replanTownStudy('LV1/1',round.id);expect(replanned.items).toEqual([]);expect(replanned.id).not.toBe(round.id);
  expect((await readTownStudyRound(round.id))?.choices[0]).toBe(round.items[0].word);
});

it('keeps the regular known policy and same-day recap policy without extending recap intervals',async()=>{
  const round=await startTownStudy('LV1/1');await pickTownStudy(round.id,0,round.items[0].word);await saveTownStudy(round.id,0,3,true);
  expect((await progressDb.checkIns.get(todayStr()))?.newWordsCount).toBe(0);
  expect((await progressDb.cardStates.get(round.items[0].word))?.intervalDays).toBe(21);
  // A fresh town uses the very same recap resolution as ordinary review.
  const word=(await townScope('LV4/17')).words[0];await gradeFlashcard(word.word,2,'outside-town',true);
  const recap=await startTownStudy('LV4/17');expect(recap.items).toHaveLength(1);expect(recap.items[0].isRecap).toBe(true);
  const card=await progressDb.cardStates.get(word.word);await pickTownStudy(recap.id,0);await saveTownStudy(recap.id,0,0);
  expect(await progressDb.cardStates.get(word.word)).toEqual({...card,practicePending:true});
  expect((await resolveTownStudy(recap.id)).saved?.mode).toBe('same-day-recap');
});

it('projects ordinary logs read-only, deduplicates them, and preserves original Direct and quiz evidence',async()=>{
  const scope=await townScope('LV4/17'),lv1=await townScope('LV1/1');
  const log=(word:string,id:number,mode:ReviewLogEntry['mode'],grade:ReviewLogEntry['grade']=2):ReviewLogEntry=>({id,word,sessionId:`s${id}`,mode,grade,reviewedAt:new Date(id*1000).toISOString(),intervalBefore:0,intervalAfter:1,easeFactorBefore:2.5,easeFactorAfter:2.5});
  const logs=[log(scope.words[0].word,1,'flashcard'),log(scope.words[1].word,2,'known'),log(scope.words[2].word,3,'same-day-recap',0),log(scope.words[3].word,4,'slash')];
  const before=structuredClone(logs),progress=getTownProgress([], [...logs,logs[0]],scope.bindings);
  expect(progress.filter(row=>row.attempted)).toHaveLength(3);expect(progress[0]).toMatchObject({firstCorrect:false,attempts:1,latestLearningLabel:'最近一次已完成一般學習／複習'});
  expect(logs).toEqual(before);expect(await progressDb.reviewLogs.count()).toBe(0);expect(await progressDb.directAttempts.count()).toBe(0);
  const quiz=log(lv1.words[0].word,1,'quiz-w2m',0),known=log(lv1.words[0].word,2,'known');
  expect(getLV1TownProgress(getLV1TownItems(words as WordRecord[]),[quiz,known,known],lv1.bindings)[0]).toMatchObject({attempted:true,firstCorrect:false,latestCorrect:true,attempts:2});
  expect(TOWN_ITEMS.filter(item=>!item.officialWordId)).toHaveLength(3);
});

it('expired rounds preserve history but do not submit against a new day',async()=>{
  const round=await startTownStudy('LV1/1');await pickTownStudy(round.id,0);
  const old={...(await readTownStudyRound(round.id))!,day:'2020-01-01'};await progressDb.settings.put({key:`town-study:${round.id}`,value:old});
  await expect(saveTownStudy(round.id,0,2)).rejects.toThrow('前一日');expect(await progressDb.reviewLogs.count()).toBe(0);
  expect((await startTownStudy('LV1/1')).id).not.toBe(round.id);
});

it('the existing backup retains the round, frozen options, real log IDs and exact-once continuation',async()=>{
  const round=await startTownStudy('LV4/17');await prepareTownStudyOptions(round.id,0);await pickTownStudy(round.id,0,round.items[0].word);await saveTownStudy(round.id,0,2);
  const backup=await exportProgress(),before=await resolveTownStudy(round.id);
  await progressDb.delete();await progressDb.open();await importProgress(backup);
  expect(await resolveTownStudy(round.id)).toEqual(before);expect((await activeTownStudy('LV4/17'))?.id).toBe(round.id);
  await saveTownStudy(round.id,0,0);expect(await exportProgress()).toMatchObject({data:backup.data});
});
