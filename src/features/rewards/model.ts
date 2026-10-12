export interface RewardWallet { id: 'local'; balance: number; updatedAt: number }
export type ChallengeKind = 'meaning-v2' | 'fill-v2' | 'basic-only-v2';
export interface RewardRound { id: string; startedAt: number; questionCount: number; challenge?: ChallengeKind; distinctWordCount?: number }
export interface RewardEvent {
  id: string; kind: 'answer' | 'round-bonus' | 'daily-check-in'; amount: number; createdAt: number;
  roundId?: string; word?: string; correct?: boolean; source?: 'direct' | 'quiz' | 'town'; referenceId?: string;
  choiceWordId?: string;
  taiwanDate?: string;
  challenge?: ChallengeKind;
}
export interface QuizRewardContext { index: number }
export interface QuizRewardVerdict { correct:boolean; duplicate:boolean; score:number; wrongWords:string[] }
export const CHALLENGES = {
  'meaning-v2': {label:'單字辨義',windowMs:30_000,words:10,amount:30},
  'fill-v2': {label:'填空',windowMs:180_000,words:15,amount:60},
} as const;
export const quizChallenge = (mode: string): ChallengeKind => mode==='w2m' || mode==='quiz-w2m' ? 'meaning-v2' : mode==='fill' || mode==='fill-blank' ? 'fill-v2' : 'basic-only-v2';
export const challengeRule = (kind?: ChallengeKind) => kind && kind!=='basic-only-v2' ? CHALLENGES[kind] : undefined;
/** Only v6 historical bonuses use the superseded policy; never used to issue a new bonus. */
export const LEGACY_CHALLENGE = {windowMs:180_000,words:15,amount:30};
export function qualifiedWords(round:RewardRound, events:RewardEvent[], until = Infinity) {
  const rule=challengeRule(round.challenge);
  if (!rule) return new Set<string>();
  return new Set(events.filter(event=>event.kind==='answer' && event.correct && event.word && event.challenge===round.challenge
    && event.createdAt>=round.startedAt && event.createdAt<=Math.min(until,round.startedAt+rule.windowMs)).map(event=>event.word!));
}
export const rewardWord = (word: string) => word.normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
export const directRoundId = (sessionId: string) => `direct:${sessionId}`;
export const quizRoundId = (sessionId: string) => `quiz:${sessionId}`;
export const townRoundId = (sessionId: string) => `town:${sessionId}`;
export function taiwanDate(time = Date.now()) {
  const parts = new Intl.DateTimeFormat('en', {timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(time);
  return ['year','month','day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
