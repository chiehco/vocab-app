import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import unit1 from '../direct/curriculum.json';
import unit2 from '../direct/curriculumUnit2.json';
import approval from './lv3ApprovedReview.json';
import { approvedCurriculumCard, approvedWordIllustration } from './approvedCurriculum';
import { allQuestions, templateGroup } from '../direct/model';
import { groupWordIds, resolveGroupWords } from '../direct/groupScope';
import { matchImportRows, selectedImportIds } from '../direct/groupImport';
import { getWordDisplaySense } from '../browser/wordDisplay';
import { resolveWordImageClue } from '../../quiz/imageClue';
import type { SenseRecord, WordRecord } from '../../db/types';
import words from '../../../public/data/v1/words.json';
import senses from '../../../public/data/v1/senses.json';
import pack from '../../../public/data/v1/sa-pack.json';
import meta from '../../../public/data/v1/meta.json';

it('publishes stable metadata hashes across Windows and Linux checkouts', () => {
  const files = ['words', 'senses', 'examples', 'relations', 'morphemes', 'notes', 'exam_priority', 'hooks', 'media'];
  const hash = createHash('sha256');
  for (const file of files) hash.update(readFileSync(`public/data/v1/${file}.json`, 'utf8').replaceAll('\r\n', '\n'));
  expect(meta.contentHash).toBe(hash.digest('hex'));
  expect(meta.wordsHash).toBe(createHash('sha256').update(readFileSync('public/data/v1/words.json', 'utf8').replaceAll('\r\n', '\n')).digest('hex'));
});

it('binds only the two approved LV3 illustrations to the exact original sentence and image bytes', () => {
  expect(approval.cards.map(card => card.reviewId)).toEqual(['LI-LV3U01-probability', 'LI-LV3U02-slender']);
  const items = [...unit1.learningItems, ...unit2.learningItems];
  for (const card of approval.cards) {
    const item = items.find(item => item.learningItemId === card.reviewId)!;
    expect(item.illustration).toEqual({ path: card.imagePath,
      captionEn: item.originalExample!.sentenceEn, captionZh: item.originalExample!.sentenceZh });
    const text = [item.displayWord, item.sensePos, item.targetMeaningZh,
      item.originalExample!.sentenceEn, item.originalExample!.sentenceZh];
    expect(createHash('sha256').update(JSON.stringify(text)).digest('hex')).toBe(card.textSha256);
    expect(createHash('sha256').update(readFileSync('public/' + card.imagePath)).digest('hex')).toBe(card.imageSha256);
    expect(card.artApproval).toBe('approved');
    expect(card.pairApproval).toBe('approved');
  }
  expect(items.filter(item => item.illustration).map(item => item.learningItemId))
    .toEqual(approval.cards.map(card => card.reviewId));
});

it('shows the approved slender meaning and dancer caption on the ordinary word card and image clue', () => {
  const word = words.find(word => word.wordId === 'W002812')!;
  const item = unit2.learningItems.find(item => item.displayWord === 'slender')!;
  expect(approvedCurriculumCard('slender', word.wordId)?.illustration).toEqual(item.illustration);
  expect(approvedWordIllustration(word.word, word.wordId)).toEqual(item.illustration);
  expect(getWordDisplaySense(word as WordRecord, [])).toMatchObject({ meaning: '苗條的', pos: 'adj.', needsReview: false });
  expect(resolveWordImageClue('slender', '/vocab-app/' + item.illustration!.path, '舊圖說'))
    .toMatchObject({ text: item.originalExample!.sentenceZh });
  expect(approvedCurriculumCard('slender', 'W000001')).toBeUndefined();
  const probability = unit1.learningItems.find(item => item.displayWord === 'probability')!;
  expect(probability.officialWordId).toBeNull();
  expect(approvedCurriculumCard('probability')).toBeUndefined();
});

it('resolves limousine and limo to one installed card, but preserves both practice IDs and examples', () => {
  const aliases = unit1.learningItems.filter(item => ['limousine', 'limo'].includes(item.displayWord ?? ''));
  expect(aliases.map(item => item.learningItemId)).toEqual(['LI-LV3U01-limousine', 'LI-LV3U01-limo']);
  expect(aliases.map(item => [item.lexemeRef, item.officialWordId, item.officialSenseId]))
    .toEqual([['W006085', 'W006085', 'W006085-1'], ['W006085', 'W006085', 'W006085-1']]);
  const formal = words.filter(word => word.wordVariants.some(alias => ['limousine', 'limo'].includes(alias)));
  expect(formal).toHaveLength(1);
  expect(formal[0]).toMatchObject({ wordId: 'W006085', word: 'limousine/limo', wordVariants: ['limousine', 'limo'] });
  expect(pack.words.filter(word => word.wordId === 'W006085')).toEqual(formal);
  expect(getWordDisplaySense(formal[0] as WordRecord, senses as SenseRecord[]))
    .toMatchObject({ meaning: '加長型禮車', pos: 'n.', needsReview: false, source: 'sense' });
  const matches = matchImportRows([{ row: 2, word: 'limousine', meaning: '' }, { row: 3, word: 'limo', meaning: '' }], pack.words as WordRecord[]);
  expect(matches.map(row => row.status)).toEqual(['matched', 'matched']);
  expect(selectedImportIds(matches, {})).toEqual({ ids: ['W006085'], duplicates: 1 });
  expect(groupWordIds(templateGroup(1)).filter(id => id === 'W006085')).toHaveLength(1);
  expect(resolveGroupWords(templateGroup(1), pack.words as WordRecord[]).filter(word => word.wordId === 'W006085')).toHaveLength(1);
  const questions = aliases.map(item => allQuestions.find(question => question.learningItemId === item.learningItemId && !question.options.length)!);
  expect(questions.map(question => [question.questionId, question.answer])).toEqual([
    ['CLOZE-ORIG-20260912-LV3U01-SUP-limousine', 'limousine'], ['CLOZE-ORIG-20260912-LV3U01-SUP-limo', 'limo'],
  ]);
  expect(questions[0].sentenceEn).toBe('A white limousine carried the film director to the opening ceremony.');
  expect(questions[1].sentenceEn).toBe('The driver parked the limo behind the concert hall.');
});

it('keeps determine/perform textbook senses and rejects promotion of pending pictures or words', () => {
  const determine = unit1.learningItems.find(item => item.displayWord === 'determine')!;
  const perform = unit2.learningItems.find(item => item.displayWord === 'perform')!;
  expect(determine.targetMeaningZh).toBe('確定');
  expect(determine.originalExample!.sentenceEn).toBe('A soil test can determine whether this field needs more nutrients.');
  expect(perform.targetMeaningZh).toBe('執行');
  expect(perform.originalExample!.sentenceEn).toBe('Only trained staff can perform this safety check.');
  expect(determine.illustration).toBeUndefined();
  expect(perform.illustration).toBeUndefined();
  expect(approvedCurriculumCard('determine')).toBeUndefined();
  expect(approvedCurriculumCard('perform')).toBeUndefined();
  expect(unit1.learningItems.find(item => item.displayWord === 'nostalgic')!.illustration).toBeUndefined();
  expect(words.find(word => word.wordId === 'W004001')?.word).toBe('witch/wizard');
});
