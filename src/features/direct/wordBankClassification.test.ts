import { describe, expect, it } from 'vitest';
import { type WordBankContent } from './wordBankView';
import { startSemiGuidedWordBank, classifySemiGuidedWord, beginSemiGuidedPassage,
  chooseSemiGuidedWord, submitSemiGuidedWordBank, semiGuidedWordBankView, type WordBankPos } from './wordBankClassification';

const options = [
  { id: 'plan', pos: 'n./v.' }, { id: 'carefully', pos: 'adv.' },
  { id: 'careful', pos: 'adj.' }, { id: 'finish', pos: 'v.' },
  { id: 'time', pos: 'n.' }, { id: 'early', pos: 'adj./adv.' },
];
const answers = ['plan', 'carefully', 'careful', 'finish', 'time'];
const content: WordBankContent = {
  passage: 'They made a (1) ___, read it (2) ___, were (3) ___, tried to (4) ___ on (5) ___.',
  options,
  blanks: answers.map((answer, i) => ({ index: i + 1, answer, guideHint: 'hidden',
    optionReviews: Object.fromEntries(options.map(o => [o.id, { correct: o.id === answer, reasonZh: o.id + ' 解析' }])) })),
  stages: [{ id: 'semi_guided', optionIds: options.map(o => o.id), feedback: 'after_blank',
    showPos: false, showBlankHints: false }],
};

describe('semi-guided word bank classification', () => {
  it('requires completion but not correct classifications and permits edits before locking', () => {
    const initial = startSemiGuidedWordBank(content);
    let a = initial;
    expect(beginSemiGuidedPassage(a)).toBe(a);
    expect(chooseSemiGuidedWord(a, 1, 'plan')).toBe(a);
    expect(submitSemiGuidedWordBank(a)).toBe(a);
    expect(classifySemiGuidedWord(a, 'missing', 'n.')).toBe(a);
    expect(classifySemiGuidedWord(a, 'plan', 'bad' as WordBankPos)).toBe(a);
    a = classifySemiGuidedWord(a, 'plan', 'n.');
    a = classifySemiGuidedWord(a, 'plan', null);
    expect(semiGuidedWordBankView(a).classifications[0].chosen).toBeNull();
    for (const o of options) a = classifySemiGuidedWord(a, o.id, 'v.');
    expect(semiGuidedWordBankView(a).canBegin).toBe(true);
    expect(semiGuidedWordBankView(a).classifications.every(c => !('accepted' in c) && !('correct' in c))).toBe(true);
    a = beginSemiGuidedPassage(a);
    expect(a.classificationLocked).toBe(true);
    expect(classifySemiGuidedWord(a, 'time', 'n.')).toBe(a);
    expect(initial.classifications.every(c => c.chosen === null)).toBe(true);
  });

  it('keeps classification feedback separate until submission, including multi-POS and restart', () => {
    let a = startSemiGuidedWordBank(content);
    for (const o of options) a = classifySemiGuidedWord(a, o.id, 'v.');
    a = classifySemiGuidedWord(a, 'early', 'adv.');
    a = beginSemiGuidedPassage(a);
    a = chooseSemiGuidedWord(a, 1, 'plan');
    expect(semiGuidedWordBankView(a).passage.blanks[0].feedback?.correct).toBe(true);
    expect(semiGuidedWordBankView(a).classifications.every(c => !('accepted' in c))).toBe(true);
    expect(submitSemiGuidedWordBank(a)).toBe(a);
    expect(chooseSemiGuidedWord(a, 2, 'plan')).toBe(a);
    for (let i = 1; i < answers.length; i++) a = chooseSemiGuidedWord(a, i + 1, answers[i]);
    expect(semiGuidedWordBankView(a).classifications.every(c => !('correct' in c))).toBe(true);
    a = submitSemiGuidedWordBank(a);
    const view = semiGuidedWordBankView(a);
    expect(view.passage.score).toEqual({ correct: 5, total: 5 });
    expect(view.classifications[0]).toEqual({ id: 'plan', chosen: 'v.', accepted: ['n.', 'v.'], correct: true });
    expect(view.classifications[1].correct).toBe(false);
    expect(view.classifications[5].correct).toBe(true);
    expect(chooseSemiGuidedWord(a, 1, null)).toBe(a);
    expect(submitSemiGuidedWordBank(a)).toBe(a);
    const fresh = semiGuidedWordBankView(startSemiGuidedWordBank(content));
    expect(fresh.classificationLocked).toBe(false);
    expect(fresh.classifications.every(c => c.chosen === null && !('accepted' in c))).toBe(true);
  });

  it('rejects unsupported POS and invalid stage configuration without guessing', () => {
    expect(() => startSemiGuidedWordBank({ ...content, options: [{ ...options[0], pos: 'unknown' }, ...options.slice(1)] })).toThrow();
    expect(() => startSemiGuidedWordBank({ ...content, stages: [{ ...content.stages[0], showPos: true }] })).toThrow();
    expect(() => startSemiGuidedWordBank({ ...content, stages: [{ ...content.stages[0], feedback: 'after_passage_submit' }] })).toThrow();
    expect(() => startSemiGuidedWordBank({ ...content, stages: [{ ...content.stages[0], optionIds: ['plan', 'carefully'] }] })).toThrow();
  });
});
