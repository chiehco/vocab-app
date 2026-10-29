import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import baseline from '../../scripts/fixtures/recovered-unit-integration-baseline.json';
import pack from '../../public/data/v1/sa-pack.json';
import { contentDb } from './contentDb';
import { progressDb } from './progressDb';
import { ensureContentAvailable, refreshInstalledContent, updateDictionaryContent } from './seed';
import { findUnit, REVISION, templateGroup } from '../features/direct/model';
import { getOrCreateTemplateGroup, saveGroup } from '../features/direct/store';
import { gradeFlashcard } from '../checkin/recordActivity';
import { WRITTEN_REVISION } from '../features/exam/writtenModel';
import { exportProgress, validateBackup } from '../backup/backup';
import { claimDailyCheckIn, presentRewardRound, awardAnswer } from '../features/rewards/store';
import { purchaseAndPlace } from '../features/town/decorations/store';

const additional = new Set(baseline.additionalWordIds);
const oldWords = pack.words.filter(w => !additional.has(w.wordId));
const oldIds = new Set(oldWords.map(w => w.wordId));
const oldNames = new Set(oldWords.map(w => w.word));
const oldPack = {...pack, meta: baseline.starterMeta, words: oldWords,
  senses: pack.senses.filter(row => oldIds.has(row.wordId)),
  examples: pack.examples.filter(row => oldNames.has(row.word)),
  relations: pack.relations.filter(row => oldNames.has(row.word) && oldNames.has(row.relatedWord)),
  morphemes: pack.morphemes.filter(row => oldNames.has(row.word)),
  notes: pack.notes.filter(row => oldNames.has(row.word)),
  examPriorities: pack.examPriorities.filter(row => oldIds.has(row.wordId)),
};
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(row).sort().map(key => [key, stable(row[key])]));
  }
  return value;
}
const snapshot = () => Promise.all(progressDb.tables.map(table => table.toArray()));
const full = Object.fromEntries(['meta','words','senses','examples','relations','morphemes','notes','exam_priority','media']
  .map(name => [name + '.json', JSON.parse(readFileSync(new URL(`../../public/data/v1/${name}.json`, import.meta.url), 'utf8'))]));
function serve(scope: string, incoming = pack, fail = false) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (fail) throw new TypeError('synthetic offline');
    const name = url.split('?')[0].split('/').pop()!;
    return new Response(JSON.stringify(name === 'sa-pack.json' ? incoming : full[name]), {status: scope === 'full' || name === 'sa-pack.json' ? 200 : 404});
  }));
}
beforeEach(async () => { await contentDb.open(); await progressDb.open(); await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear())); });
afterEach(() => { vi.unstubAllGlobals(); });

it('adds exactly the 51 existing IDs while retaining every original starter payload in order', () => {
  expect(oldPack.words).toHaveLength(5728);
  expect(pack.words).toHaveLength(5779);
  expect(pack.words.filter(w => !oldIds.has(w.wordId)).map(w => w.wordId).sort()).toEqual(baseline.additionalWordIds);
  for (const dataset of baseline.datasets) {
    const rows = oldPack[dataset.name as keyof typeof oldPack] as unknown as Record<string, unknown>[];
    expect(rows).toHaveLength(dataset.count);
    expect(rows.every(row => typeof row[dataset.key] === 'string')).toBe(true);
    expect(new Set(rows.map(row => row[dataset.key])).size).toBe(rows.length);
    expect(createHash('sha256').update(JSON.stringify(stable(rows))).digest('hex')).toBe(dataset.payloadHash);
  }
  expect(pack.meta.contentHash).not.toBe(oldPack.meta.contentHash);
});

