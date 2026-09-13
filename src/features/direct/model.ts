import unit2 from './curriculumUnit2.json';
import curriculum from './curriculum.json';
import questions from './questions.json';
import grammarQuestions from './grammarQuestions.json';
import { catalogWordIds } from './groupWords';

export { curriculum, questions };
export const learningItems = [...curriculum.learningItems, ...unit2.learningItems];
export const unitItems = (unit: number) => unit === 2 ? unit2.learningItems : curriculum.learningItems;
export const REVISION = '20260912-1';
export interface PracticeQuestion {
  questionId: string; learningItemId?: string; sourceType: string; targetWord: string; targetMeaningZh: string;
  stem: string; options: {id:string;text:string;rationaleZh:string}[]; answer: string;
  sentenceEn?: string; sentenceZh?: string;
}
export const allQuestions: PracticeQuestion[] = [
  ...questions, ...grammarQuestions, ...unit2.grammarQuestions,
  ...learningItems.filter(i => i.kind === 'vocabulary' && i.originalExample).map(i => ({
    questionId: `CLOZE-${i.originalExample!.workExampleId}`, learningItemId:i.learningItemId,
    sourceType:'original_target_word_cloze', targetWord:i.displayWord!, targetMeaningZh:i.targetMeaningZh!,
    stem:i.originalExample!.blankSentence, options:[], answer:i.originalExample!.answer,
    sentenceEn:i.originalExample!.sentenceEn, sentenceZh:i.originalExample!.sentenceZh,
  })),
];
export const normalizeAnswer = (text: string) => text.trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
export function acceptsChoice(q: PracticeQuestion, value: string | undefined) {
  return typeof value === 'string' && (q.options.length ? q.options.some(o=>o.id===value) : value.trim().length>0 && value.length<=120);
}
export interface CustomGroup { id: string; name: string; itemIds: string[]; wordIds?: string[]; templateId: string | null; templateRevision: string | null; updatedAt: number }
export interface DirectSession { id: string; questionIds: string[]; index: number; choices: Record<string, string>; lookups: Record<string, string[]>; startedAt: number; updatedAt: number; revision: string; title?: string; groupId?: string; scopeQuestionIds?: string[] }
export interface DirectAttempt { id: string; sessionId: string; questionId: string; revision: string; choice: string; correct: boolean; firstAttempt: boolean; hintUsed: boolean; lookedUpWords: string[]; answeredAt: number; schedulingApplied: false }
export function templateGroup(unit = 1): CustomGroup {
  return { id: crypto.randomUUID(), name: `LV3 Unit ${unit === 2 ? 2 : 1}`, itemIds: unitItems(unit).map(i => i.learningItemId), templateId: unit === 2 ? unit2.template.templateId : curriculum.template.templateId, templateRevision: unit === 2 ? unit2.template.revision : curriculum.template.revision, updatedAt: Date.now() };
}
export function validGroup(g: CustomGroup): boolean {
  return !!g && typeof g.id === 'string' && !!g.id && typeof g.name === 'string' && !!g.name.trim() && Number.isFinite(g.updatedAt) && Array.isArray(g.itemIds) && new Set(g.itemIds).size === g.itemIds.length && g.itemIds.every(id => learningItems.some(i => i.learningItemId === id))
    && (g.wordIds === undefined || Array.isArray(g.wordIds) && g.wordIds.length <= 7000 && new Set(g.wordIds).size === g.wordIds.length && g.wordIds.every(id => catalogWordIds.has(id)));
}
export function wrongQuestionIds(attempts: DirectAttempt[]): string[] {
  const latest = new Map<string, DirectAttempt>();
  for (const a of [...attempts].sort((a,b) => a.answeredAt-b.answeredAt)) latest.set(a.questionId,a);
  return allQuestions.filter(q => latest.has(q.questionId) && !latest.get(q.questionId)!.correct).map(q => q.questionId);
}
