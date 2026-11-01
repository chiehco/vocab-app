import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import type { WordRecord, SenseRecord } from '../../db/types';
import pack from './curriculumLV4Unit20.json';
import authored from './optionContextRationalesLV4Unit20.json';
import dictionary from '../../../public/data/v1/sa-pack.json';
import { optionContextRationales } from './optionContextRationales';
import { optionExplanation } from './optionExplanation';
import { isCorrectAnswer, practiceQuestions, type PracticeQuestion } from './model';

const words = dictionary.words as WordRecord[];
const senses = dictionary.senses as SenseRecord[];
const question = (id: string) => practiceQuestions.find(q => q.questionId === id)!;
const ids = ['cube', 'cubic', 'murmur', 'biography', 'autobiography'].map(w => `CHOICE-CLOZE-ORIG-LV4U20-${w}`);
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(row).sort().map(k => [k, stable(row[k])]));
  }
  return value;
}
function permutations<T>(rows: T[]): T[][] {
  return rows.length ? rows.flatMap((row, i) => permutations(rows.filter((_, j) => i !== j)).map(rest => [row, ...rest])) : [[]];
}

it('adds exactly five contexts while retaining the existing ferry record', () => {
  expect(authored.map(r => r.questionId)).toEqual(ids);
  expect(new Set(optionContextRationales.map(r => r.questionId)).size).toBe(6);
  expect(optionContextRationales).toHaveLength(6);
  expect(optionContextRationales[0].questionId).toBe('CHOICE-CLOZE-ORIG-LV4U20-ferry');
});

it.each(authored)('binds all four meanings and distinct explanations for $questionId', record => {
  const q = question(record.questionId);
  expect(practiceQuestions.filter(row => row.questionId === q.questionId)).toHaveLength(1);
  expect(q.sentenceEn).toBe(record.sentenceEn);
  expect(q.options.find(o => o.id === q.answer)?.text).toBe(record.answerText);
  expect(Object.keys(record.options).sort()).toEqual(q.options.map(o => o.text).sort());
  const results = q.options.map(o => optionExplanation(q, o, words, senses));
  expect(new Set(results.map(r => r.rationale)).size).toBe(4);
  for (const [index, result] of results.entries()) {
    expect(result.source).toBe('authored-context');
    expect(result.meaning).not.toBe('字義尚未收錄');
    expect(result.meaning).toMatch(/[\u3400-\u9fff]/);
    expect(result.rationale).toBe(record.options[q.options[index].text as keyof typeof record.options]);
    expect(result.rationale).not.toMatch(/^(此處應使用|正解：)/);
  }
});

it.each(authored)('keeps text/answer alignment through all24 permutations of $questionId', record => {
  const original = question(record.questionId);
  for (const rows of permutations(original.options)) {
    const options = rows.map((o, i) => ({ ...o, id: 'ABCD'[i] }));
    const q: PracticeQuestion = { ...original, options, answer: options.find(o => o.text === record.answerText)!.id };
    for (const option of options) {
      expect(optionExplanation(q, option, words, senses).rationale).toBe(record.options[option.text as keyof typeof record.options]);
      expect(isCorrectAnswer(q, option.id)).toBe(option.text === record.answerText);
    }
  }
});

it.each(authored)('does not reuse $questionId for a changed sentence, answer, ID or unknown option', record => {
  const q = question(record.questionId), correct = q.options.find(o => o.id === q.answer)!;
  for (const changed of [
    { ...q, sentenceEn: q.sentenceEn + ' Different context.' },
    { ...q, questionId: q.questionId + '-other' },
    { ...q, answer: q.options.find(o => o.id !== q.answer)!.id },
  ]) expect(optionExplanation(changed, correct, words, senses).source).toBe('question-context');
  expect(optionExplanation(q, { id: 'E', text: 'zz-unknown', rationaleZh: '' }, words, senses)).toMatchObject({
    source: 'question-context', meaning: '字義尚未收錄',
  });
});

it('retains honest fallback for the uncovered interact question', () => {
  const q = question('CHOICE-CLOZE-ORIG-LV4U20-interact');
  const wrong = q.options.find(o => o.id !== q.answer)!;
  expect(optionExplanation(q, wrong, words, senses)).toMatchObject({ source: 'question-context' });
  expect(optionExplanation(q, wrong, words, senses).rationale).toContain('尚無逐項語境解析');
});

it('uses the existing optional gloss for cubes without inventing an inflection link', () => {
  const q = question(ids[0]), option = q.options.find(o => o.text === 'cubes')!;
  expect(option.meaningZh).toBe('n. 立方體；方塊（cube 的複數）');
  expect(optionExplanation(q, option, [], []).meaning).toBe(option.meaningZh);
  expect(dictionary.words.some(w => w.word === 'cubes')).toBe(false);
});

it('retains all original unit text, IDs, options, answers, items and media apart from the one explicit gloss', () => {
  const original = structuredClone(pack);
  const q = original.questions.find(q => q.questionId === ids[0])!;
  delete (q.options[0] as { meaningZh?: string }).meaningZh;
  const hash = createHash('sha256').update(JSON.stringify(stable(original))).digest('hex');
  expect(hash).toBe('39f9a730ac5964d94ddf9b976e21e86a123e37d0ca65e7f56ed499771e120edf');
});

it('uses a/an instead of inventing author identity and does not prohibit interaction in quiet libraries', () => {
  const biography = authored.find(r => r.questionId === ids[3])!;
  expect(biography.options.autobiography).toContain('原句未交代她是否在寫自己');
  expect(biography.options.autobiography).toContain('前面要用 an，不能接本句的 a');
  expect(biography.options.interaction).toContain('前面應用 an，不能接本句的 a');
  const murmur = authored.find(r => r.questionId === ids[2])!;
  expect(murmur.options.interact).toContain('interact with each other');
  expect(murmur.options.interact).toContain('to each other');
  expect(murmur.options.interact).not.toMatch(/圖書館.*不能.*互動/);
});