async function populateProgress() {
  await gradeFlashcard('boy', 2, 'retained-srs', true);
  await progressDb.quizStats.put({word:'boy',timesAsked:2,timesCorrect:1,lastAskedAt:'2026-10-13T12:00:00Z'});
  await progressDb.settings.put({key:'fontScale',value:1.15});
  const unit = findUnit(17, 'LV4')!, question = unit.questions[0];
  const group = templateGroup(unit.templateId);
  await saveGroup({...group,name:'保留自訂名稱與順序',itemIds:[...group.itemIds].reverse()});
  await progressDb.directSessions.put({id:'retained-direct',questionIds:[question.questionId],index:0,choices:{},lookups:{},startedAt:1,updatedAt:2,revision:REVISION});
  await progressDb.directAttempts.put({id:'retained-direct:'+question.questionId,sessionId:'retained-direct',questionId:question.questionId,revision:REVISION,choice:question.answer,correct:true,firstAttempt:true,hintUsed:false,lookedUpWords:[],answeredAt:2,schedulingApplied:false});
  await progressDb.writtenSessions.put({id:'retained-written',groupId:'translation1',revision:WRITTEN_REVISION,answers:{'gsat-115-t01':'retained answer'},lookups:[],createdAt:1,updatedAt:2});
  await progressDb.writtenSubmissions.put({id:'retained-written:gsat-115-t01',sessionId:'retained-written',questionId:'gsat-115-t01',rawAnswer:'retained answer',submittedAt:2,firstAttempt:true,revision:WRITTEN_REVISION,lookedUpWords:[],assessments:[]});
  await claimDailyCheckIn(1791892800000);
  await presentRewardRound('town:retained-town',1,100,'meaning-v2');
  await awardAnswer({id:'answer:town:retained-town:0',roundId:'town:retained-town',word:'boy',correct:true,source:'town',referenceId:'1',choiceWordId:'W000095',answeredAt:200,challenge:'meaning-v2'});
  await purchaseAndPlace({id:'retained-decoration',sku:'plant',town:'LV4/17',x:0,y:0});
  return group;
}

it.each(['starter','full'])('keeps all 14 nonempty progress tables on normal %s update, failed retry and offline reopen', async scope => {
  if (scope === 'full') {
    serve('full', {...pack, words:[], meta:{...pack.meta, counts:{...pack.meta.counts, words:1}}});
  } else serve('starter', oldPack);
  await ensureContentAvailable();
  expect(await contentDb.words.count()).toBe(scope === 'full' ? 6090 : 5728);
  const group = await populateProgress();
  const before = await snapshot(), backup = await exportProgress();
  expect(before).toHaveLength(14); expect(before.every(rows => rows.length > 0)).toBe(true);
  expect(validateBackup(backup)).toBeNull();
  serve(scope, pack, true);
  await expect(updateDictionaryContent()).rejects.toThrow('synthetic offline');
  expect(await contentDb.words.count()).toBe(scope === 'full' ? 6090 : 5728);
  expect(await snapshot()).toEqual(before);
  serve(scope);
  expect(await updateDictionaryContent()).toMatchObject({scope, status:scope === 'full' ? 'current' : 'updated'});
  expect(await contentDb.words.count()).toBe(scope === 'full' ? 6090 : 5779);
  expect(await contentDb.words.bulkGet(baseline.additionalWordIds)).not.toContain(undefined);
  expect((await contentDb.words.get('W000415'))?.verbForms?.past).toBe('housed');
  expect((await contentDb.senses.bulkGet(['W000415-1','W000415-2'])).every(s => s?.status === 'approved')).toBe(true);
  expect(await snapshot()).toEqual(before);
  expect((await exportProgress()).data).toEqual(backup.data);
  const retained = await getOrCreateTemplateGroup(group.templateId!);
  expect(retained.added).toBe(false); expect(retained.group.itemIds).toEqual([...group.itemIds].reverse());
  expect(retained.group.name).toBe('保留自訂名稱與順序');
  contentDb.close(); progressDb.close();
  serve(scope, pack, true);
  await contentDb.open(); await progressDb.open();
  await ensureContentAvailable(); await refreshInstalledContent();
  expect(await contentDb.words.bulkGet(baseline.additionalWordIds)).not.toContain(undefined);
  expect(await snapshot()).toEqual(before);
}, 30000);
