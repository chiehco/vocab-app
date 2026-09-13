import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import pack from '../../../public/data/v1/sa-pack.json';
import rows from './illustrationCaptions.json';
import { getIllustrationCaption } from './illustrationCaptions';
import StudyIllustration from './StudyIllustration';

describe('image caption pairs', () => {
  it('covers every installed approved scenario caption without reusing embedded English', () => {
    const sources = pack.media.filter(m => m.status === 'approved' && m.imageType === 'scenario' && m.captionZh);
    expect(sources).toHaveLength(742);
    expect(rows).toHaveLength(sources.length);
    expect(new Set(rows.map(r => r.captionZh)).size).toBe(rows.length);
    for (const source of sources) {
      const pair = getIllustrationCaption(source.captionZh)!;
      expect(pair.en.length).toBeGreaterThan(10);
      expect(pair.en).not.toMatch(/[\u4e00-\u9fff]/);
      expect(pair.zh).toMatch(/[\u4e00-\u9fff]/);
      expect(pair.zh).not.toMatch(/[a-zA-Z]/);
      const embeddedEnglish = source.captionZh.split('\n').find(s => /^[A-Za-z]/.test(s));
      if (embeddedEnglish) expect(pair.en).not.toBe(embeddedEnglish.trim());
    }
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
});
