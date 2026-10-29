import { describe, expect, it } from 'vitest';
import source12 from '../../../scripts/drafts/recovered-units/LV3Unit12.source.json';
import source18 from '../../../scripts/drafts/recovered-units/LV3Unit18.source.json';
import source21 from '../../../scripts/drafts/recovered-units/LV6Unit21.source.json';
import draft12 from '../../../scripts/drafts/recovered-units/LV3Unit12.curriculum.json';
import draft18 from '../../../scripts/drafts/recovered-units/LV3Unit18.curriculum.json';
import draft21 from '../../../scripts/drafts/recovered-units/LV6Unit21.curriculum.json';
import plan from '../../../scripts/drafts/recovered-units/integration-plan.json';
import words from '../../../public/data/v1/words.json';
import starter from '../../../public/data/v1/sa-pack.json';
import { findUnit, learningItems, type LearningItem } from './model';
import { practiceIds } from '../vocabulary/model';
import { unitReleaseHold } from '../vocabulary/unitReleasePolicy';
import { groupWords } from './groupWords';
import type { WordRecord } from '../../db/types';

const units = [
  { source: source12, draft: draft12, numbered: 35, heads: 45, pages: 12 },
  { source: source18, draft: draft18, numbered: 28, heads: 45, pages: 10 },
  { source: source21, draft: draft21, numbered: 38, heads: 46, pages: 9 },
];

