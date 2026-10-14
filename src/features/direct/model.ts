import choiceOptions from './choiceOptions.json';
import unit2 from './curriculumUnit2.json';
import lv3Unit4 from './curriculumLV3Unit4.json';
import lv3Unit5 from './curriculumLV3Unit5.json';
import lv3Unit6 from './curriculumLV3Unit6.json';
import lv3Unit7 from './curriculumLV3Unit7.json';
import lv3Unit8 from './curriculumLV3Unit8.json';
import lv3Unit9 from './curriculumLV3Unit9.json';
import lv3Unit10 from './curriculumLV3Unit10.json';
import curriculum from './curriculum.json';
import lv4Unit17 from './curriculumLV4Unit17.json';
import lv4Unit18 from './curriculumLV4Unit18.json';
import lv4Unit19 from './curriculumLV4Unit19.json';
import lv4Unit20 from './curriculumLV4Unit20.json';
import lv5Unit1 from './curriculumLV5Unit1.json';
import lv5Unit3 from './curriculumLV5Unit3.json';
import lv5Unit4 from './curriculumLV5Unit4.json';
import lv5Unit5 from './curriculumLV5Unit5.json';
import lv5Unit6 from './curriculumLV5Unit6.json';
import lv5Unit7 from './curriculumLV5Unit7.json';
import lv5Unit8 from './curriculumLV5Unit8.json';
import lv5Unit9 from './curriculumLV5Unit9.json';
import lv5Unit10 from './curriculumLV5Unit10.json';
import lv5Unit11 from './curriculumLV5Unit11.json';
import lv5Unit12 from './curriculumLV5Unit12.json';
import lv5Unit13 from './curriculumLV5Unit13.json';
import lv5Unit14 from './curriculumLV5Unit14.json';
import lv5Unit15 from './curriculumLV5Unit15.json';
import lv5Unit16 from './curriculumLV5Unit16.json';
import lv5Unit18 from './curriculumLV5Unit18.json';
import lv5Unit22 from './curriculumLV5Unit22.json';
import questions from './questions.json';
import grammarQuestions from './grammarQuestions.json';
import practiceVariants from './practiceVariantsLV4Unit17.json';
import { catalogWordIds } from './groupWords';

