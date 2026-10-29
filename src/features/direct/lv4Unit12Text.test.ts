import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import source1 from '../../../scripts/sources/LV4Unit1.json';
import source2 from '../../../scripts/sources/LV4Unit2.json';
import pack from '../../../public/data/v1/sa-pack.json';
import { allQuestions, findUnit, REVISION, templateGroup, validGroup } from './model';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { getOrCreateTemplateGroup, saveGroup } from './store';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds, reviewedExample } from '../vocabulary/model';
import { siegeUnitWords } from '../siege/model';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { ensureContentAvailable, refreshInstalledContent } from '../../db/seed';
import { gradeFlashcard } from '../../checkin/recordActivity';
import { awardAnswer, claimDailyCheckIn, presentRewardRound } from '../rewards/store';
import { purchaseAndPlace } from '../town/decorations/store';
import { WRITTEN_REVISION } from '../exam/writtenModel';
import { exportProgress, validateBackup } from '../../backup/backup';

beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
});
afterEach(() => vi.unstubAllGlobals());

for (const [source, count, usageCount, mappedCount] of [[source1, 102, 33, 83], [source2, 127, 37, 102]] as const) {
  const unit = findUnit(source.unit, 'LV4')!;
  const vocabulary = unit.items.filter(i => i.kind === 'vocabulary');
  const rows = [...source.headwords, ...source.related];

  it(`LV4 U${source.unit} keeps the checked scope, source meanings and nullable identities`, () => {
    expect(unit.deliveryMode).toBe('text_only');
    const published = textbookUnits.find(u => u.level === 'LV4' && u.unit === source.unit);
    expect(published).toMatchObject({ count, usageCount });
    expect(vocabulary.map(i => [i.displayWord, i.sourcePage, i.sensePos, i.chapterMeaningsZh, i.officialWordId]))
      .toEqual(rows.map(i => [i.word, i.sourcePage, i.sourcePos, i.chapterMeaningsZh, i.officialWordId]));
    expect(vocabulary.slice(0, source.headwordOrder.length).map(i => i.displayWord)).toEqual(source.headwordOrder);
    expect(unit.items.filter(i => i.kind === 'grammar').map(i => [i.pattern, i.sourcePage, i.explanationZh]))
      .toEqual(source.usage.map(i => [i.label, i.sourcePage, i.explanationZh]));
    for (const row of rows.filter(r => r.officialWordId)) {
      expect(pack.words.find(w => w.wordId === row.officialWordId)?.word).toBe(row.officialWord);
    }
    expect(vocabulary.every(i => i.meaningSource === 'textbook_transcription')).toBe(true);
    expect(new Set(unit.items.map(i => i.learningItemId)).size).toBe(count + usageCount);
  });

  it(`LV4 U${source.unit} fresh startup resolves every mapped card with one bootstrap fetch`, async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(pack))));
    await ensureContentAvailable();
    const group = templateGroup(unit.templateId);
    const ids = groupWordIds(group);
    expect(validGroup(group)).toBe(true);
    expect(group.itemIds).toHaveLength(count + usageCount);
    expect(ids).toHaveLength(mappedCount);
    expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
    expect(resolveGroupWords(group, await contentDb.words.toArray())).toHaveLength(mappedCount);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('sa-pack.json');
  });

  it(`LV4 U${source.unit} excludes pending art and examples while checked text remains playable`, () => {
    expect(unit.items.every(i => !i.illustration && !i.originalExample && !i.officialSenseId)).toBe(true);
    expect(unit.questions).toEqual([]);
    expect(practiceIds(unit.items)).toEqual([]);
    expect(unit.items.every(i => !reviewedExample(i))).toBe(true);
    expect(allQuestions.some(q => unit.items.some(i => i.learningItemId === q.learningItemId))).toBe(false);
    expect(siegeUnitWords('LV4', source.unit, []).every(([,meaning]) => !meaning.includes('待核對'))).toBe(true);
    expect(REVISION).toBe('20260912-1');
  });
}

