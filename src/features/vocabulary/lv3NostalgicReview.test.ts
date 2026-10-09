import { expect, it } from 'vitest';
import unit1 from '../direct/curriculum.json';
import unit2 from '../direct/curriculumUnit2.json';
import { allQuestions, templateGroup } from '../direct/model';
import { groupWordIds, resolveGroupWords } from '../direct/groupScope';
import { getWordDisplaySense } from '../browser/wordDisplay';
import { approvedCurriculumCard } from './approvedCurriculum';
import words from '../../../public/data/v1/words.json';
import senses from '../../../public/data/v1/senses.json';
import examples from '../../../public/data/v1/examples.json';
import pack from '../../../public/data/v1/sa-pack.json';
import approval from './lv3NostalgicReview.json';
import type { SenseRecord, WordRecord } from '../../db/types';

it('maps nostalgic to one reviewed past-memories sense and retains the existing notebook practice', () => {
  const formal = words.filter(word => word.wordVariants.includes('nostalgic'));
  expect(formal).toHaveLength(1);
  expect(formal[0]).toMatchObject({ wordId: 'W006086', word: 'nostalgic', level: 'LV3', pos: 'adj.', meaningZh: '懷念往日時光的' });
  const item = unit1.learningItems.find(item => item.displayWord === 'nostalgic')!;
  expect(item.chapterMeaningsZh).toBe('懷念往日時光的');
  expect(approval.originalChapterMeaningsZh).toBe('鄉愁的');
  expect([item.learningItemId, item.lexemeRef, item.officialWordId, item.officialSenseId])
    .toEqual(['LI-LV3U01-nostalgic', 'W006086', 'W006086', 'W006086-1']);
  expect(getWordDisplaySense(formal[0] as WordRecord, senses as SenseRecord[]))
    .toMatchObject({ meaning: '懷念往日時光的', pos: 'adj.', needsReview: false, source: 'sense' });
  const example = examples.find(example => example.exampleId === 'EX-LV3U01-nostalgic')!;
  expect(example).toMatchObject({ sentenceEn: item.originalExample!.sentenceEn, sentenceZh: item.originalExample!.sentenceZh,
    blankSentence: item.originalExample!.blankSentence, answer: 'nostalgic', meaningHint: '懷念往日時光的' });
  const question = allQuestions.find(question => question.learningItemId === item.learningItemId && !question.options.length)!;
  expect(question).toMatchObject({ questionId: 'CLOZE-ORIG-20260912-LV3U01-SUP-nostalgic',
    sentenceEn: 'Finding her old school notebook made her feel nostalgic.', answer: 'nostalgic' });
  expect(approval.originalExample).toEqual(item.originalExample);
  expect(pack.words.filter(word => word.wordId === 'W006086')).toEqual(formal);
  expect(groupWordIds(templateGroup(1)).filter(id => id === 'W006086')).toEqual(['W006086']);
  expect(resolveGroupWords(templateGroup(1), pack.words as WordRecord[]).filter(word => word.wordId === 'W006086')).toEqual(formal);
});

it('does not substitute homesick, add an absent U2 entry, or approve a picture', () => {
  expect(words.find(word => word.wordId === 'W002410')?.word).toBe('homesick');
  expect(unit1.learningItems.find(item => item.displayWord === 'homesick')?.officialWordId).toBe('W002410');
  expect(unit2.learningItems.filter(item => item.displayWord === 'nostalgic')).toEqual([]);
  expect(unit1.learningItems.find(item => item.displayWord === 'nostalgic')!.illustration).toBeUndefined();
  expect(approvedCurriculumCard('nostalgic', 'W006086')).toBeUndefined();
  expect(approval.illustrationApproval).toBe('not_approved');
  expect(words.find(word => word.wordId === 'W004001')?.word).toBe('witch/wizard');
});
