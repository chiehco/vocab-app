import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import words from '../../../public/data/v1/words.json';
import bootstrap from '../../../public/data/v1/sa-pack.json';
import unit from '../direct/curriculumLV4Unit20.json';
import type { WordRecord } from '../../db/types';
import { progressDb } from '../../db/progressDb';
import { isCorrectAnswer, practiceQuestions, questionForMode, templateGroup, unitItems } from '../direct/model';
import { nextQuestion, saveGroup, startGroupSession, submitAnswer, switchPracticeMode, updateQuestion } from '../direct/store';
import { practiceIds, reviewedExample } from './model';
import { approvedCurriculumCards, approvedCurriculumIllustration } from './approvedCurriculum';
import { workspaceWords } from '../modes/wordLists';

beforeEach(async () => { await progressDb.delete(); await progressDb.open(); });
afterEach(async () => { await progressDb.delete(); });

it('provides the complete reviewed Unit20 package', () => {
  const items = unitItems(20, 'LV4');
  expect(items).toHaveLength(82);
  expect(items.filter(item => item.kind === 'vocabulary')).toHaveLength(46);
  expect(items.filter(item => item.kind === 'grammar')).toHaveLength(36);
  expect(practiceIds(items)).toHaveLength(82);
  expect(unit.questions).toHaveLength(128);
  expect(unit.relatedNotes).toHaveLength(71);
  for (const item of items) {
    expect(reviewedExample(item)).toBeDefined();
    const example = item.originalExample!;
    expect(example.blankSentence.replace('_____', example.answer)).toBe(example.sentenceEn);
    const question = practiceQuestions.find(candidate => candidate.questionId === questionForMode(practiceIds([item])[0], 'basic'))!;
    expect(question.options).toHaveLength(4);
    expect(question.options.filter(option => option.id === question.answer)).toHaveLength(1);
  }
});

it('registers every official card and approved illustration on fresh install', () => {
  const cards = unit.learningItems.filter(item => item.kind === 'vocabulary');
  expect(new Set(cards.map(card => card.illustration!.path)).size).toBe(42);
  expect(cards.filter(card => card.officialWordId)).toHaveLength(44);
  for (const card of cards) {
    expect(existsSync('public/' + card.illustration!.path)).toBe(true);
    if (!card.officialWordId) continue;
    const word = words.find(entry => entry.wordId === card.officialWordId)!;
    expect(word).toBeDefined();
    expect(bootstrap.words.find(entry => entry.wordId === word.wordId)).toEqual(word);
    expect(approvedCurriculumCards(word.word, word.wordId).some(entry => entry.learningItemId === card.learningItemId)).toBe(true);
    expect(approvedCurriculumIllustration(card.displayWord!, '/' + card.illustration!.path + '?v=test')).toEqual(card.illustration);
  }
  expect(workspaceWords(bootstrap.words as WordRecord[], templateGroup('LV4-U20'), 'all', '')).toHaveLength(44);
});

it('keeps all five final reviewed changes and target forms', () => {
  const byWord = (word: string) => unit.learningItems.find(item => item.displayWord === word)!;
  expect(byWord('murmur').illustration!.captionEn).toContain('quiet library');
  expect(byWord('interaction').illustration!.captionEn).toContain('blocks light up');
  expect(byWord('passive').illustration!.path).toContain('20-07-v2.webp');
  expect(byWord('civilian').illustration!.path).toContain('20-27-v5.webp');
  expect(byWord('seize').illustration!.path).toContain('20-32-v2.webp');
  expect(isCorrectAnswer(practiceQuestions.find(question => question.questionId === 'CLOZE-ORIG-LV4U20-cube')!, 'cubes')).toBe(true);
  expect(isCorrectAnswer(practiceQuestions.find(question => question.questionId === 'CLOZE-ORIG-LV4U20-seize')!, 'seizes')).toBe(true);
});

it('completes the basic group and switches to the full advanced scope without SRS writes', async () => {
  const group = templateGroup('LV4-U20');
  await saveGroup(group);
  const session = await startGroupSession(group.id);
  expect(session.questionIds).toHaveLength(82);
  for (const id of session.questionIds) {
    const question = practiceQuestions.find(candidate => candidate.questionId === id)!;
    await updateQuestion(session.id, id, { choice: question.answer });
    await submitAnswer(session.id, id);
    await nextQuestion(session.id);
  }
  expect(await progressDb.directAttempts.count()).toBe(82);
  const advanced = await switchPracticeMode(session.id, 'advanced');
  expect(advanced.questionIds.filter(id => id.startsWith('CLOZE-'))).toHaveLength(46);
  expect(advanced.questionIds.filter(id => id.startsWith('USAGE-'))).toHaveLength(36);
  expect(await progressDb.cardStates.count()).toBe(0);
});
