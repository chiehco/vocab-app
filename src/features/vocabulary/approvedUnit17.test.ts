import { expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import unit from '../direct/curriculumLV4Unit17.json';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { getWordDisplaySense } from '../browser/wordDisplay';
import type { WordRecord } from '../../db/types';
import { approvedUnit17Card } from './approvedUnit17';

it('connects every approved official Unit17 card to its image and reviewed meaning', () => {
  const cards = unit.learningItems.filter(item => item.kind === 'vocabulary' && item.officialWordId);
  expect(cards).toHaveLength(43);
  for (const card of cards) {
    expect(existsSync('public/' + card.illustration!.path)).toBe(true);
    expect(getWordBeastAsset(card.officialWordId!, card.displayWord!)).toContain(card.illustration!.path);
    const display = getWordDisplaySense({ wordId: card.officialWordId, word: card.displayWord } as WordRecord, []);
    expect(display).toMatchObject({ meaning: card.targetMeaningZh, pos: card.sensePos, needsReview: false, source: 'curriculum' });
  }
});
it('does not grant approval to unrelated IDs or supplementary words without official cards', () => {
  expect(approvedUnit17Card('frown', 'W000001')).toBeUndefined();
  expect(approvedUnit17Card('frustrated')).toBeUndefined();
});
