import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { ensureContentAvailable, refreshInstalledContent } from '../../db/seed';
import { allQuestions, practiceQuestions, templateGroup } from '../direct/model';
import { groupWordIds, resolveGroupWords } from '../direct/groupScope';
import { saveGroup, startGroupSession, updateQuestion, submitAnswer, nextQuestion } from '../direct/store';
import { approvedCurriculumCard } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { getWordDisplaySense } from '../browser/wordDisplay';
import type { WordRecord, SenseRecord } from '../../db/types';
import unit18 from '../direct/curriculumLV4Unit18.json';
import unit20 from '../direct/curriculumLV4Unit20.json';
import pack from '../../../public/data/v1/sa-pack.json';
import review from './lv4MappedReview.json';

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
});

it('maps only the four approved senses and preserves their exact examples, illustrations, provenance and practice IDs', () => {
  expect(review.cards.map(card => [card.word, card.wordId])).toEqual([
    ['preferable', 'W006087'], ['brutality', 'W006088'], ['cubic', 'W006089'], ['interactive', 'W006090'],
  ]);
  for (const card of review.cards) {
    const unit = card.originalItem.unit === 18 ? unit18 : unit20;
    const item = unit.learningItems.find(i => i.learningItemId === card.originalItem.learningItemId)!;
    expect(item).toEqual({ ...card.originalItem, lexemeRef: card.wordId, officialWordId: card.wordId, officialSenseId: card.senseId });
    const word = pack.words.find(w => w.wordId === card.wordId)!;
    const sense = pack.senses.find(s => s.senseId === card.senseId)!;
    expect(getWordDisplaySense(word as WordRecord, [sense] as SenseRecord[]))
      .toMatchObject({ meaning: item.targetMeaningZh, pos: item.sensePos, needsReview: false, source: 'curriculum' });
    const example = pack.examples.find(e => e.exampleId === card.exampleId)!;
    expect(example).toMatchObject({ sentenceEn: item.originalExample.sentenceEn, sentenceZh: item.originalExample.sentenceZh,
      blankSentence: item.originalExample.blankSentence, answer: item.originalExample.answer });
    expect(allQuestions.find(q => q.questionId === 'CLOZE-' + item.originalExample.workExampleId))
      .toMatchObject({ sentenceEn: item.originalExample.sentenceEn, answer: item.originalExample.answer });
    expect(approvedCurriculumCard(card.word, card.wordId)?.illustration).toEqual(item.illustration);
    expect(getWordBeastAsset(card.wordId, card.word)).toContain(item.illustration!.path);
  }
  expect(review.cards[0].originalItem.originalExample.provenance).toBe('translated_from_user_chinese');
});

it('resolves every U18/U20 vocabulary item using only the fresh-install starter package', async () => {
  await Promise.all(contentDb.tables.map(table => table.clear()));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (!url.endsWith('/sa-pack.json')) throw new Error('Unexpected full-dictionary request');
    return new Response(JSON.stringify(pack));
  }));
  await ensureContentAvailable();
  const installed = await contentDb.words.toArray();
  for (const [unit, count] of [[unit18, 46], [unit20, 46]] as const) {
    const items = unit.learningItems.filter(i => i.kind === 'vocabulary');
    expect(items.every(i => i.officialWordId)).toBe(true);
    const ids = items.map(i => i.officialWordId!);
    expect(await contentDb.words.bulkGet(ids)).not.toContain(undefined);
    const group = templateGroup('LV4-U' + unit.template.unit);
    expect(groupWordIds(group)).toHaveLength(count);
    expect(resolveGroupWords(group, installed)).toHaveLength(count);
  }
  expect(await contentDb.words.count()).toBe(1534);
  expect(fetch).toHaveBeenCalledTimes(1);
}, 15000);

it('updates an installed starter package while retaining every progress table and saved curriculum session', async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
  const ids = new Set(review.cards.map(c => c.wordId));
  const names = new Set(review.cards.map(c => c.word));
  const previous = { ...pack, meta: { ...pack.meta, counts: { ...pack.meta.counts, words: pack.meta.counts.words - 4,
    senses: pack.meta.counts.senses - 4, examples: pack.meta.counts.examples - 4 }, contentHash: 'sa:before-four-word-test-fixture' },
    words: pack.words.filter(w => !ids.has(w.wordId)), senses: pack.senses.filter(s => !ids.has(s.wordId)),
    examples: pack.examples.filter(e => !names.has(e.word)) };
  let incoming = previous;
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(incoming))));
  await ensureContentAvailable();
  expect(await contentDb.words.count()).toBe(1530);
  const group = templateGroup('LV4-U18');
  await saveGroup({ ...group, name: '保留我的 U18 範圍', itemIds: group.itemIds.slice(0, 3) });
  const session = await startGroupSession(group.id);
  const q = practiceQuestions.find(q => q.questionId === session.questionIds[0])!;
  await updateQuestion(session.id, session.questionIds[0], { choice: q.answer });
  await submitAnswer(session.id, session.questionIds[0]);
  await nextQuestion(session.id);
  await progressDb.settings.put({ key: 'fontScale', value: 1.2 });
  await progressDb.cardStates.put({ word: 'guardian', state: 'review', easeFactor: 2.5, intervalDays: 7,
    repetitions: 3, dueDate: '2026-10-15', lastReviewedAt: '2026-10-08T00:00:00Z', lapses: 0, createdAt: '2026-09-16' });
  await progressDb.reviewLogs.add({ word: 'guardian', reviewedAt: '2026-10-08T00:00:00Z', sessionId: 'old-review', grade: 2,
    intervalBefore: 3, intervalAfter: 7, easeFactorBefore: 2.5, easeFactorAfter: 2.5, mode: 'flashcard' });
  await progressDb.quizStats.put({ word: 'guardian', timesAsked: 2, timesCorrect: 1, lastAskedAt: '2026-10-08T00:00:00Z' });
  await progressDb.checkIns.put({ date: '2026-10-08', reviewCount: 1, newWordsCount: 0, sessionsCount: 1 });
  const snapshot = await Promise.all(progressDb.tables.map(async table => [table.name, await table.toArray()]));
  incoming = pack;
  await refreshInstalledContent();
  expect(await contentDb.words.count()).toBe(1534);
  expect(await Promise.all(progressDb.tables.map(async table => [table.name, await table.toArray()]))).toEqual(snapshot);
  expect((await progressDb.directSessions.get(session.id))?.index).toBe(1);
  expect((await progressDb.customGroups.get(group.id))?.name).toBe('保留我的 U18 範圍');
}, 15000);
