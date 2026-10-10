import {
  allQuestions,
  canonicalQuestionId,
  findUnit,
  practiceQuestions,
  questionForMode,
  type DirectAttempt,
  type LearningItem,
} from '../direct/model';

export const TOWN_UNIT = findUnit(17, 'LV4')!;
export const TOWN_ITEMS = TOWN_UNIT.items.filter(item => item.kind === 'vocabulary');

export interface TownWordProgress {
  item: LearningItem;
  /** A saved answer means practice happened; it does not prove recall or mastery. */
  attempted: boolean;
  /** Only the earliest answer, without lookup/hints, can establish this evidence. */
  firstCorrect: boolean;
  latestCorrect: boolean;
  firstHintUsed: boolean;
  latestHintUsed: boolean;
  attempts: number;
}

const townItemIds = new Set(TOWN_ITEMS.map(item => item.learningItemId));
const itemByBaseQuestion = new Map(allQuestions
  .filter(question => question.learningItemId && townItemIds.has(question.learningItemId))
  .map(question => [
    questionForMode(canonicalQuestionId(question.questionId), 'advanced'),
    question.learningItemId!,
  ]));
const itemByQuestion = new Map(practiceQuestions.flatMap(question => {
  const itemId = itemByBaseQuestion.get(questionForMode(canonicalQuestionId(question.questionId), 'advanced'));
  return itemId ? [[question.questionId, itemId] as const] : [];
}));

const usedHint = (attempt: DirectAttempt) => attempt.hintUsed || attempt.lookedUpWords.length > 0;

/** Read-only town projection. All spellings, modes and contexts join by the curriculum item ID. */
export function getTownProgress(attempts: readonly DirectAttempt[]): TownWordProgress[] {
  const byItem = new Map<string, DirectAttempt[]>();
  const seen = new Set<string>();
  for (const attempt of [...attempts].sort((a, b) => a.answeredAt - b.answeredAt || a.id.localeCompare(b.id))) {
    const itemId = itemByQuestion.get(attempt.questionId);
    if (!itemId || seen.has(attempt.id)) continue;
    seen.add(attempt.id);
    const history = byItem.get(itemId) ?? [];
    history.push(attempt);
    byItem.set(itemId, history);
  }

  return TOWN_ITEMS.map(item => {
    const history = byItem.get(item.learningItemId) ?? [];
    const first = history[0];
    const latest = history.at(-1);
    return {
      item,
      attempted: history.length > 0,
      firstCorrect: !!first?.correct && !usedHint(first),
      latestCorrect: !!latest?.correct,
      firstHintUsed: !!first && usedHint(first),
      latestHintUsed: !!latest && usedHint(latest),
      attempts: history.length,
    };
  });
}

/** The trial uses at most ten unpracticed curriculum words, without refilling from old ones. */
export function getTownNewBatch(attempts: readonly DirectAttempt[], limit = 10): LearningItem[] {
  const size = Number.isFinite(limit) ? Math.max(0, Math.min(10, Math.floor(limit))) : 10;
  return getTownProgress(attempts).filter(row => !row.attempted).slice(0, size).map(row => row.item);
}

/** These are textbook retry targets, not the SRS due queue. */
export function getTownWrongTargets(attempts: readonly DirectAttempt[]): LearningItem[] {
  return getTownProgress(attempts).filter(row => row.attempted && !row.latestCorrect).map(row => row.item);
}
