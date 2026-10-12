import { LEGACY_CHALLENGE, challengeRule, qualifiedWords, rewardWord, taiwanDate, type RewardEvent, type RewardRound, type RewardWallet } from './model';

export function validRewardBackup(wallets: RewardWallet[] | undefined, rounds: RewardRound[] | undefined, events: RewardEvent[] | undefined): boolean {
  if (!Array.isArray(wallets) || !Array.isArray(rounds) || !Array.isArray(events)) return false;
  const finiteTime = (value: unknown) => typeof value === 'number' && value >= 0 && Number.isFinite(new Date(value).getTime());
  const unique = (rows: {id:string}[]) => rows.every(row=>row && typeof row.id==='string' && !!row.id) && new Set(rows.map(row=>row.id)).size===rows.length;
  if (!unique(wallets) || !unique(rounds) || !unique(events)) return false;
  if (rounds.some(round=>!finiteTime(round.startedAt) || !Number.isSafeInteger(round.questionCount) || round.questionCount<1)) return false;
  const validKind=(kind:unknown)=>['meaning-v2','fill-v2','basic-only-v2'].includes(String(kind));
  if(rounds.some(round=>round.challenge===undefined ? round.distinctWordCount!==undefined
    : !validKind(round.challenge) || !Number.isSafeInteger(round.distinctWordCount) || round.distinctWordCount!<0 || round.distinctWordCount!>round.questionCount))return false;
  for (const event of events) {
    if (!finiteTime(event.createdAt)) return false;
    if (event.kind === 'daily-check-in') {
      if (event.amount!==30 || event.taiwanDate!==taiwanDate(event.createdAt) || event.id!==`check-in:${event.taiwanDate}`) return false;
      continue;
    }
    const round=rounds.find(round=>round.id===event.roundId);
    if (!round) return false;
    if (event.kind==='answer') {
      if (typeof event.correct!=='boolean' || event.amount!==(event.correct?5:1) || typeof event.word!=='string'
        || !event.word || rewardWord(event.word)!==event.word || typeof event.referenceId!=='string' || !event.referenceId
        || !['direct','quiz','town'].includes(event.source ?? '') || !event.id.startsWith(`answer:${event.source}:`)
        || (round.challenge!==undefined ? !validKind(event.challenge) : event.challenge!==undefined && event.challenge!=='basic-only-v2')) return false;
      if (!round.id.startsWith(`${event.source}:`)) return false;
      if (event.source==='direct' && event.id!==`answer:direct:${event.referenceId}`) return false;
      if (event.source==='direct' && !event.referenceId.startsWith(`${round.id.slice('direct:'.length)}:`)) return false;
      if (event.source==='quiz' || event.source==='town') {
        const prefix=`answer:${round.id}:`, index=event.id.slice(prefix.length);
        if (!event.id.startsWith(prefix) || !/^\d+$/.test(index) || !Number.isSafeInteger(Number(index))
          || String(Number(index))!==index || Number(index)>=round.questionCount) return false;
      }
      if(event.source==='town' && (round.challenge!=='meaning-v2' || event.challenge!=='meaning-v2' || typeof event.choiceWordId!=='string' || !event.choiceWordId || !/^[1-9]\d*$/.test(event.referenceId)))return false;
    } else if (event.kind==='round-bonus') {
      const legacy=round.challenge===undefined && event.challenge===undefined;
      const rule=legacy ? LEGACY_CHALLENGE : event.challenge===round.challenge ? challengeRule(round.challenge) : undefined;
      if (!rule || event.id!==`bonus:${round.id}` || event.amount!==rule.amount || event.createdAt<round.startedAt || event.createdAt>round.startedAt+rule.windowMs) return false;
      const history=events.filter(answer=>answer.roundId===round.id);
      const words=legacy ? new Set(history.filter(answer=>answer.kind==='answer' && answer.challenge===undefined && answer.correct && answer.word
        && answer.createdAt>=round.startedAt && answer.createdAt<=event.createdAt).map(answer=>answer.word)) : qualifiedWords(round,history,event.createdAt);
      if (words.size<rule.words) return false;
    } else return false;
  }
  const balance=events.reduce((sum,event)=>sum+event.amount,0);
  if (!Number.isSafeInteger(balance)) return false;
  return wallets.length===0 ? balance===0 : wallets.length===1 && wallets[0].id==='local'
    && wallets[0].balance===balance && finiteTime(wallets[0].updatedAt);
}