it('uses printed boundaries and independent unnumbered heads instead of the incorrect draft Unit labels', () => {
  expect(source1.headwords.filter(r => r.printedNumber).map(r => r.printedNumber)).toEqual(Array.from({length:23},(_,i)=>i+1));
  expect(source2.headwords.filter(r => r.printedNumber).map(r => r.printedNumber)).toEqual(Array.from({length:30},(_,i)=>i+1));
  expect(findUnit(1, 'LV4')!.items.find(i => i.displayWord === 'addict')).toMatchObject({sourcePage:9,printedNumber:23});
  expect(findUnit(2, 'LV4')!.items.find(i => i.displayWord === 'atmosphere')).toMatchObject({sourcePage:19,printedNumber:24});
  expect(findUnit(2, 'LV4')!.items.find(i => i.displayWord === 'occasional')).toMatchObject({sourcePage:21,printedNumber:30});
  expect(findUnit(1, 'LV4')!.items.filter(i => i.displayWord === 'associate').map(i => i.chapterMeaningsZh))
    .toEqual(['使有關聯；交往', '合夥人；副的']);
  expect(source2.headwords.find(r => r.word === 'measure(s)')).toMatchObject({officialWord:'measure',mappingEvidence:'printed_singular_plural_variant'});
  expect(source2.photos.find(r => r.page === 19)?.path).toContain('補拍_P.19.jpg');
  expect(source1.boundaryEvidence.nextUnitPage).toBe(11);
  expect(source2.boundaryEvidence.nextUnitPage).toBe(23);
  expect(findUnit(2, 'LV4')!.items.find(i => i.displayWord === 'yellow')).toMatchObject({sensePos:'adj.',targetMeaningZh:'膽小的'});
});

it('preserves the separate p5 research frames, printed century note and p19 atmosphere meaning', () => {
  const unit1 = findUnit(1, 'LV4')!;
  const research = unit1.items.filter(i => i.displayWord === 'research');
  expect(research).toHaveLength(2);
  expect(source1.headwords.filter(i => i.word === 'research').map(i => i.printedNumber)).toEqual([12, null]);
  expect(research.map(i => [i.sourcePage, i.sourceRole, i.sensePos, i.chapterMeaningsZh, i.officialWordId]))
    .toEqual([[5, 'main', 'n.', '研究（不可數）', 'W003843'], [5, 'unnumbered_headword', 'vt.', '研究', 'W003843']]);
  expect(research[0].learningItemId).not.toBe(research[1].learningItemId);
  expect(research[1].learningItemId).toBe('LI-LV4U01-V102');
  expect(groupWordIds(templateGroup(unit1.templateId)).filter(id => id === 'W003843')).toHaveLength(1);
  const century = unit1.items.find(i => i.pattern === 'the 1500s')!;
  expect(century).toMatchObject({ learningItemId: 'LI-LV4U01-G033', kind: 'grammar', sourcePage: 5, explanationZh: '16世紀', practiceMode: 'read_only' });
  expect(century.officialWordId).toBeUndefined();
  expect(findUnit(2, 'LV4')!.items.find(i => i.displayWord === 'atmosphere'))
    .toMatchObject({ sourcePage: 19, targetMeaningZh: '大氣；空氣；氛圍', chapterMeaningsZh: '大氣；空氣；氛圍' });
  expect(siegeUnitWords('LV4', 2, []).find(([word]) => word === 'ATMOSPHERE')?.[1]).toBe('大氣；空氣；氛圍');
  expect(source2.boundaryEvidence.notesConfirmationStatus).toBe('confirmed_blank_notes_by_owner');
});

