import { describe, expect, it } from 'vitest';
import audit from '../../../docs/issue60/w2/lv3u02-permission-audit.fixture.json';
import unit from './curriculumUnit2.json';
import { BASIC_PREFIX, choiceQuestions, findUnit, isCorrectAnswer, practiceQuestions, type LearningItem } from './model';
import { applyU02PracticeRevision } from './lv3U02PracticeRevision';

// Characterizes the current scoring gap. It does not prove the language judgments
// in the fixture or require future fixes to preserve rejection of synonyms.
const prohibitRevision = {
  stem: "The contest rules _____ copying another team's design; any team that copies is disqualified.",
  sentenceEn: "The contest rules prohibit copying another team's design; any team that copies is disqualified.",
  sentenceZh: "比賽規則禁止抄襲其他隊伍的設計；任何抄襲的隊伍都會被取消資格。",
  alternativeSentence: "The contest rules ban copying another team's design; any team that copies is disqualified.",
};

// Keep the original fixture as historical audit evidence; only the live 006
// expectations change. The open target-recall ambiguity remains unresolved.
const currentCases = audit.cases.map(c => c.answer === 'prohibit' ? { ...c, ...prohibitRevision } : c);
const liveItems = findUnit(2, 'LV3')!.items;

describe('Issue 60 LV3 U02 bounded permission-family audit', () => {
  it('keeps the five-case sample distinct from the full unit and earlier witch/wizard audit', () => {
    expect(audit.cases).toHaveLength(5);
    expect(new Set(audit.cases.map(c => c.questionId)).size).toBe(5);
    expect(unit.learningItems.filter(i => i.kind === 'vocabulary')).toHaveLength(138);
    expect(audit.cases.every(c => !['witch', 'wizard'].includes(c.answer))).toBe(true);
  });

  it.each(currentCases)('$answer accepts the target and rejects the documented alternative', c => {
    const item = liveItems.find(i => i.learningItemId === c.learningItemId)!;
    const q = practiceQuestions.find(q => q.questionId === c.questionId)!;
    expect(item.originalExample).toBeDefined();
    expect(item.originalExample!.workExampleId).toBe(c.workExampleId);
    expect(q.learningItemId).toBe(c.learningItemId);
    expect(q.stem).toBe(c.stem);
    expect(item.originalExample!.sentenceEn).toBe(c.sentenceEn);
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


  it('preserves the sealed source and projects exactly one original example without changing IDs', () => {
    const c = audit.cases.find(c => c.answer === 'prohibit')!;
    const raw = unit.learningItems.find(i => i.learningItemId === c.learningItemId)! as LearningItem;
    const live = liveItems.find(i => i.learningItemId === c.learningItemId)!;
    expect(raw.originalExample!.sentenceEn).toBe(c.sentenceEn);
    expect(raw.originalExample!.blankSentence).toBe(c.stem);
    expect(live).toEqual({
      ...raw,
      originalExample: {
        ...raw.originalExample!,
        sentenceEn: prohibitRevision.sentenceEn,
        sentenceZh: prohibitRevision.sentenceZh,
        blankSentence: prohibitRevision.stem,
      },
    });
    expect(liveItems.filter((item, index) => item !== unit.learningItems[index]).map(i => i.learningItemId)).toEqual([c.learningItemId]);
    expect(applyU02PracticeRevision(live)).toBe(live);
    const drifted = { ...raw, originalExample: { ...raw.originalExample!, sentenceEn: 'A later revision.' } };
    expect(applyU02PracticeRevision(drifted)).toBe(drifted);
    expect(raw.originalExample!.sentenceEn).toBe(c.sentenceEn);
  });

  it('keeps historical 006 evidence and verifies the revised live four-choice context', () => {
    const c = audit.cases.find(c => c.answer === 'prohibit')!;
    const basic = choiceQuestions.find(q => q.questionId === BASIC_PREFIX + c.questionId)!;
    const alternative = basic.options.find(o => o.text === 'allow')!;
    expect(alternative).toBeDefined();
    expect(basic.stem).toBe(prohibitRevision.stem);
    expect(basic.options.map(o => o.text)).toEqual(['drill', 'remain', 'prohibit', 'allow']);
    const item = liveItems.find(i => i.learningItemId === c.learningItemId)!;
    expect(item.originalExample!.sentenceZh).toBe(prohibitRevision.sentenceZh);
    expect(isCorrectAnswer(basic, basic.answer)).toBe(true);
    expect(isCorrectAnswer(basic, alternative.id)).toBe(false);
    expect(c.stem.replace('_____', alternative.text)).toBe("The contest rules allow copying another team's design.");
    expect(basic.stem.replace('_____', alternative.text)).toBe("The contest rules allow copying another team's design; any team that copies is disqualified.");
  });
});
