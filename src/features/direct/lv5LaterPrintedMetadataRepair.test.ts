import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import verified from '../../../scripts/sources/LV5LaterPrintedMetadataRepair.json';
import { findUnit } from './model';

type Source = {
  related: { word: string; sourcePage: number; printedLabel?: string }[];
  usage: { label: string; printedLabel?: string }[];
};
for (const evidence of verified.units) {
  it(`LV5 U${evidence.unit} preserves every independently photographed literal marker and empty occurrence`, () => {
    const source = JSON.parse(readFileSync(new URL(`../../../scripts/sources/LV5Unit${evidence.unit}.json`, import.meta.url), 'utf8')) as Source;
    const unit = findUnit(evidence.unit, 'LV5')!;
    expect(evidence.relatedLabels).toHaveLength(source.related.length);
    for (const observed of evidence.relatedLabels) {
      const related = source.related[observed.sourceIndex];
      expect([related.word, related.sourcePage, related.printedLabel ?? ''])
        .toEqual([observed.word, observed.sourcePage, observed.expectedPrintedLabel]);
      expect(unit.items[evidence.headwordCount + observed.sourceIndex]).toMatchObject({
        displayWord: observed.word, sourcePage: observed.sourcePage, printedLabel: observed.expectedPrintedLabel,
      });
      if (!observed.expectedPrintedLabel) expect(Object.hasOwn(related, 'printedLabel')).toBe(false);
    }
    for (const observed of evidence.sourceOnlyUsageMarkers) {
      expect(source.usage[observed.sourceIndex]).toMatchObject({ label: observed.pattern, printedLabel: observed.expectedPrintedLabel });
    }
    for (const item of unit.items.filter(item => item.kind === 'grammar')) expect(Object.hasOwn(item, 'printedLabel')).toBe(false);
  });
}
if (verified.units.some(unit => unit.unit === 12)) it('keeps duplicate workable occurrences classified by their own printed page', () => {
  const unit = findUnit(12, 'LV5')!;
  const occurrences = unit.items.filter(item => item.kind === 'vocabulary' && item.displayWord === 'workable');
  expect(occurrences).toEqual(expect.arrayContaining([
    expect.objectContaining({ sourcePage: 110, printedLabel: '*' }),
    expect.objectContaining({ sourcePage: 112, printedLabel: '似' }),
  ]));
  expect(occurrences).toHaveLength(2);
});
if (verified.units.some(unit => unit.unit === 12)) it('retains the full photographed handicraft/artifact comparison at the existing U12 occurrence', () => {
  const unit = findUnit(12, 'LV5')!;
  expect(unit.items).toHaveLength(164);
  expect(unit.items.filter(item => item.kind === 'grammar')).toHaveLength(51);
  expect(unit.items[76]).toMatchObject({
    learningItemId: 'LI-LV5U12-V077', officialWordId: 'W005411', sourcePage: 109, printedLabel: '比',
    chapterMeaningsZh: '手工藝品（常用複數）。比較：handicraft 指的是一般的「手工藝品（常用複數）」，而 artifact 則指具有考古學或文化上意義、由過去的人所做的「歷史文物」。',
  });
});
if (verified.units.some(unit => unit.unit === 9)) it('retains the photographed murmur noun meaning without changing its occurrence', () => {
  const unit = findUnit(9, 'LV5')!;
  expect(unit.items[56]).toMatchObject({ sourcePage: 78, displayWord: 'murmur', targetMeaningZh: '低語聲；低語說；私下抱怨', chapterMeaningsZh: '低語聲；低語說；私下抱怨' });
});
