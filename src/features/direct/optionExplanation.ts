import type { SenseRecord, WordRecord } from '../../db/types';
import type { PracticeQuestion } from './model';
import { isPublicContent, recordedMeanings, recordedSummary } from '../browser/meaningRecords';
import { optionContextRationales } from './optionContextRationales';
import { approvedCurriculumCards } from '../vocabulary/approvedCurriculum';

const normalize = (text: string) => text.trim().normalize('NFKC').toLowerCase();
export function optionExplanation(question: PracticeQuestion, option: PracticeQuestion['options'][number], words: WordRecord[], senses: SenseRecord[]) {
  if (!['original_target_word_choice', 'practice_context_choice'].includes(question.sourceType))
    return { meaning: '', rationale: option.rationaleZh, source: 'existing-authored' };
  const key = normalize(option.text);
  const approvedWordIds = new Set(approvedCurriculumCards(option.text).map(card => card.officialWordId));
  const records = words.filter(word => isPublicContent(word) && (normalize(word.word) === key || word.wordVariants?.some(form => normalize(form) === key) || approvedWordIds.has(word.wordId)));
  const meanings = records.flatMap(word => {
    const rows = recordedMeanings(word, senses);
    const result = rows.map(row => `${row.pos} ${row.meaning}`.trim());
    const summary = recordedSummary(word, senses);
    if (summary && !rows.some(row => row.meaning === summary)) result.push(`${word.posAll?.join(' / ') || word.pos} ${summary}`.trim());
    return result;
  });
  const meaning = [...new Set(meanings)].join('；') || option.meaningZh?.trim() || '字義尚未收錄';
  const answer = question.options.find(row => row.id === question.answer);
  const authored = optionContextRationales.find(record => record.questionId === question.questionId
    && record.sentenceEn === question.sentenceEn && normalize(record.answerText) === normalize(answer?.text ?? ''));
  if (authored?.options[key]) return { meaning, rationale: authored.options[key], source: 'authored-context' };
  const context = question.sentenceZh ? `本題句意：${question.sentenceZh}` : `本題目標字義：${question.targetMeaningZh || question.targetWord}。`;
  return { meaning, rationale: option.id === question.answer
    ? `本題採用「${question.targetMeaningZh || question.targetWord}」之義。${context}`
    : `${context} 此選項尚無逐項語境解析。`, source: 'question-context' };
}
