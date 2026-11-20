import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { findUnit } from '../direct/model';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { canUsePicturePrompt } from '../wordbeast/picturePrompt';
import { approvedCurriculumCards, approvedCurriculumIllustration } from './approvedCurriculum';
import cards from './lv3U23ApprovedCards.json';

const unit = findUnit(23, 'LV3')!;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

it.each(cards)('resolves the approved U23 $displayWord image and both captions', card => {
  const { learningItemId, displayWord, officialWordId, illustration, approval } = card;
  const dictionaryWord = displayWord === 'microphone' ? 'microphone/mike' : displayWord;
  expect(unit.items.find(item => item.learningItemId === learningItemId)).toMatchObject({ displayWord, officialWordId });
  expect(approvedCurriculumCards(displayWord, officialWordId)).toContainEqual(card);
  expect(approvedCurriculumCards(dictionaryWord, officialWordId)).toContainEqual(card);
  expect(approvedCurriculumIllustration(dictionaryWord, './' + illustration.path)).toEqual(illustration);
  expect(hash(readFileSync('public/' + illustration.path))).toBe(approval.imageSha256);
  expect(hash(JSON.stringify({ english: illustration.captionEn, chinese: illustration.captionZh }))).toBe(approval.captionSha256);
  if (displayWord === 'parcel') {
    expect(getWordBeastAsset(officialWordId, dictionaryWord)).toContain('wordbeast/lv1-reviewed/LV1-U23-40-');
    expect(card.secondaryOnGeneralCard).toBe(true);
  } else {
    expect(getWordBeastAsset(officialWordId, dictionaryWord)).toContain(illustration.path);
    expect(canUsePicturePrompt(officialWordId, dictionaryWord)).toBe(false);
  }
});

it('retains both microphone spellings as separate items and teaches the corrected constructions', () => {
  const microphone = unit.items.find(item => item.displayWord === 'microphone')!;
  const mike = unit.items.find(item => item.displayWord === 'mike')!;
  expect(mike.learningItemId).not.toBe(microphone.learningItemId);
  expect(mike.officialWordId).toBe(microphone.officialWordId);
  expect(mike.targetMeaningZh).toBe('麥克風（microphone 的別稱）');
  expect(approvedCurriculumCards('microphone/mike', 'W002540')).toEqual([]);
  expect(cards.find(card => card.displayWord === 'pal')?.illustration.captionEn).toBe('My pal and I are studying together.');
  expect(unit.items.find(item => item.learningItemId === 'LI-LV3U23-G008')?.pattern).toBe('parcel something out (to someone)');
  expect(unit.items.find(item => item.learningItemId === 'LI-LV3U23-G030')?.pattern).toBe('mist up / mist something up');
});

