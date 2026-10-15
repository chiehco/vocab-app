import { expect, it } from 'vitest';
import verified from '../../../scripts/sources/LV5PrintedMetadataRepair.json';
import source1 from '../../../scripts/sources/LV5Unit1.json';
import source3 from '../../../scripts/sources/LV5Unit3.json';
import source4 from '../../../scripts/sources/LV5Unit4.json';
import source5 from '../../../scripts/sources/LV5Unit5.json';
import source6 from '../../../scripts/sources/LV5Unit6.json';
import compiled1 from './curriculumLV5Unit1.json';
import compiled3 from './curriculumLV5Unit3.json';
import compiled4 from './curriculumLV5Unit4.json';
import compiled5 from './curriculumLV5Unit5.json';
import compiled6 from './curriculumLV5Unit6.json';

type Source = { related: { word: string; sourcePage: number; printedLabel?: string }[]; usage: { label: string; printedLabel?: string }[] };
type Compiled = { learningItems: { kind: string; displayWord?: string; sourcePage: number; printedLabel?: string }[] };
const units: Record<number, [Source, Compiled]> = {
  1: [source1, compiled1], 3: [source3, compiled3], 4: [source4, compiled4],
  5: [source5, compiled5], 6: [source6, compiled6],
};

for (const evidence of verified.units) {
  it(`LV5 U${evidence.unit} retains every independently checked literal printed mark and empty row`, () => {
    const [source, compiled] = units[evidence.unit];
    expect(evidence.relatedLabels).toHaveLength(source.related.length);
    for (const observed of evidence.relatedLabels) {
      const related = source.related[observed.sourceIndex];
      const item = compiled.learningItems[evidence.headwordCount + observed.sourceIndex];
      expect([related.word, related.sourcePage, related.printedLabel ?? ''])
        .toEqual([observed.word, observed.sourcePage, observed.expectedPrintedLabel]);
      expect([item.displayWord, item.sourcePage, item.printedLabel])
        .toEqual([observed.word, observed.sourcePage, observed.expectedPrintedLabel]);
      if (!observed.expectedPrintedLabel) expect(Object.hasOwn(related, 'printedLabel')).toBe(false);
    }
    for (const observed of evidence.sourceOnlyUsageStars) {
      expect(source.usage[observed.sourceIndex]).toMatchObject({ label: observed.pattern, printedLabel: '*' });
    }
    for (const item of compiled.learningItems.filter(item => item.kind === 'grammar')) {
      expect(Object.hasOwn(item, 'printedLabel')).toBe(false);
    }
  });
}

it('retains the printed administration article/surname rule and the comment noun correction', () => {
  const rule = '因此 administration 之前必須置定冠詞 the，之後再置總統的姓氏';
  expect(source4.usage[25].explanationZh).toContain(rule);
  expect(compiled4.learningItems[139].explanationZh).toBe(source4.usage[25].explanationZh);
  expect(source1.related[64].chapterMeaningsZh).toBe('評語；批評；評論（與介詞on並用）');
  expect(compiled1.learningItems[106].targetMeaningZh).toBe(source1.related[64].chapterMeaningsZh);
  expect(compiled1.learningItems[106].chapterMeaningsZh).toBe(source1.related[64].chapterMeaningsZh);
  expect(source1.headwords[33].chapterMeaningsZh).toBe('評論；（系統性的）註解；（電視或電臺上的）解說；實況報導');
});

it('does not give neighboring unstarred words inherited stars', () => {
  expect(source3.printedStarWords).toEqual(['enact', 'linguistics', 'truffle', 'pediatrics', 'plaintiff', 'lavender']);
  expect(source4.printedStarWords).toEqual(['world-renowned', 'grandeur', 'sound', 'sunscreen']);
  expect(source1.corrections[4]).toBe('Prospect and justify belong to U2 page10, not U1. Only boundary evidence for p10 adopted; no U2 body content imported.');
  expect(source1.corrections[5]).toContain('no star inheritance');
});
