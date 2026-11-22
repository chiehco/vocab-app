import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import pack from '../../../public/data/v1/sa-pack.json';
import { lv3AfterUnitFile } from '../direct/lv3Audit.testSupport';
import {beforeLV4Published} from '../direct/lv4Published.testSupport';
import rows from './illustrationCaptions.json';
import { getIllustrationCaption } from './illustrationCaptions';
import StudyIllustration from './StudyIllustration';

let historicalPack: typeof pack | undefined;
const beforeMediaMigration = () => historicalPack ??= lv3AfterUnitFile('LV3-U05', 'public/data/v1/sa-pack.json', pack);

describe('image caption pairs', () => {
  it('covers all 742 original approved scenario captions at the authenticated pre-migration checkpoint', () => {
    const sources = beforeMediaMigration().media.filter(m => m.status === 'approved' && m.imageType === 'scenario' && m.captionZh);
    expect(sources).toHaveLength(742);
    expect(rows).toHaveLength(sources.length);
    expect(new Set(rows.map(r => r.captionZh)).size).toBe(rows.length);
    const historicalRows=beforeLV4Published('src/features/wordbeast/illustrationCaptions.json',rows);
    for (const source of sources) {
      const pair = historicalRows.find(row=>row.captionZh===source.captionZh)!;
      expect(pair.en.length).toBeGreaterThan(10);
      expect(pair.en).not.toMatch(/[\u4e00-\u9fff]/);
      expect(pair.zh).toMatch(/[\u4e00-\u9fff]/);
      expect(pair.zh).not.toMatch(/[a-zA-Z]/);
      const embeddedEnglish = source.captionZh.split('\n').find(s => /^[A-Za-z]/.test(s));
      if (embeddedEnglish) expect(pair.en).not.toBe(embeddedEnglish.trim());
    }
  });
  it('preserves every original source and gives all 302 added scenario captions an exact Chinese-only fallback', () => {
    const current = lv3AfterUnitFile('LV3-U06', 'public/data/v1/sa-pack.json', pack);
    const before = beforeMediaMigration().media;
    const originalIds = new Set(before.map(source => source.assetId));
    for (const source of before) expect(current.media.find(row => row.assetId === source.assetId)).toEqual(source);
    const sources = current.media.filter(source => source.status === 'approved' && source.imageType === 'scenario' && source.captionZh);
    expect(sources).toHaveLength(1044);
    const additions = sources.filter(source => !originalIds.has(source.assetId));
    expect(additions).toHaveLength(302);
    for (const source of additions) {
      expect(rows.some(row => row.captionZh === source.captionZh)).toBe(false);
      expect(getIllustrationCaption(source.captionZh)).toEqual({ en: '', zh: source.captionZh });
    }
    const unknown = structuredClone(pack);
    unknown.media[0].captionZh += ' unrecorded';
    expect(() => lv3AfterUnitFile('LV3-U06', 'public/data/v1/sa-pack.json', unknown)).toThrow(/drift/);
  });
  it('never pairs a changed or unknown caption with unrelated English', () => {
    expect(getIllustrationCaption('新的圖說')).toEqual({ en: '', zh: '新的圖說' });
    expect(getIllustrationCaption(undefined)).toBeUndefined();
    expect(getIllustrationCaption('  ')).toBeUndefined();
  });
  it('renders the interaction pair, while keeping both captions hidden on an unrevealed card', () => {
    const row = rows.find(r => r.word === 'interaction')!;
    const revealed = renderToStaticMarkup(createElement(StudyIllustration, { src: '/test.webp', word: row.word, caption: row.captionZh }));
    expect(revealed).toContain('Building a model together encourages interaction');
    expect(revealed).toContain(row.zh);
    expect(revealed).toContain('圖片載入中');
    const concealed = renderToStaticMarkup(createElement(StudyIllustration, { src: '/test.webp', word: row.word }));
    expect(concealed).not.toContain('<figcaption>');
    expect(concealed).not.toContain(row.en);
  });
  it('keeps an unlinked caption neutral and only names a supplied exact sense', () => {
    const neutral = renderToStaticMarkup(createElement(StudyIllustration, { src: '/test.webp', word: 'zztest', caption: '合成圖說', showSenseLabel: true }));
    expect(neutral).toContain('<small>圖說</small>');
    expect(neutral).not.toContain('義項未連結');
    const linked = renderToStaticMarkup(createElement(StudyIllustration, { src: '/test.webp', word: 'zztest', caption: '合成圖說', showSenseLabel: true, senseLabel: 'n. 合成義項' }));
    expect(linked).toContain('圖片／圖說對應：n. 合成義項');
  });
});
