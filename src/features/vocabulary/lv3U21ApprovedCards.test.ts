import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { findUnit } from '../direct/model';
import { reviewedChapterMeaning } from '../direct/lv3U21Meanings';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { canUsePicturePrompt } from '../wordbeast/picturePrompt';
import { approvedCurriculumCard, approvedCurriculumCards, approvedCurriculumIllustration } from './approvedCurriculum';
import cards from './lv3U21ApprovedCards.json';

it.each(cards)('binds the approved $displayWord captions to the U21 item and its picture', card => {
  const item = findUnit(21, 'LV3')?.items.find(row => row.learningItemId === card.learningItemId);
  expect(item).toMatchObject({ officialWordId: card.officialWordId, displayWord: card.displayWord });
  expect(approvedCurriculumCards(card.displayWord, card.officialWordId)).toContainEqual(card);
  const { path, captionEn, captionZh } = card.illustration;
  expect(approvedCurriculumIllustration(card.displayWord, './' + path)).toEqual(card.illustration);
  expect(createHash('sha256').update(readFileSync('public/' + path)).digest('hex')).toBe(card.approval.imageSha256);
  const captions = JSON.stringify({ english: captionEn, chinese: captionZh });
  expect(createHash('sha256').update(captions).digest('hex')).toBe(card.approval.captionSha256);
});

it('keeps the earlier excellence default and reserves the invent picture for captioned study', () => {
  expect(getWordBeastAsset('W002299', 'excellence')).toContain('lv1-reviewed');
  expect(approvedCurriculumCard('excellence', 'W002299')).toBeUndefined();
  expect(approvedCurriculumCard('luggage', 'W002513')?.learningItemId).toBe('LI-LV3U21-V001');
  expect(getWordBeastAsset('W002446', 'invent')).toContain('curriculum/lv3-u21/invent-');
  expect(canUsePicturePrompt('W002446', 'invent')).toBe(false);
  expect(canUsePicturePrompt('W002513', 'luggage')).toBe(true);
});

it('retains the printed source while showing the approved U21 meanings', () => {
  const items = findUnit(21, 'LV3')!.items;
  const lookup = (id: string) => reviewedChapterMeaning('LI-LV3U21-' + id);
  expect(lookup('V028')).toContain('vt. 連續猛擊');
  expect(lookup('V033')).toContain('n. 砍擊；帶骨肉排');
  expect(lookup('V058')).toContain('v. 黏住、黏貼');
  expect(lookup('V001')).toEqual(lookup('V002'));
  expect(lookup('V002')).toContain('a piece of baggage');
  expect(items.find(item => item.learningItemId === 'LI-LV3U21-V058')?.chapterMeaningsZh).toBe('棍；棒；刺；枯枝');
});

