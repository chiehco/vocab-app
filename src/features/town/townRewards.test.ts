import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import words from '../../../public/data/v1/words.json';
import type { WordRecord } from '../../db/types';
import { contentDb } from '../../db/contentDb';
import { progressDb, VocabProgressDB, setSetting } from '../../db/progressDb';
import { exportProgress, importProgress, validateBackup } from '../../backup/backup';
import { todayStr, addDaysStr } from '../../lib/dates';
import { newCardState } from '../../srs/sm2';
import { gradeFlashcard, markWordKnown } from '../../checkin/recordActivity';
import { getTownProgress, TOWN_ITEMS } from './townModel';
import { LV1_TOWN_SOURCE_CARDS } from './lv1TownModel';
import { nextTownStudy, pickTownStudy, prepareTownStudyOptions, readTownStudyRound, resolveTownStudy, saveTownStudy, startTownStudy, townScope } from './townStudy';
import { claimDailyCheckIn, presentRewardRound } from '../rewards/store';
import { townRoundId } from '../rewards/model';

beforeEach(async()=>{
  await progressDb.delete();await progressDb.open();await contentDb.delete();await contentDb.open();
  const ids=new Set([...TOWN_ITEMS.map(item=>item.officialWordId),...LV1_TOWN_SOURCE_CARDS.map(item=>item.officialWordId)]);
  await contentDb.words.bulkPut(words.filter(word=>ids.has(word.wordId)) as WordRecord[]);
});
afterEach(async()=>{vi.restoreAllMocks();await progressDb.delete();await contentDb.delete();});
const balance=async()=> (await progressDb.rewardWallet.get('local'))?.balance ?? 0;
async function prepare(id:string,index:number,correct=true) {
  await prepareTownStudyOptions(id,index);const data=await resolveTownStudy(id),item=data.queue[index];
  expect(data.options).toHaveLength(4);
  await presentRewardRound(townRoundId(id),data.round.items.length,Date.now(),'meaning-v2',data.round.items.length);
  const option=data.options!.find(word=>(word.wordId===item.wordRecord.wordId)===correct)!;
  await pickTownStudy(id,index,option.word);return option;
}

it.each([true,false])('objective town answers (correct=%s) commit house, original SRS, receipt and coins once',async correct=>{
  await setSetting('dailyNewWordCap',3);const round=await startTownStudy('LV4/17'),choice=await prepare(round.id,0,correct);
  expect(await balance()).toBe(0);expect(await progressDb.reviewLogs.count()).toBe(0);
  await Promise.all([saveTownStudy(round.id,0,correct?2:0,false,true),saveTownStudy(round.id,0,correct?2:0,false,true)]);
  const data=await resolveTownStudy(round.id),snapshot=(await exportProgress()).data;
  expect(data.saved?.objective).toEqual({choiceWordId:choice.wordId,correct});expect(data.round.index).toBe(0);
  expect(await balance()).toBe(correct?5:1);expect(await progressDb.reviewLogs.count()).toBe(1);expect(await progressDb.directAttempts.count()).toBe(0);
  expect(snapshot.checkIns[0]).toMatchObject({newWordsCount:1,reviewCount:1,sessionsCount:1});
  const scope=await townScope('LV4/17');expect(getTownProgress([],snapshot.reviewLogs,scope.bindings).filter(row=>row.attempted)).toHaveLength(1);
  await progressDb.close();await progressDb.open();await saveTownStudy(round.id,0,correct?0:2,false,true);
  expect((await exportProgress()).data).toEqual(snapshot);expect(validateBackup(await exportProgress())).toBeNull();
  await Promise.all([nextTownStudy(round.id,0),nextTownStudy(round.id,0)]);expect((await readTownStudyRound(round.id))?.index).toBe(1);
});

