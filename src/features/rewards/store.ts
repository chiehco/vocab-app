import { progressDb } from '../../db/progressDb';
import { challengeRule, qualifiedWords, rewardWord, taiwanDate } from './model';
import type { ChallengeKind, RewardEvent } from './model';

export const rewardTables = [progressDb.rewardLedger, progressDb.rewardWallet, progressDb.rewardRounds];

/** Called when a question is first mounted, never when choosing a practice scope. */
export async function presentRewardRound(id: string, questionCount: number, presentedAt: number, challenge:ChallengeKind='basic-only-v2', distinctWordCount=questionCount) {
  if (!id || !Number.isSafeInteger(questionCount) || questionCount < 1 || !Number.isFinite(presentedAt) || presentedAt<0
    || !['meaning-v2','fill-v2','basic-only-v2'].includes(challenge) || !Number.isSafeInteger(distinctWordCount) || distinctWordCount<0 || distinctWordCount>questionCount) throw Error('Invalid reward round');
  return progressDb.transaction('rw', progressDb.rewardRounds, async () => {
    const previous = await progressDb.rewardRounds.get(id);
    if (previous) return previous;
    const round = { id, startedAt: presentedAt, questionCount, challenge, distinctWordCount };
    await progressDb.rewardRounds.add(round);
    return round;
  });
}

async function issue(event: RewardEvent) {
  if (await progressDb.rewardLedger.get(event.id)) return;
  await progressDb.rewardLedger.add(event);
  const wallet = await progressDb.rewardWallet.get('local');
  await progressDb.rewardWallet.put({ id:'local', balance:(wallet?.balance ?? 0) + event.amount, updatedAt:event.createdAt });
}

/** Nested in the answer transaction: evidence, ledger and wallet commit or roll back together. */
export async function awardAnswer(input: { id:string; roundId:string; word:string; correct:boolean; source:'direct'|'quiz'|'town'; referenceId:string; answeredAt:number; challenge:ChallengeKind;choiceWordId?:string }) {
  return progressDb.transaction('rw', rewardTables, async () => {
    if (await progressDb.rewardLedger.get(input.id)) return;
    const round = await progressDb.rewardRounds.get(input.roundId);
    if (!round) throw Error('Reward round was not presented');
    const word = rewardWord(input.word);
    if(!word)throw Error('No rewarded word');
    await issue({id:input.id, kind:'answer', amount:input.correct ? 5 : 1, createdAt:input.answeredAt,
      roundId:input.roundId, word, correct:input.correct, source:input.source, referenceId:input.referenceId,challenge:round.challenge===undefined?'basic-only-v2':input.challenge,
      ...(input.choiceWordId ? {choiceWordId:input.choiceWordId} : {})});
    const answers = await progressDb.rewardLedger.where('roundId').equals(round.id).toArray();
    const rule=challengeRule(round.challenge);
    if (rule && input.challenge===round.challenge && input.answeredAt>=round.startedAt && input.answeredAt<=round.startedAt+rule.windowMs && qualifiedWords(round,answers).size>=rule.words)
      await issue({id:`bonus:${round.id}`,kind:'round-bonus',amount:rule.amount,createdAt:input.answeredAt,roundId:round.id,challenge:round.challenge});
  });
}

/** Explicit button action; learning checkIns and the device's local timezone are untouched. */
export async function claimDailyCheckIn(now = Date.now()) {
  const date = taiwanDate(now);
  await progressDb.transaction('rw', [progressDb.rewardLedger, progressDb.rewardWallet], async () => {
    await issue({id:`check-in:${date}`,kind:'daily-check-in',amount:30,createdAt:now,taiwanDate:date});
  });
}
