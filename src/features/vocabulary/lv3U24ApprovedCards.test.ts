import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { findUnit } from '../direct/model';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { approvedCurriculumCards, approvedCurriculumItem } from './approvedCurriculum';
import cards from './lv3U24ApprovedCards.json';

const unit = findUnit(24, 'LV3')!;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

it('registers the six approved U24 pairs and preserves supplemental identities', () => {
  expect(cards.map(card => card.displayWord)).toEqual(['chimney', 'clip', 'tack', 'countable', 'dearly', 'energetic']);
  expect(cards.filter(card => !card.officialWordId).map(card => card.displayWord)).toEqual(['tack', 'dearly']);
  expect(cards.find(card => card.displayWord === 'dearly')?.illustration.captionZh)
    .toBe('爺爺非常喜歡和孫子女共度時光。');
  expect(approvedCurriculumItem('LI-LV3U24-V007')).toBeUndefined();
});

it.each(cards)('binds $displayWord to its exact textbook entry, artwork and captions', card => {
  expect(unit.items.find(item => item.learningItemId === card.learningItemId)).toMatchObject({
    displayWord: card.displayWord, officialWordId: card.officialWordId,
  });
  expect(approvedCurriculumItem(card.learningItemId)).toEqual(card);
  expect(hash(readFileSync('public/' + card.illustration.path))).toBe(card.approval.imageSha256);
  expect(hash(JSON.stringify({ english: card.illustration.captionEn, chinese: card.illustration.captionZh })))
    .toBe(card.approval.captionSha256);
  if (card.officialWordId) {
    expect(approvedCurriculumCards(card.displayWord, card.officialWordId)).toContainEqual(card);
    const primary = getWordBeastAsset(card.officialWordId, card.displayWord);
    expect(primary).toContain(card.displayWord === 'countable'
      ? 'wordbeast/lv1-reviewed/LV1-U15-35-' : card.illustration.path);
    if (card.displayWord === 'countable') expect(card).toHaveProperty('secondaryOnGeneralCard', true);
  } else {
    expect(approvedCurriculumCards(card.displayWord)).toEqual([]);
  }
  expect(approvedCurriculumCards(card.displayWord, 'W999999')).toEqual([]);
});
