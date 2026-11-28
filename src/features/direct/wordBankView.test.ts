import { describe, expect, it } from 'vitest';
import { startWordBankAttempt, setWordBankChoice, finishWordBankAttempt, wordBankView, splitWordBankPassage, type WordBankContent } from './wordBankView';

const options = [{ id: 'plan', pos: 'n.' }, { id: 'carefully', pos: 'adv.' }, { id: 'careful', pos: 'adj.' }];
const blank = (index: number, answer: string) => ({ index, answer, guideHint: '詞性提示',
  optionReviews: Object.fromEntries(options.map(o => [o.id, { correct: o.id === answer, reasonZh: o.id + ' 解析' }])) });
const content: WordBankContent = {
  passage: 'They wrote a (1) ___ and read it (2) ___.', options,
  blanks: [blank(1, 'plan'), blank(2, 'carefully')],
  stages: [
    { id: 'guided', optionIds: ['plan', 'carefully'], feedback: 'after_blank', showPos: true, showBlankHints: true },
    { id: 'exam', optionIds: ['plan', 'careful', 'carefully'], feedback: 'after_passage_submit', showPos: false, showBlankHints: false },
  ],
};
describe('word bank view and score', () => {
  it('guided feedback reveals only offered options and clears on removal', () => {
    let a = startWordBankAttempt(content, 'guided');
    expect(wordBankView(a).options.map(o => o.id)).toEqual(['plan', 'carefully']);
    expect(wordBankView(a).blanks[0]).not.toHaveProperty('feedback');
    a = setWordBankChoice(a, 1, 'carefully');
    expect(wordBankView(a).blanks[0].feedback?.correct).toBe(false);
    expect(wordBankView(a).blanks[0].feedback?.reviews.map(r => r.id)).toEqual(['plan', 'carefully']);
    expect(setWordBankChoice(a, 2, 'carefully')).toBe(a);
    expect(wordBankView(a)).not.toHaveProperty('score');
    a = setWordBankChoice(a, 1, null);
    expect(wordBankView(a).blanks[0]).not.toHaveProperty('feedback');
    expect(wordBankView(a).options.every(o => o.available)).toBe(true);
  });
  it('exam hides hints, answers, reasons and score until complete submission', () => {
    let a = startWordBankAttempt(content, 'exam');
    expect(wordBankView(a).options.every(o => !('pos' in o))).toBe(true);
    expect(wordBankView(a).blanks.every(b => !('hint' in b))).toBe(true);
    expect(finishWordBankAttempt(a)).toBe(a);
    a = setWordBankChoice(setWordBankChoice(a, 1, 'careful'), 2, 'carefully');
    const pending = wordBankView(a);
    expect(pending.canSubmit).toBe(true);
    expect(pending).not.toHaveProperty('score');
    expect(pending.blanks.every(b => !('feedback' in b))).toBe(true);
    a = finishWordBankAttempt(a);
    expect(wordBankView(a).score).toEqual({ correct: 1, total: 2 });
    expect(wordBankView(a).blanks[0].feedback?.answer).toBe('plan');
    expect(wordBankView(a).blanks[0].feedback?.reviews).toHaveLength(3);
    expect(setWordBankChoice(a, 1, null)).toBe(a);
    expect(wordBankView(startWordBankAttempt(content, 'guided')).blanks.every(b => b.chosen === null)).toBe(true);
  });
  it('rejects mismatched answer, missing explanation, and duplicate option identity', () => {
    expect(() => startWordBankAttempt({ ...content, blanks: [blank(1, 'careful'), content.blanks[1]] }, 'guided')).toThrow();
    expect(() => startWordBankAttempt({ ...content, blanks: [{ ...content.blanks[0], optionReviews: {} }, content.blanks[1]] }, 'guided')).toThrow();
    expect(() => startWordBankAttempt({ ...content, options: [...options, options[0]] }, 'guided')).toThrow();
  });
});

describe('word bank passage contract', () => {
  it('projects ordered text and blank indices without answers and preserves surrounding text', () => {
    const a = startWordBankAttempt(content, 'exam');
    const segments = [
      { kind: 'text', text: 'They wrote a ' }, { kind: 'blank', index: 1 },
      { kind: 'text', text: ' and read it ' }, { kind: 'blank', index: 2 },
      { kind: 'text', text: '.' },
    ];
    expect(wordBankView(a).segments).toEqual(segments);
    expect(wordBankView(setWordBankChoice(a, 1, 'plan')).segments).toEqual(segments);
    expect(splitWordBankPassage('(1)   ___ and (2)___', [1, 2])).toEqual([
      { kind: 'blank', index: 1 }, { kind: 'text', text: ' and ' }, { kind: 'blank', index: 2 },
    ]);
  });
  it('rejects malformed passages before starting an attempt in either stage', () => {
    const invalid = [
      'They wrote a (1) ___.', '(1) ___ and (1) ___', '(1) ___ and (3) ___',
      '(2) ___ and (1) ___', '___ and (2) ___', '(01) ___ and (2) ___',
      '(1) ___ and (2) ___ and (3) ___', '(1) ____ and (2) ___', '   ',
      '(1) ___ and (2) ___ and ___',
    ];
    for (const stage of content.stages) {
      for (const passage of invalid) {
        expect(() => startWordBankAttempt({ ...content, passage }, stage.id)).toThrow();
      }
    }
  });
  it('rejects invalid index contracts', () => {
    for (const indices of [[], [1, 1], [0, 2], [1, 2.5], [1, Number.MAX_SAFE_INTEGER + 1]]) {
      expect(() => splitWordBankPassage(content.passage, indices)).toThrow();
    }
  });
});
