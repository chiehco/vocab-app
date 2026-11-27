import { describe, expect, it } from 'vitest';
import audit from '../../../docs/issue60/w2/lv3u02-permission-audit.fixture.json';
import unit from './curriculumUnit2.json';
import { BASIC_PREFIX, choiceQuestions, isCorrectAnswer, practiceQuestions } from './model';

// Characterizes the current scoring gap. It does not prove the language judgments
// in the fixture or require future fixes to preserve rejection of synonyms.
describe('Issue 60 LV3 U02 bounded permission-family audit', () => {
  it('keeps the five-case sample distinct from the full unit and earlier witch/wizard audit', () => {
    expect(audit.cases).toHaveLength(5);
    expect(new Set(audit.cases.map(c => c.questionId)).size).toBe(5);
    expect(unit.learningItems.filter(i => i.kind === 'vocabulary')).toHaveLength(138);
    expect(audit.cases.every(c => !['witch', 'wizard'].includes(c.answer))).toBe(true);
  });

  it.each(audit.cases)('$answer accepts the target and rejects the documented alternative', c => {
    const item = unit.learningItems.find(i => i.learningItemId === c.learningItemId)!;
    const q = practiceQuestions.find(q => q.questionId === c.questionId)!;
    expect(item.originalExample).toBeDefined();
    expect(item.originalExample!.workExampleId).toBe(c.workExampleId);
    expect(q.learningItemId).toBe(c.learningItemId);
    expect(q.stem).toBe(c.stem);
    expect(q.answer).toBe(c.answer);
    expect(q.targetMeaningZh).toBe(c.targetMeaningZh);
    expect(q.options).toHaveLength(0);
    expect(q.answerForms ?? []).not.toContain(c.alternative);
    expect(c.stem.match(/_____/g)).toHaveLength(1);
    expect(c.stem.replace('_____', c.answer)).toBe(c.sentenceEn);
    expect(c.stem.replace('_____', c.alternative)).toBe(c.alternativeSentence);
    expect(unit.learningItems.some(i => i.kind === 'vocabulary' && i.displayWord === c.alternative)).toBe(true);
    // Call the exported production scorer, not a copied implementation.
    expect(isCorrectAnswer(q, c.answer)).toBe(true);
    expect(isCorrectAnswer(q, c.alternative)).toBe(false);
    const basic = choiceQuestions.find(q => q.questionId === BASIC_PREFIX + c.questionId)!;
    expect(basic).toBeDefined();
    expect(basic.options.find(o => o.id === basic.answer)?.text).toBe(c.answer);
  });

  it('records the prohibit/allow choice collision without changing the stored answer', () => {
    const c = audit.cases.find(c => c.answer === 'prohibit')!;
    const basic = choiceQuestions.find(q => q.questionId === BASIC_PREFIX + c.questionId)!;
    const alternative = basic.options.find(o => o.text === 'allow')!;
    expect(alternative).toBeDefined();
    expect(isCorrectAnswer(basic, basic.answer)).toBe(true);
    expect(isCorrectAnswer(basic, alternative.id)).toBe(false);
    expect(c.stem.replace('_____', alternative.text)).toBe("The contest rules allow copying another team's design.");
  });
});
