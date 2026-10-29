import { expect, it } from 'vitest';
import pack from '../../../public/data/v1/sa-pack.json';
import lv5Baseline from '../../../scripts/fixtures/lv5-main-integration-baseline.json';
import { curriculumUnits, findUnit } from './model';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { unitReleaseHold } from '../vocabulary/unitReleasePolicy';

const selected = {
  LV1: [16, 17, 18, 19, 20, 21],
  LV2: Array.from({ length: 24 }, (_, n) => n + 27),
  LV3: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
};

it('retains the 42 former units, adds the two recovered LV3 units and keeps remaining source gaps out', () => {
  for (const [level, units] of Object.entries(selected)) {
    for (const unit of units) {
      expect(findUnit(unit, level)?.deliveryMode).toBe('text_only');
      expect(textbookUnits.some(row => row.level === level && row.unit === unit)).toBe(true);
    }
  }
  for (const [level, unit] of [['LV2', 26], ['LV3', 3], ['LV3', 25]] as const) {
    expect(findUnit(unit, level)).toBeUndefined();
    expect(textbookUnits.some(row => row.level === level && row.unit === unit)).toBe(false);
  }
  expect(new Set(curriculumUnits.flatMap(row => row.items.map(item => item.learningItemId))).size)
    .toBe(curriculumUnits.reduce((count, row) => count + row.items.length, 0));
});

it('keeps released LV4/LV5 identities, the LV4 U2 hold, and the ordinary prohibition noun', () => {
  expect(curriculumUnits.filter(row => row.level === 'LV4').map(row => row.unit)).toEqual(Array.from({ length: 24 }, (_, n) => n + 1));
  expect(textbookUnits.filter(row => row.level === 'LV4').map(row => row.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  expect(curriculumUnits.filter(row => row.level === 'LV5').map(row => row.unit)).toEqual(lv5Baseline.lv5Units);
  expect(unitReleaseHold('LV4', 2)).toBeUndefined();
  expect(findUnit(16, 'LV5')?.items.find(item => item.learningItemId === 'LI-LV5U16-V064'))
    .toMatchObject({ displayWord: 'prohibition', officialWordId: null, sensePos: 'vt.', practiceMode: 'read_only' });
  expect(pack.words.find(word => word.wordId === 'W005711')).toMatchObject({ word: 'prohibition', pos: 'n.' });
});

it('resolves every accepted existing mapping from the starter and keeps unmapped supplements readable only', () => {
  const installed = new Set(pack.words.map(word => word.wordId));
  for (const [level, units] of Object.entries(selected)) {
    for (const unit of units) {
      for (const item of findUnit(unit, level)!.items.filter(item => item.kind === 'vocabulary')) {
        if (item.officialWordId) expect(installed.has(item.officialWordId)).toBe(true);
        else expect(item.practiceMode).toBe('read_only');
      }
    }
  }
});
