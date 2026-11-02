import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import type { SenseRecord, WordRecord } from '../../db/types';
import pack from './curriculumLV4Unit20.json';
import revision from './practiceTextRevisionsLV4Unit20.json';
import authored from './optionContextRationalesLV4Unit20Batch3.json';
import { optionContextRationales } from './optionContextRationales';
import { optionExplanation } from './optionExplanation';
import { practiceQuestions, isCorrectAnswer, type PracticeQuestion } from './model';
import dictionary from '../../../public/data/v1/sa-pack.json';
import { releasedUnit20BeforePracticeRevision } from './lv4U20PracticeRevision.testSupport';

const words = dictionary.words as WordRecord[], senses = dictionary.senses as SenseRecord[];
const before = releasedUnit20BeforePracticeRevision();
const question = (id: string) => practiceQuestions.find(q => q.questionId === id)!;
const normalize = (s: string) => s.trim().normalize('NFKC').toLowerCase();
function permutations<T>(rows: T[]): T[][] {
  return rows.length ? rows.flatMap((row, i) => permutations(rows.filter((_, j) => i !== j)).map(rest => [row, ...rest])) : [[]];
}

it('adds nine contexts/36 reasons while preserving the previous sixteen records and all identities', () => {
  expect(authored).toHaveLength(9);
  expect(optionContextRationales).toHaveLength(25);
  expect(new Set(optionContextRationales.map(r => r.questionId)).size).toBe(25);
  expect(optionContextRationales.slice(16)).toEqual(authored);
  expect(pack.questions).toHaveLength(128);
  expect(pack.learningItems).toHaveLength(82);
  for (const q of pack.questions) {
    const old = before.questions.find(r => r.questionId === q.questionId)!;
    expect(old).toBeDefined();
    expect(q.options).toEqual(old.options);
    expect(q.answer).toBe(old.answer);
  }
});

it.each(authored)('renders four supported meanings/reasons for $questionId', record => {
  const q = question(record.questionId);
  expect(q.sentenceEn).toBe(record.sentenceEn);
  expect(q.options.find(o => o.id === q.answer)?.text).toBe(record.answerText);
  expect(Object.keys(record.options).sort()).toEqual(q.options.map(o => normalize(o.text)).sort());
  expect(new Set(Object.values(record.options)).size).toBe(4);
  for (const o of q.options) {
    const result = optionExplanation(q, o, words, senses);
    expect(result).toMatchObject({ source: 'authored-context', rationale: record.options[normalize(o.text) as keyof typeof record.options] });
    expect(result.meaning).not.toBe('字義尚未收錄');
    expect(result.rationale).toMatch(/名詞|形容詞|副詞|動詞/);
    expect(result.rationale).not.toMatch(/^(此處應使用|正解：)/);
  }
});

it.each(authored)('retains text/answer alignment in all24 shuffles for $questionId', record => {
  const original = question(record.questionId);
  for (const rows of permutations(original.options)) {
    const options = rows.map((o, i) => ({ ...o, id: 'ABCD'[i] }));
    const q: PracticeQuestion = { ...original, options, answer: options.find(o => o.text === record.answerText)!.id };
    for (const o of options) {
      expect(optionExplanation(q, o, words, senses).rationale).toBe(record.options[normalize(o.text) as keyof typeof record.options]);
      expect(isCorrectAnswer(q, o.id)).toBe(o.text === record.answerText);
    }
  }
});

it.each(authored)('fails closed after context, identity, answer or option changes in $questionId', record => {
  const q = question(record.questionId), correct = q.options.find(o => o.id === q.answer)!;
  for (const changed of [
    { ...q, sentenceEn: q.sentenceEn + ' Another context.' },
    { ...q, questionId: q.questionId + '-other' },
    { ...q, answer: q.options.find(o => o.id !== q.answer)!.id },
  ]) expect(optionExplanation(changed, correct, words, senses).source).toBe('question-context');
  expect(optionExplanation(q, { id: 'E', text: 'zz-unknown', rationaleZh: '' }, words, senses)).toMatchObject({ source: 'question-context', meaning: '字義尚未收錄' });
});

it('synchronizes exactly five examples/cloze/choice texts and separately versions their provenance', () => {
  expect(revision.changes.map(c => c.learningItemId)).toEqual(['interact', 'interactive', 'learned', 'passive', 'partnership'].map(w => 'LI-LV4U20-' + w));
  expect(pack.template.revision).toBe(revision.revision);
  for (const c of revision.changes) {
    const i = pack.learningItems.find(i => i.learningItemId === c.learningItemId)!;
    expect(i.originalExample).toEqual(c.after);
    expect(c.after.blankSentence.replace('_____', c.after.answer)).toBe(c.after.sentenceEn);
    expect(c.after.blankSentence.match(/_____/g)).toHaveLength(1);
    expect(c.after.answer).toBe(c.before.answer);
    expect(c.after.answerForms).toEqual(c.before.answerForms);
    expect(createHash('sha256').update(JSON.stringify([c.after.sentenceEn, c.after.sentenceZh, c.after.blankSentence])).digest('hex')).toBe(c.textSha256);
    const cloze = question('CLOZE-' + c.after.workExampleId), choice = question('CHOICE-CLOZE-' + c.after.workExampleId);
    for (const q of [cloze, choice]) {
      expect(q.sentenceEn).toBe(c.after.sentenceEn);
      expect(q.sentenceZh).toBe(c.after.sentenceZh);
      expect(q.stem.split('\n')[0]).toBe(c.after.blankSentence);
      expect(q.stem).toBe(c.after.blankSentence + '\n（' + q.targetMeaningZh + '）');
    }
    expect(isCorrectAnswer(cloze, c.before.answer)).toBe(true);
  }
  for (const i of pack.learningItems) {
    const old = before.learningItems.find(r => r.learningItemId === i.learningItemId)!;
    expect(i.illustration).toEqual(old.illustration);
    expect(i.approval).toEqual(old.approval);
  }
  for (const word of ['interaction', 'nowadays', 'socket', 'overnight']) {
    const id = 'CHOICE-CLOZE-ORIG-LV4U20-' + word;
    expect(pack.questions.find(q => q.questionId === id)).toEqual(before.questions.find(q => q.questionId === id));
  }
});

it.each(['resign', 'resignation', 'miserable'])('keeps the uncovered %s fallback', word => {
  const q = question('CHOICE-CLOZE-ORIG-LV4U20-' + word), wrong = q.options.find(o => o.id !== q.answer)!;
  expect(optionExplanation(q, wrong, words, senses)).toMatchObject({ source: 'question-context' });
  expect(optionExplanation(q, wrong, words, senses).rationale).toContain('尚無逐項語境解析');
});

it('does not misteach grammatical alternatives as impossible or reuse new explanations for old stems', () => {
  const r = (word: string) => authored.find(r => r.questionId.endsWith('-' + word))!;
  expect(r('interaction').options.disorder).toContain('文法上可以作主詞');
  expect(r('socket').options.alcohol).toContain('放入酒精可以成立');
  expect(r('nowadays').options.overnight).toContain('不是因為 overnight 不能作副詞');
  expect(r('overnight').options.messenger).toContain('另一種句構');
  expect(r('learned').options.harsh).toContain('文法上可以成立');
  for (const c of revision.changes) {
    const q = question('CHOICE-CLOZE-' + c.before.workExampleId);
    expect(optionExplanation({ ...q, sentenceEn: c.before.sentenceEn }, q.options[0], words, senses).source).toBe('question-context');
  }
});