it('content refresh preserves all 14 nonempty progress tables, SRS, town rewards, decorations and personal groups', async () => {
  const ids = [...new Set([1,2].flatMap(n => groupWordIds(templateGroup(findUnit(n,'LV4')!.templateId))))];
  const oldWords = pack.words.filter(w => !ids.includes(w.wordId));
  let incoming = {...pack, words:oldWords, meta:{...pack.meta, contentHash:'sa:before-LV4-U1-U2',counts:{...pack.meta.counts,words:oldWords.length}}};
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(incoming))));
  await ensureContentAvailable();
  await gradeFlashcard(oldWords[0].word, 2, 'retained-srs', true);
  await progressDb.quizStats.put({word:oldWords[0].word,timesAsked:2,timesCorrect:1,lastAskedAt:'2026-10-13T12:00:00Z'});
  await progressDb.settings.put({key:'fontScale',value:1.15});
  const oldUnit = findUnit(17, 'LV4')!;
  const {group} = await getOrCreateTemplateGroup(oldUnit.templateId);
  await saveGroup({...group,name:'保留自訂 U17',itemIds:[...group.itemIds].reverse()});
  const oldU2 = templateGroup(2, 'LV4');
  await saveGroup({...oldU2,name:'原有 U2 個人排序',itemIds:[...oldU2.itemIds].reverse()});
  const question=oldUnit.questions[0];
  await progressDb.directSessions.put({id:'retained-direct',questionIds:[question.questionId],index:0,choices:{},lookups:{},startedAt:1,updatedAt:2,revision:REVISION});
  await progressDb.directAttempts.put({id:'retained-direct:'+question.questionId,sessionId:'retained-direct',questionId:question.questionId,revision:REVISION,choice:question.answer,correct:true,firstAttempt:true,hintUsed:false,lookedUpWords:[],answeredAt:2,schedulingApplied:false});
  await progressDb.writtenSessions.put({id:'retained-written',groupId:'translation1',revision:WRITTEN_REVISION,answers:{'gsat-115-t01':'retained answer'},lookups:[],createdAt:1,updatedAt:2});
  await progressDb.writtenSubmissions.put({id:'retained-written:gsat-115-t01',sessionId:'retained-written',questionId:'gsat-115-t01',rawAnswer:'retained answer',submittedAt:2,firstAttempt:true,revision:WRITTEN_REVISION,lookedUpWords:[],assessments:[]});
  await claimDailyCheckIn(1791892800000);
  await presentRewardRound('town:retained-town',1,100,'meaning-v2');
  await awardAnswer({id:'answer:town:retained-town:0',roundId:'town:retained-town',word:oldWords[0].word,correct:true,source:'town',referenceId:'1',choiceWordId:oldWords[0].wordId,answeredAt:200,challenge:'meaning-v2'});
  await purchaseAndPlace({id:'retained-decoration',sku:'plant',town:'LV4/17',x:0,y:0});
  const before = await Promise.all(progressDb.tables.map(table => table.toArray()));
  expect(progressDb.tables).toHaveLength(14);
  expect(before.every(rows => rows.length > 0)).toBe(true);
  const backup = await exportProgress();
  expect(validateBackup(backup)).toBeNull();
  expect(backup.data.customGroups!.find(g=>g.id===oldU2.id)?.itemIds).toEqual([...oldU2.itemIds].reverse());
  incoming = pack;
  await refreshInstalledContent();
  expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
  expect(await Promise.all(progressDb.tables.map(table => table.toArray()))).toEqual(before);
  const saved=await getOrCreateTemplateGroup(oldUnit.templateId);
  expect(saved.added).toBe(false);
  expect(saved.group.name).toBe('保留自訂 U17');
  expect(saved.group.itemIds).toEqual([...oldUnit.items.map(i=>i.learningItemId)].reverse());
  const after = await exportProgress();
  expect(after.data).toEqual(backup.data);
  expect(validateBackup(after)).toBeNull();
  expect(await progressDb.rewardWallet.get('local')).toMatchObject({balance:5});
});
