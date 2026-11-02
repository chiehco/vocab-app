import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import type { WordRecord, SenseRecord } from '../../db/types';
import { releasedUnit20BeforePracticeRevision } from './lv4U20PracticeRevision.testSupport';
import previous from './optionContextRationalesLV4Unit20.json';
import authored from './optionContextRationalesLV4Unit20Batch2.json';
import dictionary from '../../../public/data/v1/sa-pack.json';
import { optionContextRationales } from './optionContextRationales';
import { optionExplanation } from './optionExplanation';
import { isCorrectAnswer, practiceQuestions, type PracticeQuestion } from './model';

const words = dictionary.words as WordRecord[], senses = dictionary.senses as SenseRecord[];
const ids = ['disorder', 'freshman', 'harsh', 'privacy', 'sway', 'dense', 'alcohol', 'messenger', 'equality', 'bargain'].map(w => `CHOICE-CLOZE-ORIG-LV4U20-${w}`);
const question = (id: string) => practiceQuestions.find(q => q.questionId === id)!;
const normalize = (text: string) => text.trim().normalize('NFKC').toLowerCase();
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(row).sort().map(k => [k, stable(row[k])]));
  }
  return value;
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
function permutations<T>(rows: T[]): T[][] {
  return rows.length ? rows.flatMap((row, i) => permutations(rows.filter((_, j) => i !== j)).map(rest => [row, ...rest])) : [[]];
}

it('adds exactly ten distinct contexts after the six existing authored questions', () => {
  expect(authored.map(r => r.questionId)).toEqual(ids);
  expect(optionContextRationales).toHaveLength(25);
  expect(new Set(optionContextRationales.map(r => r.questionId)).size).toBe(25);
  expect(optionContextRationales.slice(1, 6)).toEqual(previous);
  expect(optionContextRationales.slice(6, 16)).toEqual(authored);
});

it.each(authored)('renders all four meanings and distinct context reasons for $questionId', record => {
  const q = question(record.questionId);
  expect(q.sentenceEn).toBe(record.sentenceEn);
  expect(q.options.find(o => o.id === q.answer)?.text).toBe(record.answerText);
  expect(Object.keys(record.options).sort()).toEqual(q.options.map(o => normalize(o.text)).sort());
  const rows = q.options.map(o => optionExplanation(q, o, words, senses));
  expect(new Set(rows.map(r => r.rationale)).size).toBe(4);
  for (const [i, result] of rows.entries()) {
    const text = normalize(q.options[i].text) as keyof typeof record.options;
    expect(result).toMatchObject({ source: 'authored-context', rationale: record.options[text] });
    expect(result.meaning).not.toBe('字義尚未收錄');
    expect(result.meaning).toMatch(/[\u3400-\u9fff]/);
    expect(result.rationale).toMatch(/名詞|形容詞|副詞|動詞/);
    expect(result.rationale).not.toMatch(/^(此處應使用|正解：)/);
  }
});

it.each(authored)('keeps each rationale and answer aligned in all 24 shuffles of $questionId', record => {
  const original = question(record.questionId);
  for (const rows of permutations(original.options)) {
    const options = rows.map((o, i) => ({ ...o, id: 'ABCD'[i] }));
    const q: PracticeQuestion = { ...original, options, answer: options.find(o => o.text === record.answerText)!.id };
    for (const option of options) {
      expect(optionExplanation(q, option, words, senses)).toMatchObject({ source: 'authored-context', rationale: record.options[normalize(option.text) as keyof typeof record.options] });
      expect(isCorrectAnswer(q, option.id)).toBe(option.text === record.answerText);
    }
  }
});

it.each(authored)('fails closed for changed context, identity, answer or unknown option in $questionId', record => {
  const q = question(record.questionId), correct = q.options.find(o => o.id === q.answer)!;
  for (const changed of [
    { ...q, questionId: q.questionId + '-different' },
    { ...q, sentenceEn: q.sentenceEn + ' Another setting.' },
    { ...q, answer: q.options.find(o => o.id !== q.answer)!.id },
  ]) expect(optionExplanation(changed, correct, words, senses).source).toBe('question-context');
  expect(optionExplanation(q, { id: 'E', text: 'zz-unknown', rationaleZh: '' }, words, senses)).toMatchObject({ source: 'question-context', meaning: '字義尚未收錄' });
});

it.each(['resign', 'resignation', 'miserable'])('leaves the uncovered %s question on its original honest fallback', word => {
  const q = question(`CHOICE-CLOZE-ORIG-LV4U20-${word}`), wrong = q.options.find(o => o.id !== q.answer)!;
  expect(optionContextRationales.some(r => r.questionId === q.questionId)).toBe(false);
  expect(optionExplanation(q, wrong, words, senses)).toMatchObject({ source: 'question-context' });
  expect(optionExplanation(q, wrong, words, senses).rationale).toContain('尚無逐項語境解析');
});

it('preserves the complete original unit and the previous five authored records without removing fields', () => {
  expect(hash(releasedUnit20BeforePracticeRevision())).toBe('9a1fbe3f45067d7d0a80074f707efc0f036e93a446933e4d1cef52a2d866b9e0');
  expect(hash(previous)).toBe('8931f944af5a061ea024fa17499427c5a6c4d1e1cbecee72b569ac2b71fcda9d');
});

it('retains polysemy rather than declaring overnight or learned can never be verbs', () => {
  expect(authored.find(r => r.questionId.endsWith('-sway'))!.options.overnight).toContain('作動詞時也可指「過夜」');
  expect(authored.find(r => r.questionId.endsWith('-disorder'))!.options.learned).toContain('learn 的過去式');
  expect(authored.find(r => r.questionId.endsWith('-equality'))!.options.resignation).toContain('無奈地接受');
});
