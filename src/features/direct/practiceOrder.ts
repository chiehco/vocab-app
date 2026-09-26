import { canonicalQuestionId, questionForMode, type DirectAttempt, type PracticeMode } from './model';

/** Cover the full scope; prioritize unseen / least-practiced questions, shuffle ties. */
export function orderPracticeScope(scope: string[], attempts: DirectAttempt[], mode: PracticeMode, random = Math.random) {
  const ids = [...new Set(scope.map(id => questionForMode(canonicalQuestionId(id), mode)))];
  const counts = new Map<string, number>();
  for (const a of attempts) {
    const key = canonicalQuestionId(a.questionId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0));
}
