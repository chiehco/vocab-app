import { describe, expect, it } from 'vitest';
import {
  allQuestions, canonicalQuestionId, practiceQuestions, questionForMode,
  REVISION, variantQuestions, type DirectAttempt,
} from '../direct/model';
import { practiceIds } from '../vocabulary/model';
import { getTownNewBatch, getTownProgress, getTownWrongTargets, TOWN_ITEMS, TOWN_UNIT } from './townModel';

const ids = practiceIds(TOWN_ITEMS);
function answer(questionId: string, sequence: number, changes: Partial<DirectAttempt> = {}): DirectAttempt {
  return {
    id: `session-${sequence}:${questionId}`, sessionId: `session-${sequence}`, questionId,
    revision: REVISION, choice: 'A', correct: true, firstAttempt: true,
    hintUsed: false, lookedUpWords: [], answeredAt: sequence, schedulingApplied: false,
    ...changes,
  };
}
const rowFor = (attempts: DirectAttempt[], index = 0) => getTownProgress(attempts)[index];

describe('textbook town progress', () => {
  it('keeps all 46 curriculum identities, including the three without official word IDs', () => {
    expect(TOWN_UNIT.level).toBe('LV4');
    expect(TOWN_UNIT.unit).toBe(17);
    expect(TOWN_ITEMS).toHaveLength(46);
    expect(new Set(TOWN_ITEMS.map(item => item.learningItemId)).size).toBe(46);
    expect(TOWN_ITEMS.filter(item => item.officialWordId)).toHaveLength(43);
    expect(TOWN_ITEMS.filter(item => !item.officialWordId).map(item => item.displayWord))
      .toEqual(['reluctance', 'frustrated', 'frustrating']);
    const progress = getTownProgress([]);
    expect(progress).toHaveLength(46);
    expect(progress.every(row => !row.attempted && !row.firstCorrect && !row.latestCorrect && row.attempts === 0)).toBe(true);
  });

  it('counts actual partial work, leaves untouched words empty and does not mutate the evidence', () => {
    const attempts = [answer(questionForMode(ids[1], 'basic'), 2), answer(ids[0], 1, { correct: false })];
    const before = structuredClone(attempts);
    const rows = getTownProgress(attempts);
    expect(rows.filter(row => row.attempted)).toHaveLength(2);
    expect(rows[0]).toMatchObject({ attempted: true, firstCorrect: false, latestCorrect: false, attempts: 1 });
    expect(rows[1]).toMatchObject({ attempted: true, firstCorrect: true, latestCorrect: true, attempts: 1 });
    expect(attempts).toEqual(before);
  });

  it('joins basic, spelling and rotated contexts into one house without overwriting the first wrong answer', () => {
    const variant = variantQuestions.find(question => question.questionId.startsWith('CLOZE-')
      && canonicalQuestionId(question.questionId) === ids[0])!;
    expect(variant).toBeDefined();
    const attempts = [
      answer(questionForMode(variant.questionId, 'basic'), 3),
      answer(questionForMode(ids[0], 'basic'), 1, { correct: false }),
      answer(ids[0], 2),
    ];
    expect(rowFor(attempts)).toMatchObject({ attempted: true, firstCorrect: false, latestCorrect: true, attempts: 3 });
    expect(getTownProgress(attempts).filter(row => row.attempted)).toHaveLength(1);
    expect(getTownWrongTargets(attempts)).toEqual([]);
  });

  it('keeps hinted correctness separate from an independent first correct answer', () => {
    const first = answer(ids[0], 1, { hintUsed: true, lookedUpWords: ['elementary'] });
    expect(rowFor([first])).toMatchObject({ attempted: true, firstCorrect: false, latestCorrect: true, firstHintUsed: true, latestHintUsed: true });
    expect(rowFor([first, answer(ids[0], 2)])).toMatchObject({ firstCorrect: false, latestCorrect: true, firstHintUsed: true, latestHintUsed: false });
    // Imported evidence with an explicit lookup must not be credited as unassisted even if its flag disagrees.
    expect(rowFor([answer(ids[0], 1, { lookedUpWords: ['[首字母提示]'] })]).firstCorrect).toBe(false);
  });

  it('never removes a practiced building after a later mistake; the retry list uses the latest answer', () => {
    const attempts = [answer(ids[0], 1), answer(ids[0], 2, { correct: false })];
    expect(rowFor(attempts)).toMatchObject({ attempted: true, firstCorrect: true, latestCorrect: false });
    expect(getTownWrongTargets(attempts).map(item => item.learningItemId)).toEqual([TOWN_ITEMS[0].learningItemId]);
    expect(getTownWrongTargets([...attempts, answer(ids[0], 3)])).toEqual([]);
  });

  it('repeated answers and duplicate evidence cannot create additional buildings', () => {
    const repeated = Array.from({ length: 20 }, (_, index) => answer(ids[0], index));
    const rows = getTownProgress([...repeated, repeated[0], repeated[4]]);
    expect(rows.filter(row => row.attempted)).toHaveLength(1);
    expect(rows[0].attempts).toBe(20);
    expect(getTownNewBatch(repeated)).toHaveLength(10);
    expect(getTownNewBatch(repeated).some(item => item.learningItemId === TOWN_ITEMS[0].learningItemId)).toBe(false);
  });

  it('selects at most ten unpracticed items and never fills the final batch with practiced words', () => {
    expect(getTownNewBatch([])).toEqual(TOWN_ITEMS.slice(0, 10));
    expect(getTownNewBatch([], 30)).toHaveLength(10);
    expect(getTownNewBatch([], 3.8)).toHaveLength(3);
    expect(getTownNewBatch([], -1)).toEqual([]);
    const attempts = ids.slice(0, 43).map((id, index) => answer(id, index));
    expect(getTownNewBatch(attempts)).toEqual(TOWN_ITEMS.slice(43));
    expect(getTownNewBatch(ids.map((id, index) => answer(id, index)))).toEqual([]);
  });

  it('does not award buildings for grammar, other units, unknown questions or matching word strings', () => {
    const grammar = TOWN_UNIT.items.find(item => item.kind !== 'vocabulary')!;
    const grammarQuestion = allQuestions.find(question => question.learningItemId === grammar.learningItemId)!;
    const other = practiceQuestions.find(question => question.learningItemId?.startsWith('LI-LV4U18-'))!;
    expect(grammarQuestion).toBeDefined();
    expect(other).toBeDefined();
    const attempts = [answer(grammarQuestion.questionId, 1), answer(other.questionId, 2), answer('elementary', 3)];
    expect(getTownProgress(attempts).every(row => !row.attempted)).toBe(true);
  });

  it('practices supplemental entries and catalog by learning-item identity without inventing an SRS link', () => {
    const selected = TOWN_ITEMS.filter(item => !item.officialWordId || item.displayWord === 'catalog');
    expect(selected).toHaveLength(4);
    const attempts = practiceIds(selected).map((id, index) => answer(questionForMode(id, 'basic'), index));
    const built = getTownProgress(attempts).filter(row => row.attempted);
    expect(built.map(row => row.item.learningItemId)).toEqual(selected.map(item => item.learningItemId));
    expect(built.filter(row => !row.item.officialWordId)).toHaveLength(3);
    expect(attempts.every(attempt => attempt.schedulingApplied === false)).toBe(true);
  });
});
