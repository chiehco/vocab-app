import { progressDb } from '../../db/progressDb';
import type { DirectAttempt, DirectSession } from '../direct/model';
import pilot from './gsatPilot.json';
import { examArchive } from './archive';
import type { ExamPassage } from './archive';

// Session format remains compatible with existing 115 backups.
export const GSAT_REVISION = pilot.revision;
export const gsatQuestions = [...pilot.questions, ...examArchive.questions.map(q=>({...q,number:q.number!,options:q.options!,answer:{kind:'single',value:q.answer.value as string}}))];
export const gsatPassage = pilot.passages[0];
export const gsatPassages:ExamPassage[] = [...pilot.passages as unknown as ExamPassage[], ...examArchive.passages];
export const gsatIds = gsatQuestions.map(q => q.question_id);
export const gsatYears = Array.from({length:10},(_,i)=>String(115-i));
export const gsatYear = (id: string) => id.split('-')[1];
export const idsForYear = (year: string) => gsatIds.filter(id => gsatYear(id) === year);
export function activeQuestions(s: DirectSession) {
  const q = gsatQuestions.find(q => q.question_id === s.questionIds[s.index]);
  return q ? (q.passage_id ? gsatQuestions.filter(v => v.passage_id === q.passage_id) : [q]) : [];
}
export function validGsatSession(s: DirectSession) {
  return s.revision === GSAT_REVISION && s.questionIds.length > 0 && new Set(s.questionIds.map(gsatYear)).size === 1 &&
    new Set(s.questionIds).size === s.questionIds.length && s.questionIds.every(id => gsatIds.includes(id)) &&
    gsatPassages.every(p => !s.questionIds.some(id => p.question_ids.includes(id)) ||
      p.question_ids.every((id, i) => s.questionIds[s.questionIds.indexOf(p.question_ids[0]) + i] === id)) &&
    Number.isInteger(s.index) && s.index >= 0 && s.index <= s.questionIds.length &&
    !gsatPassages.some(p => p.question_ids.slice(1).includes(s.questionIds[s.index]));
}
export async function startGsat(ids = idsForYear('115')) {
  const s: DirectSession = { id: crypto.randomUUID(), questionIds: [...ids], scopeQuestionIds: idsForYear(gsatYear(ids[0] ?? '')), index: 0,
    choices: {}, lookups: {}, startedAt: Date.now(), updatedAt: Date.now(), revision: GSAT_REVISION, title: `${gsatYear(ids[0] ?? '')} 年學測 · ${ids.length} 題` };
  if (!validGsatSession(s)) throw new Error('題組不完整，無法開始。');
  await progressDb.directSessions.add(s);
  return s;
}
export async function editGsat(id: string, change: { questionId?: string; choice?: string; lookup?: string }) {
  await progressDb.transaction('rw', progressDb.directSessions, progressDb.directAttempts, async () => {
    const s = await progressDb.directSessions.get(id);
    if (!s || !validGsatSession(s)) throw new Error('這份進度無法續答。');
    const qs = activeQuestions(s);
    // Passage lookups affect every unsubmitted question sharing that context.
    for (const q of qs) {
      if (await progressDb.directAttempts.get(`${id}:${q.question_id}`)) continue;
      if (change.choice !== undefined && change.questionId === q.question_id) {
        if (!Object.keys(q.options).includes(change.choice)) throw new Error('答案選項無效。');
        s.choices[q.question_id] = change.choice;
      }
      if (change.lookup?.trim()) s.lookups[q.question_id] = [...new Set([...(s.lookups[q.question_id] ?? []), change.lookup.trim().toLowerCase()])];
    }
    await progressDb.directSessions.put({ ...s, updatedAt: Date.now() });
  });
}
export async function submitGsat(id: string) {
  await progressDb.transaction('rw', progressDb.directSessions, progressDb.directAttempts, async () => {
    const s = await progressDb.directSessions.get(id);
    if (!s || !validGsatSession(s)) throw new Error('這份進度無法提交。');
    const qs = activeQuestions(s);
    if (!qs.length || qs.some(q => !Object.keys(q.options).includes(s.choices[q.question_id]))) throw new Error('請選完本題組所有答案，再提交。');
    const existing = await progressDb.directAttempts.bulkGet(qs.map(q => `${id}:${q.question_id}`));
    if (existing.every(Boolean)) return;
    if (existing.some(Boolean)) throw new Error('題組紀錄不完整，請還原完整備份。');
    const last = await progressDb.directAttempts.orderBy('answeredAt').last();
    const now = Math.max(Date.now(), (last?.answeredAt ?? 0) + 1);
    for (const q of qs) {
      const lookedUpWords = [...(s.lookups[q.question_id] ?? [])];
      const a: DirectAttempt = { id: `${id}:${q.question_id}`, sessionId: id, questionId: q.question_id,
        revision: GSAT_REVISION, choice: s.choices[q.question_id], correct: s.choices[q.question_id] === q.answer.value,
        firstAttempt: !(await progressDb.directAttempts.where('questionId').equals(q.question_id).count()),
        hintUsed: lookedUpWords.length > 0, lookedUpWords, answeredAt: now, schedulingApplied: false };
      await progressDb.directAttempts.add(a);
    }
    await progressDb.directSessions.put({ ...s, updatedAt: now });
  });
}
export async function advanceGsat(id: string) {
  await progressDb.transaction('rw', progressDb.directSessions, progressDb.directAttempts, async () => {
    const s = await progressDb.directSessions.get(id);
    if (!s || !validGsatSession(s)) return;
    const qs = activeQuestions(s);
    if (!qs.length || !(await progressDb.directAttempts.bulkGet(qs.map(q => `${id}:${q.question_id}`))).every(Boolean)) return;
    await progressDb.directSessions.put({ ...s, index: s.index + qs.length, updatedAt: Date.now() });
  });
}
export function gsatWrongIds(attempts: DirectAttempt[], year?: string) {
  const latest = new Map<string, DirectAttempt>();
  [...attempts].sort((a,b) => a.answeredAt-b.answeredAt).forEach(a => latest.set(a.questionId,a));
  const wrong = gsatIds.filter(id => latest.has(id) && !latest.get(id)!.correct);
  for (const p of gsatPassages) if (wrong.some(id => p.question_ids.includes(id))) wrong.push(...p.question_ids);
  return gsatIds.filter(id => wrong.includes(id) && (!year || gsatYear(id) === year));
}

export function validGsatBackup(sessions: DirectSession[], attempts: DirectAttempt[]) {
  return sessions.filter(s => s.revision === GSAT_REVISION).every(s => {
    if (!validGsatSession(s)) return false;
    const rows = attempts.filter(a => a.sessionId === s.id);
    if (Object.entries(s.choices).some(([id, choice]) => !s.questionIds.includes(id) || !Object.keys(gsatQuestions.find(q => q.question_id === id)!.options).includes(choice))) return false;
    if (rows.some(a => a.revision !== GSAT_REVISION || a.choice !== s.choices[a.questionId] || a.correct !== (a.choice === gsatQuestions.find(q => q.question_id === a.questionId)!.answer.value))) return false;
    if (gsatPassages.some(p => {
      const count = rows.filter(a => p.question_ids.includes(a.questionId)).length;
      return count !== 0 && count !== p.question_ids.length;
    })) return false;
    const active = activeQuestions(s).map(q => q.question_id);
    return s.questionIds.slice(0,s.index).every(id => rows.some(a => a.questionId === id)) &&
      rows.every(a => s.questionIds.indexOf(a.questionId) < s.index || active.includes(a.questionId));
  });
}
