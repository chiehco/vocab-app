import { allQuestions, canonicalQuestionId, learningItems, questionForMode, practiceQuestions } from '../direct/model';
import type { ChallengeKind } from './model';

/** Resolve variants/choice IDs back to the actual textbook vocabulary item, not a grammar label. */
export function directRewardWord(questionId: string): string | undefined {
  const original = allQuestions.find(question=>question.questionId===questionForMode(canonicalQuestionId(questionId),'advanced'));
  const item = learningItems.find(item=>item.learningItemId===original?.learningItemId);
  return item?.kind==='vocabulary' ? item.displayWord ?? undefined : undefined;
}
export function directChallenge(questionId:string): ChallengeKind {
  const question=practiceQuestions.find(q=>q.questionId===questionId);
  return directRewardWord(questionId) && question?.options.length===0 ? 'fill-v2' : 'basic-only-v2';
}
export function directRoundChallenge(questionIds:string[]): ChallengeKind {
  const eligible=questionIds.filter(id=>!!directRewardWord(id));
  return eligible.length && eligible.every(id=>directChallenge(id)==='fill-v2') ? 'fill-v2' : 'basic-only-v2';
}
