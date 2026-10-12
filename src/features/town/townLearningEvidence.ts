import type { ReviewLogEntry, ReviewMode } from '../../db/types';
import type { TownBinding } from './townStudy';

export const ORDINARY_TOWN_MODES = new Set<ReviewMode>(['flashcard','known','same-day-recap']);
export const ALL_TOWN_REVIEW_MODES = new Set<ReviewMode>(['quiz-w2m','quiz-m2w','quiz-image','fill-blank',...ORDINARY_TOWN_MODES]);
export function learningHistory(bindings:readonly TownBinding[], logs:readonly ReviewLogEntry[], modes=ALL_TOWN_REVIEW_MODES) {
  const byWord=new Map(bindings.flatMap(binding=>binding.keys.map(key=>[key,binding.id] as const))), histories=new Map<string,ReviewLogEntry[]>(), seen=new Set<string>();
  for(const log of [...logs].sort((a,b)=>Date.parse(a.reviewedAt)-Date.parse(b.reviewedAt) || (a.id ?? 0)-(b.id ?? 0))) {
    const id=byWord.get(log.word), event=log.id===undefined?`${log.sessionId}:${log.word}:${log.mode}:${log.reviewedAt}:${log.grade}`:String(log.id);
    if(!id || !modes.has(log.mode) || seen.has(event))continue;
    seen.add(event);const history=histories.get(id) ?? [];history.push(log);histories.set(id,history);
  }
  return histories;
}
export function learningLabel(log:ReviewLogEntry) {
  return log.mode==='known' ? '最近一次已保存已會標記' : log.mode==='same-day-recap' ? '最近一次已完成同日回顧'
    : log.mode==='flashcard' ? log.grade===0 ? '最近一次一般學習已保存，還需要複習' : '最近一次已完成一般學習／複習' : undefined;
}
