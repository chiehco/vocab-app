import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { writeFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import pack from '../../public/data/v1/sa-pack.json';
import baseline from '../../scripts/fixtures/lv6-main-integration-baseline.json';
import { contentDb } from './contentDb';
import { VocabProgressDB } from './progressDb';
import { ensureContentAvailable, refreshInstalledContent } from './seed';
import { newCardState } from '../srs/sm2';
import { exportProgress, importProgress, validateBackup } from '../backup/backup';
import { findUnit, REVISION, templateGroup } from '../features/direct/model';
import { WRITTEN_REVISION } from '../features/exam/writtenModel';
import { purchaseAndPlace, storeOwnedDecoration } from '../features/town/decorations/store';

// Reconstruct the retained pre-LV6 rows without requiring git history in shallow CI checkouts.
const oldDatasets = Object.fromEntries(baseline.datasets.map(dataset => {
  const ids = new Set(dataset.ids);
  const rows = pack[dataset.name as keyof typeof pack] as unknown as Record<string, unknown>[];
  return [dataset.name, rows.filter(row => ids.has(String(row[dataset.key])))];
}));
const oldPack = {...oldDatasets, meta:{...pack.meta, wordsHash:'sa:pre-lv6-main', contentHash:'sa:pre-lv6-main',
  counts:Object.fromEntries(Object.entries(oldDatasets).map(([name,rows])=>[name==='examPriorities'?'examPriority':name,rows.length])),
}} as unknown as typeof pack;
const schema = {
  cardStates: 'word, dueDate, state', reviewLogs: '++id, word, reviewedAt, sessionId', checkIns: 'date',
  quizStats: 'word', settings: 'key', customGroups: 'id, updatedAt', directSessions: 'id, updatedAt',
  directAttempts: 'id, questionId, sessionId, answeredAt', writtenSessions: 'id, updatedAt',
  writtenSubmissions: 'id, sessionId, questionId, submittedAt', rewardWallet: 'id',
  rewardRounds: 'id, startedAt', rewardLedger: 'id, kind, roundId, createdAt, taiwanDate',
};
const connections: Dexie[] = [];
const snapshot = async (db: Dexie): Promise<Record<string, unknown[]>> => Object.fromEntries(await Promise.all(db.tables.map(async t => [t.name, await t.toArray()] as const)));
afterEach(async () => {
  vi.unstubAllGlobals();
  for (const db of connections) db.close();
  for (const name of new Set(connections.map(db => db.name))) await Dexie.delete(name);
  connections.length = 0;
  await contentDb.delete();
});

it('preserves all 13 nonempty v4 tables through v5 upgrade, actual 5052→5728 update, all-14-table backup and offline reopen', async () => {
  const name = `lv6-current-main-${crypto.randomUUID()}`;
  const legacy = new Dexie(name); connections.push(legacy);
  legacy.version(4).stores(schema);
  await legacy.open();
  const at = Date.UTC(2026, 9, 18, 4), date = '2026-10-18';
  const unit = findUnit(17, 'LV4')!, question = unit.questions[0];
  const group = templateGroup(unit.templateId);
  const rows: Record<string, unknown[]> = {
    cardStates: [{...newCardState('boy', date), state:'review', intervalDays:7, repetitions:3}],
    reviewLogs: [{id:41, word:'boy', reviewedAt:'2026-10-18T04:00:00Z', sessionId:'legacy-review', mode:'flashcard', grade:2, intervalBefore:1, intervalAfter:7, easeFactorBefore:2.5, easeFactorAfter:2.5, schedulingApplied:true}],
    checkIns: [{date, reviewCount:1, newWordsCount:0, sessionsCount:1}],
    quizStats: [{word:'boy', timesAsked:3, timesCorrect:2, lastAskedAt:'2026-10-18T04:00:00Z'}],
    settings: [{key:'fontScale',value:1.15},{key:'autoPronounce',value:false}],
    customGroups: [{...group,name:'保留自訂順序',itemIds:[...group.itemIds].reverse()}],
    directSessions: [{id:'retained-direct',questionIds:[question.questionId],index:0,choices:{},lookups:{},startedAt:1,updatedAt:2,revision:REVISION}],
    directAttempts: [{id:`retained-direct:${question.questionId}`,sessionId:'retained-direct',questionId:question.questionId,revision:REVISION,choice:question.answer,correct:true,firstAttempt:true,hintUsed:false,lookedUpWords:[],answeredAt:2,schedulingApplied:false}],
    writtenSessions: [{id:'retained-written',groupId:'translation1',revision:WRITTEN_REVISION,answers:{'gsat-115-t01':'retained answer'},lookups:[],createdAt:1,updatedAt:2}],
    writtenSubmissions: [{id:'retained-written:gsat-115-t01',sessionId:'retained-written',questionId:'gsat-115-t01',rawAnswer:'retained answer',submittedAt:2,firstAttempt:true,revision:WRITTEN_REVISION,lookedUpWords:[],assessments:[{at:3,score:2}]}],
    rewardWallet: [{id:'local',balance:60,updatedAt:at}],
    rewardRounds: [{id:'town:retained-town',questionCount:1,startedAt:100,challenge:'meaning-v2',distinctWordCount:1}],
    rewardLedger: [0,1].map(day=>({id:`check-in:2026-10-${18-day}`,kind:'daily-check-in',amount:30,createdAt:at-day*86400000,taiwanDate:`2026-10-${18-day}`})),
  };
  for (const [table, data] of Object.entries(rows)) await legacy.table(table).bulkPut(data);
  const beforeUpgrade = await snapshot(legacy);
  expect(Object.keys(beforeUpgrade)).toHaveLength(13);
  expect(Object.values(beforeUpgrade).every(data => data.length > 0)).toBe(true);
  legacy.close();

  const db = new VocabProgressDB(name); connections.push(db); await db.open();
  expect(db.verno).toBe(5); expect(db.tables).toHaveLength(14);
  for (const table of Object.keys(schema)) expect(await db.table(table).toArray()).toEqual(beforeUpgrade[table]);
  expect(await db.townDecorations.count()).toBe(0);
  const v7 = await exportProgress(db); v7.schemaVersion = 7; delete v7.data.townDecorations;
  expect(validateBackup(v7)).toBeNull();

  let incoming = oldPack;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (!url.split('?')[0].endsWith('/sa-pack.json')) throw Error(`Unexpected full-data fallback: ${url}`);
    return new Response(JSON.stringify(incoming));
  }));
  await ensureContentAvailable(); expect(await contentDb.words.count()).toBe(5052);
  await purchaseAndPlace({id:'placed',sku:'plant',town:'LV4/17',x:0,y:0},db);
  await purchaseAndPlace({id:'stored',sku:'plant',town:'LV1/1',x:0,y:0},db);
  await storeOwnedDecoration('stored',db);
  const beforeRefresh = await snapshot(db);
  expect(Object.values(beforeRefresh).every(data => data.length > 0)).toBe(true);
  const beforeBackup = await exportProgress(db); expect(validateBackup(beforeBackup)).toBeNull();
  if (process.env.LV6_AUDIT_OUTPUT) writeFileSync(process.env.LV6_AUDIT_OUTPUT, JSON.stringify({schema, legacy:beforeUpgrade, v5:beforeRefresh, backup:beforeBackup}));
  incoming = pack; await refreshInstalledContent();
  expect(await contentDb.words.count()).toBe(5728);
  expect(await snapshot(db)).toEqual(beforeRefresh);
  expect((await db.rewardWallet.get('local'))?.balance).toBe(0);
  expect(await db.townDecorations.count()).toBe(2);

  db.close(); contentDb.close();
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
  await db.open(); await contentDb.open(); await ensureContentAvailable(); await refreshInstalledContent();
  expect(await contentDb.words.count()).toBe(5728);
  expect(await snapshot(db)).toEqual(beforeRefresh);
  const v8 = await exportProgress(db);
  expect(v8.schemaVersion).toBe(8); expect(validateBackup(v8)).toBeNull();
  expect(v8.data).toEqual(beforeBackup.data);

  const restored = new VocabProgressDB(`${name}-v8`); connections.push(restored); await restored.open();
  expect((await Promise.all(restored.tables.map(t=>t.count()))).every(n=>n===0)).toBe(true);
  await importProgress(v8,restored); expect(await snapshot(restored)).toEqual(beforeRefresh);
  restored.close(); await restored.open(); expect(await snapshot(restored)).toEqual(beforeRefresh);
  await expect(importProgress(v7,db)).rejects.toThrow('舊版備份');
  expect(await snapshot(db)).toEqual(beforeRefresh);
  const legacyRestore = new VocabProgressDB(`${name}-v7`); connections.push(legacyRestore); await legacyRestore.open();
  await importProgress(v7,legacyRestore);
  for (const table of Object.keys(schema)) expect(await legacyRestore.table(table).toArray()).toEqual(beforeUpgrade[table]);
  expect(await legacyRestore.townDecorations.count()).toBe(0);
}, 30000);
