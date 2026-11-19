import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { findUnit } from '../direct/model';
import { canUsePicturePrompt } from '../wordbeast/picturePrompt';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { approvedCurriculumCards, approvedCurriculumIllustration } from './approvedCurriculum';
import cards from './lv3U22ApprovedCards.json';

const unit = findUnit(22, 'LV3')!;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

it.each(cards)('resolves the approved U22 $displayWord pair by item, word ID and asset', card => {
  const { displayWord, officialWordId, illustration, approval } = card;
  expect(unit.items.find(item => item.learningItemId === card.learningItemId)).toMatchObject({ displayWord, officialWordId });
  expect(approvedCurriculumCards(displayWord, officialWordId)).toContainEqual(card);
  expect(approvedCurriculumIllustration(displayWord, './' + illustration.path)).toEqual(illustration);
  expect(hash(readFileSync('public/' + illustration.path))).toBe(approval.imageSha256);
  expect(hash(JSON.stringify({ english: illustration.captionEn, chinese: illustration.captionZh }))).toBe(approval.captionSha256);
  if (getWordBeastAsset(officialWordId, displayWord)?.includes(illustration.path)) {
    expect(canUsePicturePrompt(officialWordId, displayWord)).toBe(false);
  }
});

it('keeps cowardice text-only and teaches hug with the approved verb caption', () => {
  expect(cards.map(card => card.displayWord)).toEqual(['bravery', 'brave', 'courage', 'cradle', 'hug']);
  expect(approvedCurriculumCards('cowardice')).toEqual([]);
  expect(unit.items.find(item => item.displayWord === 'cowardice')).toMatchObject({
    officialWordId: null, sensePos: 'n.', chapterMeaningsZh: '膽小；懦弱', practiceMode: 'read_only',
  });
  expect(cards.find(card => card.displayWord === 'hug')?.illustration.captionEn)
    .toBe('Dad hugged me after my first day at my new school.');
});

it('retains the earlier courage and cradle pictures for existing general cards and picture practice', () => {
  for (const [word, id, path] of [
    ['courage', 'W001204', 'wordbeast/priest-courage.png'],
    ['cradle', 'W002200', 'wordbeast/s/W002200.webp'],
  ]) {
    expect(getWordBeastAsset(id, word)).toContain(path);
    expect(canUsePicturePrompt(id, word)).toBe(true);
    expect(approvedCurriculumCards(word, id).some(card => card.secondaryOnGeneralCard)).toBe(true);
  }
});
