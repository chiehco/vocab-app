import choiceOptions from './choiceOptions.json';
import unit2 from './curriculumUnit2.json';
import curriculum from './curriculum.json';
import lv4Unit17 from './curriculumLV4Unit17.json';
import lv4Unit18 from './curriculumLV4Unit18.json';
import questions from './questions.json';
import grammarQuestions from './grammarQuestions.json';
import { catalogWordIds } from './groupWords';

export { curriculum, questions };
export interface CurriculumIllustration { path: string; captionEn: string; captionZh: string }
export interface CurriculumUnit {
  templateId: string; revision: string; level: string; unit: number; name: string;
  items: LearningItem[]; questions: PracticeQuestion[];
  relatedNotes: { parentWord: string; word: string; meaningZh: string; officialWordId: string | null }[];
}
export type LearningItem = (typeof curriculum.learningItems)[number] & { illustration?: CurriculumIllustration; parentWord?: string; level?: string; unit?: number };
// Textbook units available in the app. LV3 units keep their numeric `unit` shortcut for existing callers.
export const curriculumUnits: CurriculumUnit[] = [
  { templateId: curriculum.template.templateId, revision: curriculum.template.revision, level: 'LV3', unit: 1, name: 'LV3 Unit 1', items: curriculum.learningItems as LearningItem[], questions: grammarQuestions, relatedNotes: [] },
  { templateId: unit2.template.templateId, revision: unit2.template.revision, level: 'LV3', unit: 2, name: 'LV3 Unit 2', items: unit2.learningItems as LearningItem[], questions: unit2.grammarQuestions, relatedNotes: [] },
  { templateId: lv4Unit17.template.templateId, revision: lv4Unit17.template.revision, level: 'LV4', unit: 17, name: lv4Unit17.template.title, items: lv4Unit17.learningItems as LearningItem[], questions: lv4Unit17.questions, relatedNotes: lv4Unit17.relatedNotes },
  { templateId: lv4Unit18.template.templateId, revision: lv4Unit18.template.revision, level: 'LV4', unit: 18, name: lv4Unit18.template.title, items: lv4Unit18.learningItems as LearningItem[], questions: lv4Unit18.questions, relatedNotes: lv4Unit18.relatedNotes },
];
export type UnitKey = number | string;
export function findUnit(key: UnitKey, level?: string): CurriculumUnit | undefined {
  return typeof key === 'string' ? curriculumUnits.find(u => u.templateId === key) : curriculumUnits.find(u => u.level === (level ?? 'LV3') && u.unit === key);
}
export const unitsForLevel = (level: string) => curriculumUnits.filter(u => u.level === level);
export const learningItems: LearningItem[] = curriculumUnits.flatMap(u => u.items);
export const unitItems = (unit: UnitKey, level?: string): LearningItem[] => findUnit(unit, level)?.items ?? curriculum.learningItems as LearningItem[];
export const REVISION = '20260912-1';
export interface PracticeQuestion {
  questionId: string; learningItemId?: string; sourceType: string; targetWord: string; targetMeaningZh: string;
  stem: string; options: {id:string;text:string;rationaleZh:string}[]; answer: string;
  sentenceEn?: string; sentenceZh?: string; answerForms?: string[];
}
// Units that ship their own cloze/choice questions (LV4 Unit 17) are used as-is; LV3 cloze questions are derived from items.
const packagedQuestionItems = new Set(curriculumUnits.flatMap(u => u.questions.filter(q => !q.options.length).map(q => q.learningItemId)));
export const allQuestions: PracticeQuestion[] = [
  ...questions, ...curriculumUnits.flatMap(u => u.questions),
  ...learningItems.filter(i => i.kind === 'vocabulary' && i.originalExample && !packagedQuestionItems.has(i.learningItemId)).map(i => ({
    questionId: `CLOZE-${i.originalExample!.workExampleId}`, learningItemId:i.learningItemId,
    sourceType:'original_target_word_cloze', targetWord:i.displayWord!, targetMeaningZh:i.targetMeaningZh!,
    stem:i.originalExample!.blankSentence, options:[], answer:i.originalExample!.answer,
    sentenceEn:i.originalExample!.sentenceEn, sentenceZh:i.originalExample!.sentenceZh,
  })),
];
export const normalizeAnswer = (text: string) => text.trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
// Spelling variants (catalog／catalogue) count as correct for fill-in questions; choice answers stay exact.
export const isCorrectAnswer = (q: PracticeQuestion, value: string) => {
  const given = normalizeAnswer(value);
  return given === normalizeAnswer(q.answer) || !q.options.length && (q.answerForms ?? []).some(form => normalizeAnswer(form) === given);
};
export function acceptsChoice(q: PracticeQuestion, value: string | undefined) {
  return typeof value === 'string' && (q.options.length ? q.options.some(o=>o.id===value) : value.trim().length>0 && value.length<=120);
}
export interface CustomGroup { id: string; name: string; itemIds: string[]; wordIds?: string[]; templateId: string | null; templateRevision: string | null; updatedAt: number }
export interface DirectSession { id: string; questionIds: string[]; index: number; choices: Record<string, string>; lookups: Record<string, string[]>; startedAt: number; updatedAt: number; revision: string; title?: string; groupId?: string; scopeQuestionIds?: string[] }
export interface DirectAttempt { id: string; sessionId: string; questionId: string; revision: string; choice: string; correct: boolean; firstAttempt: boolean; hintUsed: boolean; lookedUpWords: string[]; answeredAt: number; schedulingApplied: false }
export function templateGroup(unit: UnitKey = 1, level?: string): CustomGroup {
  const u = findUnit(unit, level) ?? curriculumUnits[0];
  return { id: crypto.randomUUID(), name: u.name, itemIds: u.items.map(i => i.learningItemId), templateId: u.templateId, templateRevision: u.revision, updatedAt: Date.now() };
}
export function validGroup(g: CustomGroup): boolean {
  return !!g && typeof g.id === 'string' && !!g.id && typeof g.name === 'string' && !!g.name.trim() && Number.isFinite(g.updatedAt) && Array.isArray(g.itemIds) && new Set(g.itemIds).size === g.itemIds.length && g.itemIds.every(id => learningItems.some(i => i.learningItemId === id))
    && (g.wordIds === undefined || Array.isArray(g.wordIds) && g.wordIds.length <= 7000 && new Set(g.wordIds).size === g.wordIds.length && g.wordIds.every(id => catalogWordIds.has(id)));
}
export function wrongQuestionIds(attempts: DirectAttempt[]): string[] {
  const latest = new Map<string, DirectAttempt>();
  for (const a of [...attempts].sort((a,b) => a.answeredAt-b.answeredAt)) latest.set(a.questionId,a);
  return practiceQuestions.filter(q => latest.has(q.questionId) && !latest.get(q.questionId)!.correct).map(q => q.questionId);
}

