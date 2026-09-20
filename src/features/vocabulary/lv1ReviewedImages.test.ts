import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import cards from './lv1ReviewedImages.json';
import audit from '../../../scripts/approvals/lv1-images-20260920.json';
import words from '../../../public/data/v1/words.json';
import bootstrap from '../../../public/data/v1/sa-pack.json';
import { approvedCurriculumCard, approvedCurriculumIllustration, approvedLV1Images, approvedWordIllustration } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { resolveWordImageClue } from '../../quiz/imageClue';

const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

describe('approved LV1 image-only release', () => {
  it('contains exactly the approved scope and preserves every final image and caption hash', () => {
    expect(cards).toHaveLength(434);
    expect(new Set(cards.map(c => c.id)).size).toBe(434);
    expect(cards.filter(c => c.unit === 1)).toHaveLength(38);
    expect(cards.filter(c => c.unit === 2)).toHaveLength(38);
    expect(cards.filter(c => c.unit === 3)).toHaveLength(22);
    for (const card of cards) {
      const record = audit.find(a => a.id === card.id)!;
      expect(record).toBeDefined();
      expect(hash(readFileSync('public/' + card.illustration.path))).toBe(record.publishedImageSha256);
      expect(hash(card.illustration.captionEn + '\n' + card.illustration.captionZh)).toBe(record.textSha256);
      const src = '/' + card.illustration.path + '?v=test';
      expect(approvedCurriculumIllustration(card.displayWord, src)).toEqual(card.illustration);
      expect(resolveWordImageClue(card.displayWord, src, 'unrelated old caption')?.text).toBe(card.illustration.captionZh);
      if (card.officialWordId) {
        const official = words.find(w => w.wordId === card.officialWordId)!;
        expect(official).toBeDefined();
        expect(bootstrap.words.some(w => w.wordId === official.wordId)).toBe(true);
        expect(approvedLV1Images(official.word, official.wordId)).toContainEqual(card);
        const expected = approvedCurriculumCard(official.word, official.wordId)?.illustration
          ?? approvedLV1Images(official.word, official.wordId)[0].illustration;
        expect(getWordBeastAsset(official.wordId, official.word)).toContain(expected.path);
      }
    }
  });

  it('does not invent IDs, promote dictionary senses, or match the wrong ID', () => {
    expect(cards.filter(c => !c.officialWordId)).toHaveLength(22);
    expect(approvedLV1Images('boy', 'W999999')).toEqual([]);
    expect(approvedWordIllustration('boy', 'W999999')).toBeUndefined();
    expect(approvedCurriculumCard('boy', 'W000114')).toBeUndefined();
    expect(approvedCurriculumIllustration('boy', '/wordbeast/unrelated.webp')).toBeUndefined();
    expect(approvedCurriculumIllustration('wrong-word', '/' + cards[0].illustration.path)).toBeUndefined();
  });

  it('uses the final Unit01 redraws and marriage correction', () => {
    for (const id of ['15', '27', '32', '36', '38']) {
      expect(audit.find(c => c.id === 'LV1-U01-' + id)?.sourceImage).toContain('_v2_');
    }
    expect(cards.find(c => c.id === 'LV1-U01-32')?.illustration.captionEn).toBe('They laughed at her jokes.');
    expect(cards.find(c => c.id === 'LV1-U12-33')?.illustration.captionEn)
      .toBe('They celebrated another year of marriage with a small cake.');
    for (const id of ['07-04', '08-73', '11-15', '12-24']) {
      expect(audit.find(c => c.id === 'LV1-U' + id)?.sourceImage).toContain('_v2.png');
    }
  });
});
