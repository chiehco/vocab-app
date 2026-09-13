import { progressDb } from '../../db/progressDb';
import { questions, practiceQuestions as allQuestions, questionForMode, sessionMode, acceptsChoice, normalizeAnswer, REVISION, validGroup } from './model';
import type { CustomGroup, DirectSession, DirectAttempt, PracticeMode } from './model';
import { contentDb } from '../../db/contentDb';

export async function importWordGroup(wordIds: string[], name: string, groupId?: string) {
  if (!wordIds.length || (await contentDb.words.bulkGet(wordIds)).some(w => !w)) throw new Error('部分字卡目前無法使用，請重新預覽。');
  return progressDb.transaction('rw', progressDb.customGroups, async () => {
    const current = groupId ? await progressDb.customGroups.get(groupId) : undefined;
    if (groupId && !current) throw new Error('找不到要加入的群組，請重新選擇。');
    const group: CustomGroup = current ?? { id: crypto.randomUUID(), name: name.trim(), itemIds: [], wordIds: [], templateId: null, templateRevision: null, updatedAt: Date.now() };
    const merged = { ...group, wordIds: [...new Set([...(group.wordIds ?? []), ...wordIds])] };
    await saveGroup(merged);
    return merged;
  });
}

export async function saveGroup(group: CustomGroup) {
  if (!validGroup(group)) throw new Error('群組名稱或項目無效，尚未儲存。');
  await progressDb.customGroups.put({ ...group, updatedAt: Date.now() });
}
export async function startSession(questionIds = questions.map(q => q.questionId), title = '新情境練習', groupId?: string, scopeQuestionIds = questionIds, mode: PracticeMode = 'basic') {
  questionIds = questionIds.map(id => questionForMode(id, mode));
  scopeQuestionIds = scopeQuestionIds.map(id => questionForMode(id, mode));
  if (!questionIds.length || new Set(questionIds).size !== questionIds.length || questionIds.some(id => !allQuestions.some(q => q.questionId === id))) throw new Error('題目清單無效');
  if (new Set(scopeQuestionIds).size !== scopeQuestionIds.length || questionIds.some(id=>!scopeQuestionIds.includes(id)) || scopeQuestionIds.some(id=>!allQuestions.some(q=>q.questionId===id))) throw new Error('練習範圍無效');
  const session: DirectSession = { id: crypto.randomUUID(), questionIds:[...questionIds], scopeQuestionIds:[...scopeQuestionIds], index: 0, choices: {}, lookups: {}, startedAt: Date.now(), updatedAt: Date.now(), revision: REVISION, title, ...(groupId ? {groupId} : {}) };
  await progressDb.transaction('rw', progressDb.directSessions, async () => {
    const latest = await progressDb.directSessions.orderBy('updatedAt').last();
    session.updatedAt = Math.max(Date.now(), (latest?.updatedAt ?? 0) + 1);
    await progressDb.directSessions.add(session);
  });
  return session;
}
export async function startGroupSession(groupId: string) {
  const group = await progressDb.customGroups.get(groupId);
  if (!group || !validGroup(group) || !group.itemIds.length) throw new Error('群組沒有可練習的項目');
  const ids = group.itemIds.map(id=>allQuestions.find(q=>q.learningItemId===id)?.questionId);
  if (ids.some(id=>!id)) throw new Error('群組部分項目尚未有題目');
  return startSession(ids as string[],group.name,group.id);
}
export async function updateQuestion(sessionId: string, questionId: string, change: { choice?: string; lookup?: string }) {
  await progressDb.transaction('rw', [progressDb.directSessions, progressDb.directAttempts], async () => {
    const s = await progressDb.directSessions.get(sessionId);
    if (!s || s.revision !== REVISION || s.questionIds[s.index] !== questionId || await progressDb.directAttempts.get(`${sessionId}:${questionId}`)) return;
    const q = allQuestions.find(q=>q.questionId===questionId);
    if (q && change.choice !== undefined && (acceptsChoice(q,change.choice) || !q.options.length && change.choice === '')) s.choices[questionId] = change.choice;
    if (change.lookup) s.lookups[questionId] = [...new Set([...(s.lookups[questionId] ?? []), change.lookup.toLowerCase()])];
    await progressDb.directSessions.put({ ...s, updatedAt: Date.now() });
  });
}
export async function submitAnswer(sessionId: string, questionId: string) {
  await progressDb.transaction('rw', [progressDb.directSessions, progressDb.directAttempts], async () => {
    const s = await progressDb.directSessions.get(sessionId);
    const q = allQuestions.find(q => q.questionId === questionId);
    if (!s || !q || s.revision !== REVISION || s.questionIds[s.index] !== questionId || !acceptsChoice(q,s.choices[questionId])) throw new Error('請先填寫或選擇答案');
    const id = `${sessionId}:${questionId}`;
    if (await progressDb.directAttempts.get(id)) return;
    const lookedUpWords = [...(s.lookups[questionId] ?? [])];
    const last = await progressDb.directAttempts.orderBy('answeredAt').last();
    const attempt: DirectAttempt = { id, sessionId, questionId, revision: REVISION, choice: s.choices[questionId], correct: normalizeAnswer(s.choices[questionId]) === normalizeAnswer(q.answer), firstAttempt: !(await progressDb.directAttempts.where('questionId').equals(questionId).count()), hintUsed: lookedUpWords.length > 0, lookedUpWords, answeredAt: Math.max(Date.now(), (last?.answeredAt ?? 0) + 1), schedulingApplied: false };
    await progressDb.directAttempts.add(attempt);
  });
}
export async function nextQuestion(sessionId: string) {
  await progressDb.transaction('rw', [progressDb.directSessions, progressDb.directAttempts], async () => {
    const s = await progressDb.directSessions.get(sessionId);
    if (!s || !(await progressDb.directAttempts.get(`${sessionId}:${s.questionIds[s.index]}`))) return;
    await progressDb.directSessions.put({ ...s, index: s.index + 1, updatedAt: Date.now() });
  });
}

export async function switchPracticeMode(sessionId: string, mode: PracticeMode) {
  const current = await progressDb.directSessions.get(sessionId);
  if (!current || current.revision !== REVISION) throw new Error('找不到練習');
  if (sessionMode(current) === mode) return current;
  const ids = current.questionIds.map(id => questionForMode(id, mode));
  const scope = (current.scopeQuestionIds ?? current.questionIds).map(id => questionForMode(id, mode));
  const existing = await progressDb.directSessions.orderBy('updatedAt').filter(s => s.revision === REVISION && s.groupId === current.groupId && s.title === current.title && JSON.stringify(s.questionIds) === JSON.stringify(ids) && JSON.stringify(s.scopeQuestionIds ?? s.questionIds) === JSON.stringify(scope)).last();
  return existing ?? startSession(ids, current.title, current.groupId, scope, mode);
}