export type PracticeMode = 'basic' | 'advanced';
export const BASIC_PREFIX = 'CHOICE-';
export function questionForMode(id: string, mode: PracticeMode) {
  const base = id.startsWith(BASIC_PREFIX) ? id.slice(BASIC_PREFIX.length) : id;
  return mode === 'basic' && base.startsWith('CLOZE-') ? BASIC_PREFIX + base : base;
}
// Original IDs remain the spelling records; recognition uses independent IDs.
export const choiceQuestions: PracticeQuestion[] = allQuestions.filter(q => !q.options.length && q.questionId in choiceOptions).map(q => {
  const entries = choiceOptions[q.questionId as keyof typeof choiceOptions];
  const options = entries.map((o, index) => ({id: 'ABCD'[index], text: o.text, rationaleZh: o.text + '：' + o.meaningZh}));
  return {...q, questionId: BASIC_PREFIX + q.questionId, learningItemId: undefined, sourceType: 'original_target_word_choice', options, answer: options.find(o => normalizeAnswer(o.text) === normalizeAnswer(q.answer))!.id};
});
export const practiceQuestions = [...allQuestions, ...choiceQuestions];
export function sessionMode(s: DirectSession): PracticeMode {
  return s.questionIds.some(id => id.startsWith('CLOZE-')) ? 'advanced' : 'basic';
}