export { curriculum, questions };
export interface CurriculumIllustration { path: string; captionEn: string; captionZh: string }
export interface CurriculumUnit {
  templateId: string; revision: string; level: string; unit: number; name: string;
  items: LearningItem[]; questions: PracticeQuestion[];
  relatedNotes: { parentWord: string; word: string; meaningZh: string; officialWordId: string | null }[];
  deliveryMode?: 'text_only';
}
// Mapping fields are nullable across units; LV3's current JSON is not their schema.
export type LearningItem = Omit<(typeof curriculum.learningItems)[number], 'officialWordId' | 'officialSenseId'> & {
  officialWordId?: string | null; officialSenseId?: string | null;
  illustration?: CurriculumIllustration; parentWord?: string; level?: string; unit?: number;
  sourceRole?: string; printedLabel?: string; meaningSource?: string;
};
// Textbook units available in the app. LV3 units keep their numeric `unit` shortcut for existing callers.
export const curriculumUnits: CurriculumUnit[] = [
  { templateId: curriculum.template.templateId, revision: curriculum.template.revision, level: 'LV3', unit: 1, name: 'LV3 Unit 1', items: curriculum.learningItems as LearningItem[], questions: grammarQuestions, relatedNotes: [] },
  { templateId: unit2.template.templateId, revision: unit2.template.revision, level: 'LV3', unit: 2, name: 'LV3 Unit 2', items: unit2.learningItems as LearningItem[], questions: unit2.grammarQuestions, relatedNotes: [] },
  { templateId: lv3Unit4.template.templateId, revision: lv3Unit4.template.revision, level: 'LV3', unit: 4, name: lv3Unit4.template.title, items: lv3Unit4.learningItems as LearningItem[], questions: lv3Unit4.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv3Unit5.template.templateId, revision: lv3Unit5.template.revision, level: 'LV3', unit: 5, name: lv3Unit5.template.title, items: lv3Unit5.learningItems as LearningItem[], questions: lv3Unit5.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv3Unit6.template.templateId, revision: lv3Unit6.template.revision, level: 'LV3', unit: 6, name: lv3Unit6.template.title, items: lv3Unit6.learningItems as LearningItem[], questions: lv3Unit6.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv3Unit7.template.templateId, revision: lv3Unit7.template.revision, level: 'LV3', unit: 7, name: lv3Unit7.template.title, items: lv3Unit7.learningItems as LearningItem[], questions: lv3Unit7.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv3Unit8.template.templateId, revision: lv3Unit8.template.revision, level: 'LV3', unit: 8, name: lv3Unit8.template.title, items: lv3Unit8.learningItems as LearningItem[], questions: lv3Unit8.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv3Unit9.template.templateId, revision: lv3Unit9.template.revision, level: 'LV3', unit: 9, name: lv3Unit9.template.title, items: lv3Unit9.learningItems as LearningItem[], questions: lv3Unit9.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv3Unit10.template.templateId, revision: lv3Unit10.template.revision, level: 'LV3', unit: 10, name: lv3Unit10.template.title, items: lv3Unit10.learningItems as LearningItem[], questions: lv3Unit10.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv4Unit17.template.templateId, revision: lv4Unit17.template.revision, level: 'LV4', unit: 17, name: lv4Unit17.template.title, items: lv4Unit17.learningItems as LearningItem[], questions: lv4Unit17.questions, relatedNotes: lv4Unit17.relatedNotes },
  { templateId: lv4Unit18.template.templateId, revision: lv4Unit18.template.revision, level: 'LV4', unit: 18, name: lv4Unit18.template.title, items: lv4Unit18.learningItems as LearningItem[], questions: lv4Unit18.questions, relatedNotes: lv4Unit18.relatedNotes },
  { templateId: lv4Unit19.template.templateId, revision: lv4Unit19.template.revision, level: 'LV4', unit: 19, name: lv4Unit19.template.title, items: lv4Unit19.learningItems as LearningItem[], questions: lv4Unit19.questions, relatedNotes: lv4Unit19.relatedNotes },
  { templateId: lv4Unit20.template.templateId, revision: lv4Unit20.template.revision, level: 'LV4', unit: 20, name: lv4Unit20.template.title, items: lv4Unit20.learningItems as LearningItem[], questions: lv4Unit20.questions, relatedNotes: lv4Unit20.relatedNotes },
  { templateId: lv5Unit1.template.templateId, revision: lv5Unit1.template.revision, level: 'LV5', unit: 1, name: lv5Unit1.template.title, items: lv5Unit1.learningItems as LearningItem[], questions: lv5Unit1.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit3.template.templateId, revision: lv5Unit3.template.revision, level: 'LV5', unit: 3, name: lv5Unit3.template.title, items: lv5Unit3.learningItems as LearningItem[], questions: lv5Unit3.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit4.template.templateId, revision: lv5Unit4.template.revision, level: 'LV5', unit: 4, name: lv5Unit4.template.title, items: lv5Unit4.learningItems as LearningItem[], questions: lv5Unit4.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit5.template.templateId, revision: lv5Unit5.template.revision, level: 'LV5', unit: 5, name: lv5Unit5.template.title, items: lv5Unit5.learningItems as LearningItem[], questions: lv5Unit5.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit6.template.templateId, revision: lv5Unit6.template.revision, level: 'LV5', unit: 6, name: lv5Unit6.template.title, items: lv5Unit6.learningItems as LearningItem[], questions: lv5Unit6.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit7.template.templateId, revision: lv5Unit7.template.revision, level: 'LV5', unit: 7, name: lv5Unit7.template.title, items: lv5Unit7.learningItems as LearningItem[], questions: lv5Unit7.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit8.template.templateId, revision: lv5Unit8.template.revision, level: 'LV5', unit: 8, name: lv5Unit8.template.title, items: lv5Unit8.learningItems as LearningItem[], questions: lv5Unit8.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit9.template.templateId, revision: lv5Unit9.template.revision, level: 'LV5', unit: 9, name: lv5Unit9.template.title, items: lv5Unit9.learningItems as LearningItem[], questions: lv5Unit9.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit10.template.templateId, revision: lv5Unit10.template.revision, level: 'LV5', unit: 10, name: lv5Unit10.template.title, items: lv5Unit10.learningItems as LearningItem[], questions: lv5Unit10.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit11.template.templateId, revision: lv5Unit11.template.revision, level: 'LV5', unit: 11, name: lv5Unit11.template.title, items: lv5Unit11.learningItems as LearningItem[], questions: lv5Unit11.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit12.template.templateId, revision: lv5Unit12.template.revision, level: 'LV5', unit: 12, name: lv5Unit12.template.title, items: lv5Unit12.learningItems as LearningItem[], questions: lv5Unit12.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit13.template.templateId, revision: lv5Unit13.template.revision, level: 'LV5', unit: 13, name: lv5Unit13.template.title, items: lv5Unit13.learningItems as LearningItem[], questions: lv5Unit13.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit14.template.templateId, revision: lv5Unit14.template.revision, level: 'LV5', unit: 14, name: lv5Unit14.template.title, items: lv5Unit14.learningItems as LearningItem[], questions: lv5Unit14.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit15.template.templateId, revision: lv5Unit15.template.revision, level: 'LV5', unit: 15, name: lv5Unit15.template.title, items: lv5Unit15.learningItems as LearningItem[], questions: lv5Unit15.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit16.template.templateId, revision: lv5Unit16.template.revision, level: 'LV5', unit: 16, name: lv5Unit16.template.title, items: lv5Unit16.learningItems as LearningItem[], questions: lv5Unit16.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit18.template.templateId, revision: lv5Unit18.template.revision, level: 'LV5', unit: 18, name: lv5Unit18.template.title, items: lv5Unit18.learningItems as LearningItem[], questions: lv5Unit18.questions, relatedNotes: [], deliveryMode: 'text_only' },
  { templateId: lv5Unit22.template.templateId, revision: lv5Unit22.template.revision, level: 'LV5', unit: 22, name: lv5Unit22.template.title, items: lv5Unit22.learningItems as LearningItem[], questions: lv5Unit22.questions, relatedNotes: [], deliveryMode: 'text_only' },
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
  for (const a of [...attempts].sort((a,b) => a.answeredAt-b.answeredAt)) latest.set(canonicalQuestionId(a.questionId),a);
  const wrong = new Set([...latest.values()].filter(a => !a.correct).map(a => a.questionId));
  return practiceQuestions.filter(q => wrong.has(q.questionId)).map(q => q.questionId);
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
// Additive, immutable IDs keep saved sessions and old explanations readable.
const originalPracticeQuestions = [...allQuestions, ...choiceQuestions];
export const variantQuestions: PracticeQuestion[] = practiceVariants.flatMap((v, index) => {
  const original = originalPracticeQuestions.find(q => q.questionId === v.baseQuestionId)!;
  const originalChoice = originalPracticeQuestions.find(q => q.questionId === BASIC_PREFIX + v.baseQuestionId)!;
  const cloze: PracticeQuestion = { ...original, ...v, sourceType: 'practice_context_cloze', options: [] };
  const offset = (index % 2 + 1) % originalChoice.options.length;
  const entries = [...originalChoice.options.slice(offset), ...originalChoice.options.slice(0, offset)];
  const options = entries.map((o, i) => ({
    id: 'ABCD'[i], text: o.text,
    rationaleZh: o.id === originalChoice.answer ? `${v.targetWord}：${v.targetMeaningZh}。${v.sentenceZh}`
      : o.rationaleZh.replace('不符合本題指定字義', '不符合本句情境'),
  }));
  return [cloze, { ...cloze, questionId: BASIC_PREFIX + v.questionId, learningItemId: undefined,
    sourceType: 'practice_context_choice', options, answer: options.find(o => o.text === v.answer)!.id }];
});
export const practiceQuestions = [...originalPracticeQuestions, ...variantQuestions];
const variantBases = new Map(practiceVariants.map(v => [v.questionId, v.baseQuestionId]));
/** A vocabulary target has multiple contexts; recognition and spelling remain distinct. */
export function canonicalQuestionId(id: string): string {
  const basic = id.startsWith(BASIC_PREFIX);
  const base = basic ? id.slice(BASIC_PREFIX.length) : id;
  return (basic ? BASIC_PREFIX : '') + (variantBases.get(base) ?? base);
}
export function firstTargetAttempts(attempts: DirectAttempt[]): DirectAttempt[] {
  const first = new Map<string, DirectAttempt>();
  for (const a of [...attempts].sort((a, b) => a.answeredAt - b.answeredAt)) {
    const key = canonicalQuestionId(a.questionId);
    if (!first.has(key)) first.set(key, a);
  }
  return [...first.values()];
}
export function selectPracticeVariant(id: string, attempts: DirectAttempt[], random = Math.random): string {
  const basic = id.startsWith(BASIC_PREFIX);
  const base = questionForMode(canonicalQuestionId(id), 'advanced');
  const variants = practiceVariants.filter(v => v.baseQuestionId === base).map(v => v.questionId);
  if (!variants.length) return id;
  // Context exposure spans both modes; mode switching itself keeps the current sentence.
  const history = attempts.filter(a => questionForMode(canonicalQuestionId(a.questionId), 'advanced') === base)
    .sort((a, b) => a.answeredAt - b.answeredAt);
  const last = history.at(-1);
  const lastId = last && questionForMode(last.questionId, 'advanced');
  const counts = new Map<string, number>();
  for (const a of history) {
    const key = questionForMode(a.questionId, 'advanced');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const candidates = variants.filter(v => v !== lastId);
  const least = Math.min(...candidates.map(v => counts.get(v) ?? 0));
  const unused = candidates.filter(v => (counts.get(v) ?? 0) === least);
  return questionForMode(unused[Math.floor(random() * unused.length)], basic ? 'basic' : 'advanced');
}
export function sessionMode(s: DirectSession): PracticeMode {
  return s.questionIds.some(id => id.startsWith('CLOZE-')) ? 'advanced' : 'basic';
}