describe('recovered-page unit drafts remain separate from published material', () => {
  it.each(units)('$source.level Unit $source.unit covers every printed page and next-unit boundary', ({ source, numbered, heads, pages }) => {
    expect(source.publicationStatus).toBe('draft_not_registered');
    expect(source.headwords).toHaveLength(heads);
    expect(source.headwords.filter(h => h.printedNumber).map(h => h.printedNumber))
      .toEqual(Array.from({ length: numbered }, (_, i) => i + 1));
    const start = source.sourcePages[0], end = source.sourcePages[1];
    expect(source.photos.filter(p => p.pageType === 'content').map(p => p.sourcePage))
      .toEqual(Array.from({ length: pages }, (_, i) => start + i));
    expect(source.photos.at(-1)).toMatchObject({ sourcePage: end + 1, pageType: 'boundary', printedUnit: `Unit ${source.unit + 1}` });
    for (const photo of source.photos) {
      expect(photo.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(photo.file).not.toMatch(/[\\/]/);
      expect(photo.pixelReview).toBeTruthy();
    }
  });

  it.each(units)('$source.level Unit $source.unit maps only existing words and keeps stable source identities', ({ source, draft }) => {
    const rows = [...source.headwords, ...source.related];
    const vocabulary = draft.learningItems.filter(i => i.kind === 'vocabulary');
    expect(vocabulary.map(i => i.displayWord)).toEqual([...source.headwordOrder, ...source.related.map(r => r.word)]);
    for (const [index, row] of rows.entries()) {
      const item = vocabulary[index];
      expect(item.learningItemId).toBe(row.learningItemId);
      expect(item.sourcePage).toBe(row.sourcePage);
      expect(item.targetMeaningZh).toBe(row.chapterMeaningsZh);
      expect(item.officialWordId).toBe(row.officialWordId);
      if (!row.officialWordId) continue;
      const official = words.find(w => w.wordId === row.officialWordId)!;
      expect(official.word).toBe(row.officialWord);
      expect([official.word, ...official.wordVariants].map(v => v.toLowerCase())).toContain(row.word.toLowerCase());
    }
    const ids = draft.learningItems.map(i => i.learningItemId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some(id => learningItems.some(i => i.learningItemId === id))).toBe(false);
  });

  it('retains the recovered p120 terms and its two missing official identities', () => {
    const expected = ['reliable','dependable','holy','divine','sacred','survivor','survive','survival','wicked','wickedness','evil','innocent','innocence'];
    const rows = [...source12.headwords, ...source12.related].filter(r => r.sourcePage === 120);
    for (const word of expected) expect(rows.some(r => r.word === word)).toBe(true);
    expect(rows.filter(r => expected.includes(r.word) && r.officialWordId)).toHaveLength(11);
    for (const word of ['dependable','wickedness']) expect(rows.find(r => r.word === word)?.officialWordId).toBeNull();
    expect(source12.headwordOrder.slice(0, 5)).toEqual(['capture','ambition','rely','reliable','holy']);
    expect(source12.headwordOrder.slice(-2)).toEqual(['basement','bet']);
    expect(source12.photos.find(p => p.sourcePage === 130)?.file).toBe('2-Photo-2.jpg');
  });

  it('preserves tune vi/vt, reliable dim forms and knot continuation without duplicate heads', () => {
    expect(source18.headwords.find(r => r.word === 'tune')).toMatchObject({ sourcePage: 193, sourcePos: 'n./vi./vt.' });
    expect(source18.headwords.find(r => r.word === 'tune')?.chapterMeaningsZh).toContain('調到……的頻道（vi.）');
    expect(source18.usage.find(u => u.label === 'dim – dimmed – dimmed')).toMatchObject({ sourcePage: 193, sourceWord: 'dim' });
    expect(source18.headwords.filter(r => r.word === 'knot')).toHaveLength(1);
    expect(source18.headwords.find(r => r.word === 'knot')?.sourcePage).toBe(192);
    expect(source18.usage.find(u => u.label === 'tie the knot with sb')).toMatchObject({ sourcePage: 193, sourceWord: 'knot' });
    const continuation = draft18.learningItems.find(i => i.kind === 'grammar' && i.pattern === 'tie the knot with sb');
    expect(continuation).toMatchObject({ sourcePage: 193, sourceWord: 'knot' });
    for (const word of ['athlete','ribbon','saucer','sauce','receiver']) expect(source18.headwordOrder).toContain(word);
  });

  it('uses printed p199 and p201 independently without the historical staging offset', () => {
    expect(source21.headwords.filter(r => r.sourcePage === 199).map(r => [r.word, r.printedNumber]))
      .toEqual([['panorama',17],['pesticide',18],['pious',19],['Xerox',20],['obstinate',21],['sly',22]]);
    expect(source21.headwords.filter(r => r.sourcePage === 201 && r.printedNumber).map(r => r.word))
      .toEqual(['chimpanzee','restrain','sportsman','awhile']);
    expect(source21.headwords.find(r => r.word === 'restraint')).toMatchObject({ sourcePage: 201, role: 'unnumbered_headword' });
    for (const word of ['panorama','pesticide','pious','Xerox']) expect(source21.headwords.find(r => r.word === word)?.officialWordId).toBeNull();
    expect(source21.photos.find(p => p.sourcePage === 199)?.file).toBe('1-Photo-1.jpg');
  });

  it('records existing starter requirements and can resolve the proposed groups without creating lexicon IDs', () => {
    for (const unit of plan.units) {
      const source = units.find(u => `${u.source.level}Unit${u.source.unit}` === unit.name)!.source;
      const ids = [...new Set([...source.headwords, ...source.related].flatMap(r => r.officialWordId ? [r.officialWordId] : []))];
      expect(unit.missingFromCurrentStarter).toEqual(ids.filter(id => !starter.words.some(w => w.wordId === id)).sort());
      const additions = words.filter(w => unit.missingFromCurrentStarter.includes(w.wordId));
      expect(additions).toHaveLength(unit.missingFromCurrentStarter.length);
      expect(groupWords(ids, [...starter.words, ...additions] as unknown as WordRecord[])).toHaveLength(ids.length);
    }
  });

  it('keeps current entries, questions, review state and LV6 hold unchanged', () => {
    expect(findUnit(12, 'LV3')).toBeUndefined();
    expect(findUnit(18, 'LV3')).toBeUndefined();
    expect(findUnit(21, 'LV6')).toBeUndefined();
    expect(unitReleaseHold('LV6', 21)?.status).toBe('source_page_pending');
    expect(plan.releaseHoldUnchanged).toBe(true);
    for (const { draft } of units) {
      expect(draft.releaseReview).toMatchObject({ status: 'pending_owner_data_release', registered: false, holdChange: false, publicDataChange: false });
      expect(draft.questions).toEqual([]);
      expect(practiceIds(draft.learningItems as unknown as LearningItem[])).toEqual([]);
      expect(draft.learningItems.every(i => i.practiceMode === 'read_only' && !('illustration' in i) && !('originalExample' in i) && !i.officialSenseId)).toBe(true);
    }
  });
});
