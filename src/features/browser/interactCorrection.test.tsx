import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { WordRecord, SenseRecord } from '../../db/types';
import dictionaryWords from '../../../public/data/v1/words.json';
import dictionarySenses from '../../../public/data/v1/senses.json';
import starter from '../../../public/data/v1/sa-pack.json';
import correction from '../../../scripts/corrections/interact-summary-20261031.json';
import { practiceQuestions } from '../direct/model';
import { optionExplanation } from '../direct/optionExplanation';
import { optionContextRationales } from '../direct/optionContextRationales';
import { recordedMeanings, recordedSummary } from './meaningRecords';
import RecordedMeanings from './RecordedMeanings';

// Conditional acceptance: candidate rows only. Production JSON is intentionally
// unchanged until the latest source workbook is located and corrected first.
const corrected = (words: WordRecord[]) => words.map(word => word.wordId === 'W003558'
  ? { ...word, meaningZh: correction.after } : word);

it.each([
  ['full', dictionaryWords, dictionarySenses],
  ['starter', starter.words, starter.senses],
] as const)('renders the staged %s card with existing curriculum meaning and unchanged identity/status', (_name, rawWords, rawSenses) => {
  const words = corrected(rawWords as WordRecord[]), senses = rawSenses as SenseRecord[];
  const word = words.find(row => row.wordId === 'W003558')!;
  expect(word).toEqual({ ...correction.publishedWordBefore, meaningZh: correction.after });
  expect(senses.filter(row => row.wordId === word.wordId)).toEqual([]);
  expect(recordedSummary(word, senses)).toBe('互相影響；交互作用');
  expect(recordedMeanings(word, senses)).toContainEqual(expect.objectContaining({
    pos: 'v.', meaning: '互動', source: 'curriculum', pending: false,
  }));
  const html = renderToStaticMarkup(<RecordedMeanings word={word} senses={senses} />);
  expect(html).toContain('互動');
  expect(html).toContain('互相影響；交互作用');
  expect(html).not.toMatch(/幕間劇|幕間休息/);
  expect(word.status).toBe('draft');
});

it('uses the staged dictionary for every interact option without changing any question or authored rationale', () => {
  const before = JSON.stringify({ practiceQuestions, optionContextRationales, dictionaryWords, starter });
  const words = corrected(dictionaryWords as WordRecord[]);
  const questions = practiceQuestions.filter(q => q.sourceType === 'original_target_word_choice'
    && q.options.some(option => option.text === 'interact'));
  expect(questions.length).toBeGreaterThanOrEqual(4);
  for (const question of questions) {
    const option = question.options.find(row => row.text === 'interact')!;
    const explanation = optionExplanation(question, option, words, dictionarySenses as SenseRecord[]);
    expect(explanation.meaning).toContain('互動');
    expect(explanation.meaning).toContain('互相影響；交互作用');
    expect(explanation.meaning).not.toMatch(/幕間劇|幕間休息/);
    const authored = optionContextRationales.find(row => row.questionId === question.questionId);
    if (authored?.options.interact) {
      expect(explanation.source).toBe('authored-context');
      expect(explanation.rationale).toBe(authored.options.interact);
    }
  }
  expect(JSON.stringify({ practiceQuestions, optionContextRationales, dictionaryWords, starter })).toBe(before);
});