it('plain learning, reveal/self grades and recognized-word marking build only houses, never objective rewards',async()=>{
  const scope=await townScope('LV4/17');await gradeFlashcard(scope.words[0].word,2,'ordinary-review',true);await markWordKnown(scope.words[1].word,'ordinary-known');
  expect(await balance()).toBe(0);expect(await progressDb.rewardRounds.count()).toBe(0);
  const round=await startTownStudy('LV1/1');await prepareTownStudyOptions(round.id,0);
  // Persisting a reveal without an actual choice is a self grade, even if four options exist.
  await pickTownStudy(round.id,0);await saveTownStudy(round.id,0,3,false,true);
  expect((await resolveTownStudy(round.id)).saved?.objective).toBeUndefined();expect(await balance()).toBe(0);
  await nextTownStudy(round.id,0);
  const fallback=await readTownStudyRound(round.id);fallback!.options[1]=[];await progressDb.settings.put({key:`town-study:${round.id}`,value:fallback});
  await pickTownStudy(round.id,1,fallback!.items[1].word);await saveTownStudy(round.id,1,3,true,true);
  expect((await resolveTownStudy(round.id)).saved?.objective).toBeUndefined();expect(await balance()).toBe(0);expect(await progressDb.rewardLedger.count()).toBe(0);
  expect(getTownProgress([],await progressDb.reviewLogs.toArray(),scope.bindings).filter(row=>row.attempted)).toHaveLength(2);
});

it('a saved objective choice can accompany known policy; its +5 comes from the choice, not the self declaration',async()=>{
  const round=await startTownStudy('LV1/1');await prepare(round.id,0);await saveTownStudy(round.id,0,3,true,true);
  expect((await progressDb.cardStates.get(round.items[0].word))?.intervalDays).toBe(21);expect(await balance()).toBe(5);
  expect((await progressDb.checkIns.get(todayStr()))?.newWordsCount).toBe(0);expect((await resolveTownStudy(round.id)).saved?.objective?.correct).toBe(true);
});

it('a choice updated by another tab cannot schedule a stale verdict or claim false correctness',async()=>{
  const round=await startTownStudy('LV1/1');await prepare(round.id,0,false);
  await expect(saveTownStudy(round.id,0,2,false,true)).rejects.toThrow('選擇已更新');expect(await balance()).toBe(0);expect(await progressDb.reviewLogs.count()).toBe(0);
  await saveTownStudy(round.id,0,0,false,true);expect(await balance()).toBe(1);
});

it('wallet or round-receipt failures roll back houses, counters and SRS; retry pays once',async()=>{
  const round=await startTownStudy('LV4/17');await prepare(round.id,0);
  const before=(await exportProgress()).data;
  vi.spyOn(progressDb.rewardWallet,'put').mockRejectedValueOnce(Error('wallet full'));
  await expect(saveTownStudy(round.id,0,2,false,true)).rejects.toThrow('wallet full');expect((await exportProgress()).data).toEqual(before);
  const put=progressDb.settings.put.bind(progressDb.settings),failure=vi.spyOn(progressDb.settings,'put').mockImplementation((row,...args)=>row.key===`town-study:${round.id}` && (row.value as typeof round).answers[0] ? Dexie.Promise.reject(Error('receipt full')):put(row,...args));
  await expect(saveTownStudy(round.id,0,2,false,true)).rejects.toThrow('receipt full');expect((await exportProgress()).data).toEqual(before);
  failure.mockRestore();await saveTownStudy(round.id,0,2,false,true);expect(await balance()).toBe(5);expect(await progressDb.reviewLogs.count()).toBe(1);
});

