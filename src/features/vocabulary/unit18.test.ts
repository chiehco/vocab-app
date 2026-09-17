import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import words from '../../../public/data/v1/words.json';
import bootstrap from '../../../public/data/v1/sa-pack.json';
import unit from '../direct/curriculumLV4Unit18.json';
import type { WordRecord } from '../../db/types';
import { progressDb } from '../../db/progressDb';
import { templateGroup, unitItems, practiceQuestions, questionForMode, isCorrectAnswer, unitsForLevel } from '../direct/model';
import { saveGroup, startGroupSession, switchPracticeMode, updateQuestion, submitAnswer, nextQuestion } from '../direct/store';
import { reviewedExample, practiceIds } from './model';
import { approvedCurriculumCard, approvedCurriculumCards, approvedCurriculumIllustration } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { getWordDisplaySense } from '../browser/wordDisplay';
import { sortWorkspaceWords, workspaceWords } from '../modes/wordLists';
import type { ExamPriorityRecord } from '../../db/types';

beforeEach(async () => { await progressDb.delete(); await progressDb.open(); });
afterEach(async () => { await progressDb.delete(); });

it('registers the entire approved Unit18 with reconstructable examples and distinct practice IDs', () => {
  expect(unitsForLevel('LV4').map(u => u.unit)).toEqual([17,18,19]);
  const items = unitItems(18, 'LV4');
  expect(items).toHaveLength(91);
  expect(items.filter(i => i.kind === 'vocabulary')).toHaveLength(47);
  expect(items.filter(i => i.kind === 'grammar')).toHaveLength(44);
  expect(new Set(practiceQuestions.map(q => q.questionId)).size).toBe(practiceQuestions.length);
  expect(practiceIds(items)).toHaveLength(91);
  for (const item of items) {
    expect(reviewedExample(item)).toBeDefined();
    const e = item.originalExample!;
    expect(e.blankSentence.replace('_____', e.answer)).toBe(e.sentenceEn);
    const id = practiceIds([item])[0];
    const basic = practiceQuestions.find(q => q.questionId === questionForMode(id, 'basic'))!;
    expect(basic.options).toHaveLength(4);
    expect(new Set(basic.options.map(o => o.text.toLowerCase())).size).toBe(4);
    expect(basic.options.filter(o => o.id === basic.answer)).toHaveLength(1);
  }
  expect(unit.relatedNotes).toHaveLength(71);
  expect(unit.learningItems.find(i => i.displayWord === 'preferable')!.originalExample.provenance).toBe('translated_from_user_chinese');
});

it('connects every official headword and its approved image/caption/meaning without granting supplementary IDs', () => {
  const cards = unit.learningItems.filter(i => i.kind === 'vocabulary');
  expect(new Set(cards.map(c => c.illustration!.path)).size).toBe(37);
  expect(cards.filter(c => c.officialWordId)).toHaveLength(45);
  for (const card of cards) {
    expect(existsSync('public/' + card.illustration!.path)).toBe(true);
    if (!card.officialWordId) {
      expect(approvedCurriculumCard(card.displayWord!)).toBeUndefined();
      continue;
    }
    const official = words.find(w => w.wordId === card.officialWordId)!;
    expect(official).toBeDefined();
    expect(bootstrap.words.find(w => w.wordId === official.wordId)).toEqual(official);
    const registered = approvedCurriculumCards(official.word, official.wordId);
    expect(registered.some(c => c.learningItemId === card.learningItemId)).toBe(true);
    const path = getWordBeastAsset(official.wordId, official.word)!;
    expect(registered.some(c => path.includes(c.illustration.path))).toBe(true);
    expect(getWordDisplaySense(official as WordRecord, []).needsReview).toBe(false);
    const exactPath = getWordBeastAsset(card.officialWordId, card.displayWord!)!;
    expect(exactPath).toContain(card.illustration!.path);
    expect(approvedCurriculumIllustration(card.displayWord!, exactPath)).toEqual(card.illustration);
  }
  expect(approvedCurriculumCard('guardian', 'W000001')).toBeUndefined();
  const combined = approvedCurriculumCards('statistic(s)', 'W003918');
  expect(combined.map(c => c.displayWord)).toEqual(['statistic','statistics']);
  expect(new Set(combined.map(c => c.targetMeaningZh)).size).toBe(2);
  expect(approvedCurriculumCard('catalogue')?.displayWord).toBe('catalog');
  expect(bootstrap.meta.counts.words).toBe(bootstrap.words.length);
});

it('retains reviewed revisions and grades inflected target forms accurately', () => {
  expect(unit.learningItems.find(i => i.displayWord === 'haste')!.illustration!.captionEn).toContain('two books');
  expect(unit.learningItems.find(i => i.displayWord === 'guardian')!.targetMeaningZh).toContain('（法定）監護人');
  for (const word of ['imitate','tolerate','guardian','torture']) expect(unit.learningItems.find(i => i.displayWord === word)!.illustration!.path).toContain('-v2.webp');
  const q = practiceQuestions.find(q => q.questionId === 'CLOZE-ORIG-LV4U18-ingredient')!;
  expect(isCorrectAnswer(q, ' Ingredients ')).toBe(true);
  expect(isCorrectAnswer(q, 'ingredient')).toBe(false);
});

it('keeps all 44 Unit18 official words in the group and exam-first workspace order', () => {
  const groupWords = workspaceWords(bootstrap.words as WordRecord[], templateGroup('LV4-U18'), 'all', '');
  expect(groupWords).toHaveLength(44);
  expect(sortWorkspaceWords(groupWords, bootstrap.examPriorities as ExamPriorityRecord[])).toHaveLength(44);
  const found = workspaceWords(bootstrap.words as WordRecord[], undefined, 'all', 'guardian');
  expect(sortWorkspaceWords(found, bootstrap.examPriorities as ExamPriorityRecord[]).map(w => w.word)).toContain('guardian');
});

it('answers all 91 items in basic mode and switches to 47 cloze plus 44 usage questions without changing SRS', async () => {
  const group = templateGroup('LV4-U18'); await saveGroup(group);
  const session = await startGroupSession(group.id);
  expect(session.questionIds).toHaveLength(91);
  for (const id of session.questionIds) {
    const q = practiceQuestions.find(q => q.questionId === id)!;
    await updateQuestion(session.id, id, { choice: q.answer });
    await submitAnswer(session.id, id); await nextQuestion(session.id);
  }
  expect(await progressDb.directAttempts.count()).toBe(91);
  expect((await progressDb.directAttempts.toArray()).every(a => a.correct && a.firstAttempt && !a.schedulingApplied)).toBe(true);
  const advanced = await switchPracticeMode(session.id, 'advanced');
  expect(advanced.questionIds.filter(id => id.startsWith('CLOZE-'))).toHaveLength(47);
  expect(advanced.questionIds.filter(id => id.startsWith('USAGE-'))).toHaveLength(44);
  expect(await progressDb.cardStates.count()).toBe(0);
});
