import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { VocabProgressDB } from '../../../db/progressDb';
import { newCardState } from '../../../srs/sm2';
import { exportProgress, importProgress, validateBackup } from '../../../backup/backup';
import { DECORATIONS, placementError, validDecorationBackup, type OwnedDecoration } from './model';
import { placeOwnedDecoration, purchaseAndPlace, storeOwnedDecoration } from './store';

let db:VocabProgressDB;
beforeEach(async()=>{db=new VocabProgressDB(`decoration-test-${crypto.randomUUID()}`);await db.open();});
afterEach(()=>{db.close();vi.restoreAllMocks();});
const wallet=async()=> (await db.rewardWallet.get('local'))?.balance??0;
const fund=(balance:number)=>db.rewardWallet.put({id:'local',balance,updatedAt:Date.now()});
const buy=(id='purchase',x=0,y=0)=>purchaseAndPlace({id,sku:'plant',town:'LV1/1',x,y},db);

it.each(DECORATIONS)('$name uses its complete footprint and rejects overflow',item=>{
  const p={x:6-item.width,y:6-item.height};expect(placementError(item,p,'LV1/1',[])).toBeNull();
  for(const invalid of [{...p,x:p.x+1},{...p,y:p.y+1},{x:-1,y:0},{x:.5,y:0}])expect(placementError(item,invalid,'LV1/1',[])).not.toBeNull();
});
it('debit, receipt and placement commit once across concurrent retries and database reopen',async()=>{
  await fund(100);await db.cardStates.put(newCardState('boy','2026-10-18'));
  const learning=await db.cardStates.toArray();await Promise.all([buy(),buy(),buy()]);
  expect(await wallet()).toBe(70);expect(await db.townDecorations.count()).toBe(1);
  db.close();await db.open();await buy();expect(await wallet()).toBe(70);
  expect(await db.cardStates.toArray()).toEqual(learning);expect(await db.reviewLogs.count()).toBe(0);
  await expect(purchaseAndPlace({id:'purchase',sku:'bench',town:'LV1/1',x:3,y:0},db)).rejects.toThrow('識別碼');
  expect(await wallet()).toBe(70);
});
it('rejects insufficient funds, overlapping objects and invalid cells without charging',async()=>{
  await expect(buy()).rejects.toThrow('還差');expect(await db.townDecorations.count()).toBe(0);
  await fund(1000);await buy();
  await expect(purchaseAndPlace({id:'overlap',sku:'bench',town:'LV1/1',x:0,y:0},db)).rejects.toThrow('重疊');
  await expect(purchaseAndPlace({id:'overflow',sku:'fountain',town:'LV1/1',x:5,y:5},db)).rejects.toThrow('超出');
  expect(await wallet()).toBe(970);expect(await db.townDecorations.count()).toBe(1);
});
it('rolls receipt and position back if the debit cannot be saved',async()=>{
  await fund(100);vi.spyOn(db.rewardWallet,'put').mockRejectedValueOnce(Error('disk full'));
  await expect(buy()).rejects.toThrow('disk full');expect(await wallet()).toBe(100);expect(await db.townDecorations.count()).toBe(0);
});
it.each(['funds','cell'])('serializes competing purchases for the same %s',async race=>{
  await fund(race==='funds'?30:100);
  const result=await Promise.allSettled([buy('one'),buy('two',race==='funds'?2:0)]);
  expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(await db.townDecorations.count()).toBe(1);expect(await wallet()).toBe(race==='funds'?0:70);
});
it('moves, returns to storage and places owned objects without another fee or deleted ownership',async()=>{
  await fund(300);const input={id:'bench',sku:'bench' as const,town:'LV1/1' as const,x:0,y:0};
  await purchaseAndPlace(input,db);await placeOwnedDecoration('bench','LV1/1',{x:1,y:0},db);
  await purchaseAndPlace(input,db);expect((await db.townDecorations.get('bench'))?.placement).toEqual({town:'LV1/1',x:1,y:0});
  await storeOwnedDecoration('bench',db);await storeOwnedDecoration('bench',db);
  expect(await db.townDecorations.count()).toBe(1);expect((await db.townDecorations.get('bench'))?.placement).toBeUndefined();
  await placeOwnedDecoration('bench','LV4/17',{x:4,y:5},db);expect(await wallet()).toBe(210);
});
it('validates ownership receipts and occupancy per town',()=>{
  const record:OwnedDecoration={id:'one',sku:'plant',pricePaid:30,purchasedAt:Date.now(),placement:{town:'LV1/1',x:0,y:0}};
  expect(validDecorationBackup([record])).toBe(true);
  for(const rows of [[record,{...record,id:'two'}],[record,record],[{...record,pricePaid:0}],[{...record,placement:{town:'LV1/1',x:6,y:0}}]])expect(validDecorationBackup(rows)).toBe(false);
  expect(validDecorationBackup([record,{...record,id:'two',placement:{town:'LV4/17',x:0,y:0}}])).toBe(true);
});
it('exports and restores net wallet plus ownership; old backups cannot reset an existing purchase',async()=>{
  const now=Date.now(),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).format(now);
  await fund(30);await db.rewardLedger.add({id:`check-in:${date}`,kind:'daily-check-in',amount:30,createdAt:now,taiwanDate:date});
  const old=await exportProgress(db);old.schemaVersion=7;delete old.data.townDecorations;
  expect(validateBackup(old)).toBeNull();await buy();
  const backup=await exportProgress(db);expect(backup.schemaVersion).toBe(8);expect(validateBackup(backup)).toBeNull();
  const wrongBalance=structuredClone(backup);wrongBalance.data.rewardWallet![0].balance=30;
  expect(validateBackup(wrongBalance)).toContain('餘額');
  const restored=new VocabProgressDB(`decoration-restore-${crypto.randomUUID()}`);await restored.open();
  try{await importProgress(backup,restored);expect((await restored.rewardWallet.get('local'))?.balance).toBe(0);expect(await restored.townDecorations.count()).toBe(1);}finally{restored.close();}
  const before=await exportProgress(db);await expect(importProgress(old,db)).rejects.toThrow('舊版備份');expect(await exportProgress(db)).toMatchObject({data:before.data});
  const fresh=new VocabProgressDB(`decoration-legacy-${crypto.randomUUID()}`);await fresh.open();
  try{await importProgress(old,fresh);expect((await fresh.rewardWallet.get('local'))?.balance).toBe(30);expect(await fresh.townDecorations.count()).toBe(0);}finally{fresh.close();}
});
it('preserves wallet and ownership when a pre-reward backup has no wallet to replace',async()=>{
  await fund(100);await buy();const owned=await db.townDecorations.toArray();
  await importProgress({app:'vocab-app-progress',schemaVersion:1,exportedAt:'2026-10-18',data:{cardStates:[],reviewLogs:[],checkIns:[],quizStats:[],settings:[]}},db);
  expect(await wallet()).toBe(70);expect(await db.townDecorations.toArray()).toEqual(owned);
});
it('adds the ownership table to a version-4 database without changing existing learning or coins',async()=>{
  db.close();const name=`decoration-upgrade-${crypto.randomUUID()}`,old=new Dexie(name);
  old.version(4).stores({cardStates:'word, dueDate, state',reviewLogs:'++id, word, reviewedAt, sessionId',checkIns:'date',quizStats:'word',settings:'key',customGroups:'id, updatedAt',directSessions:'id, updatedAt',directAttempts:'id, questionId, sessionId, answeredAt',writtenSessions:'id, updatedAt',writtenSubmissions:'id, sessionId, questionId, submittedAt',rewardWallet:'id',rewardRounds:'id, startedAt',rewardLedger:'id, kind, roundId, createdAt, taiwanDate'});
  await old.open();await old.table('cardStates').put(newCardState('boy','2026-10-18'));await old.table('rewardWallet').put({id:'local',balance:80,updatedAt:Date.now()});old.close();
  db=new VocabProgressDB(name);await db.open();expect(await wallet()).toBe(80);expect((await db.cardStates.get('boy'))?.word).toBe('boy');expect(await db.townDecorations.count()).toBe(0);
});