it('the scoped daily queue mixes all due reviews with the shared remaining new quota and can earn meaning +30',async()=>{
  vi.spyOn(Date,'now').mockReturnValue(Date.now());const scope=await townScope('LV4/17');
  await setSetting('dailyNewWordCap',4);
  await progressDb.checkIns.put({date:todayStr(),reviewCount:1,newWordsCount:1,sessionsCount:1});
  await progressDb.cardStates.bulkPut(scope.words.slice(0,8).map(word=>({...newCardState(word.word,todayStr()),state:'review' as const,createdAt:'2026-01-01T00:00:00Z',lastReviewedAt:'2026-01-01T00:00:00Z',dueDate:addDaysStr(todayStr(),-1)})));
  const round=await startTownStudy('LV4/17');expect(round.items.filter(item=>item.isNew)).toHaveLength(3);expect(round.items.filter(item=>!item.isNew)).toHaveLength(8);
  for(let index=0;index<11;index++){await prepare(round.id,index);await saveTownStudy(round.id,index,2,false,true);await nextTownStudy(round.id,index);}
  expect(await balance()).toBe(85);expect((await progressDb.rewardLedger.where('kind').equals('round-bonus').toArray()).map(event=>event.amount)).toEqual([30]);
  expect((await progressDb.checkIns.get(todayStr()))?.newWordsCount).toBe(4);expect(await progressDb.reviewLogs.count()).toBe(11);
  expect(validateBackup(await exportProgress())).toBeNull();
});

it('the 10th town answer and challenge roll back together when bonus storage fails',async()=>{
  vi.spyOn(Date,'now').mockReturnValue(Date.now());await setSetting('dailyNewWordCap',10);const round=await startTownStudy('LV4/17');
  for(let index=0;index<9;index++){await prepare(round.id,index);await saveTownStudy(round.id,index,2,false,true);await nextTownStudy(round.id,index);}
  await prepare(round.id,9);const before=(await exportProgress()).data,add=progressDb.rewardLedger.add.bind(progressDb.rewardLedger);
  const failure=vi.spyOn(progressDb.rewardLedger,'add').mockImplementation(event=>event.kind==='round-bonus'?Dexie.Promise.reject(Error('bonus full')):add(event));
  await expect(saveTownStudy(round.id,9,2,false,true)).rejects.toThrow('bonus full');expect((await exportProgress()).data).toEqual(before);
  failure.mockRestore();await saveTownStudy(round.id,9,2,false,true);expect(await balance()).toBe(80);
});

it('v7 backup restores objective answers and coins; v5 learning restore never back-pays a town event',async()=>{
  const round=await startTownStudy('LV1/1');await prepare(round.id,0);const old=await exportProgress();old.schemaVersion=5;delete old.data.rewardLedger;delete old.data.rewardWallet;delete old.data.rewardRounds;
  await saveTownStudy(round.id,0,2,false,true);const backup=await exportProgress();expect(backup.schemaVersion).toBe(8);
  await progressDb.delete();await progressDb.open();await importProgress(backup);await saveTownStudy(round.id,0,0,false,true);expect((await exportProgress()).data).toEqual(backup.data);
  await importProgress(old);await saveTownStudy(round.id,0,2,false,true);expect(await balance()).toBe(5);expect(await progressDb.reviewLogs.count()).toBe(1);expect(validateBackup(await exportProgress())).toBeNull();
  const wrongPolicy=structuredClone(backup);wrongPolicy.data.rewardLedger![0].challenge='fill-v2';expect(validateBackup(wrongPolicy)).toContain('金幣');
});

it('two database connections claim a Taiwan day once and the next Taiwan date once without learning',async()=>{
  const other=new VocabProgressDB();await other.open();const before=Date.UTC(2026,9,12,15,59,59,999),after=before+1;
  try{await Promise.all([claimDailyCheckIn(before),other.transaction('rw',[other.rewardLedger,other.rewardWallet],async()=>{
    const date='2026-10-12',id=`check-in:${date}`;if(await other.rewardLedger.get(id))return;
    await other.rewardLedger.add({id,kind:'daily-check-in',amount:30,createdAt:before,taiwanDate:date});const wallet=await other.rewardWallet.get('local');await other.rewardWallet.put({id:'local',balance:(wallet?.balance ?? 0)+30,updatedAt:before});
  })]);await claimDailyCheckIn(after);await claimDailyCheckIn(after);expect(await balance()).toBe(60);expect(await progressDb.reviewLogs.count()).toBe(0);expect(await progressDb.checkIns.count()).toBe(0);}finally{other.close();}
});
