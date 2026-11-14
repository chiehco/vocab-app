import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import images from './approvedExampleImages.json';
import audit from '../../../scripts/approvals/example-images-20261105.json';
import words from '../../../public/data/v1/words.json';
import examples from '../../../public/data/v1/examples.json';
import senses from '../../../public/data/v1/senses.json';
import bootstrap from '../../../public/data/v1/sa-pack.json';
import { approvedCurriculumIllustration, approvedWordIllustration } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { resolveWordImageClue } from '../../quiz/imageClue';
import { recordedMeanings } from '../browser/meaningRecords';
import type { WordRecord } from '../../db/types';
import WordDetailScreen from '../browser/WordDetailScreen';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: vi.fn() }));
vi.mock('../modes/useStudyBookmark', () => ({ useStudyBookmark: vi.fn() }));
vi.mock('../../hooks/useCardPronunciation', () => ({ useCardPronunciation: vi.fn() }));
vi.mock('../wordbeast/useIllustrationMedia', () => ({ useIllustrationMedia: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('three approved example illustrations', () => {
  it('contains only the approved words/examples and preserves their identities', () => {
    expect(images.map(c => [c.officialWordId, c.word, c.exampleId])).toEqual([
      ['W000301', 'feed', 'EX0577146b'],
      ['W000306', 'file', 'EX24d99801'],
      ['W000317', 'flower', 'EX9ecb5a77'],
    ]);
    expect(audit.items).toHaveLength(3);
    expect(new Set(images.map(c => c.illustration.path)).size).toBe(3);
  });

  it.each(images)('binds $word to the reviewed example, exact artwork and caption', card => {
    const word = words.find(w => w.wordId === card.officialWordId)!;
    const example = examples.find(e => e.exampleId === card.exampleId)!;
    const approval = audit.items.find(a => a.exampleId === card.exampleId)!;
    expect(word.word).toBe(card.word);
    expect(bootstrap.words.some(w => w.wordId === word.wordId)).toBe(true);
    expect(example).toMatchObject({ word: card.word, sensePos: card.sensePos,
      sentenceEn: card.illustration.captionEn, sentenceZh: card.illustration.captionZh,
      answer: card.word, status: 'reviewed' });
    expect(approval).toMatchObject({ wordId: word.wordId, word: card.word });
    const bytes = readFileSync('public/' + card.illustration.path);
    expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
    expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(approval.publishedImageSha256);
    expect(approval.sourceImageSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(approval.resizedPngSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(card.illustration.path).toContain(approval.resizedPngSha256.slice(0, 12));
    const asset = getWordBeastAsset(word.wordId, word.word)!;
    expect(asset).toContain(card.illustration.path + '?v=');
    expect(approvedWordIllustration(word.word, word.wordId)).toEqual(card.illustration);
    expect(approvedCurriculumIllustration(word.word, asset)).toEqual(card.illustration);
    expect(resolveWordImageClue(word.word, asset, '舊圖說', '舊例句', '舊義項提示')?.text)
      .toBe(card.illustration.captionZh);
    expect(approvedWordIllustration(word.word, 'W999999')).toBeUndefined();
    expect(approvedCurriculumIllustration('wrong-word', asset)).toBeUndefined();
    expect(approvedCurriculumIllustration(word.word, '/wordbeast/unrelated.webp')).toBeUndefined();
    // These artwork approvals must not create dictionary meanings or a fictional sense link.
    expect(senses.filter(s => s.wordId === word.wordId)).toEqual([]);
    expect(recordedMeanings(word as unknown as WordRecord, [])).toEqual([]);
    expect(card.illustration).not.toHaveProperty('senseId');
  });

  it.each(images)('renders $word card with its own example when no legacy media exists', card => {
    const word = words.find(w => w.wordId === card.officialWordId)!;
    const example = examples.find(e => e.exampleId === card.exampleId)!;
    vi.mocked(useLiveQuery).mockReturnValue(undefined)
      .mockReturnValueOnce(undefined).mockReturnValueOnce(word).mockReturnValueOnce([])
      .mockReturnValueOnce([]).mockReturnValueOnce([example]).mockReturnValueOnce([])
      .mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce([]);
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={[`/word/${word.wordId}`]}>
      <Routes><Route path="/word/:wordId" element={<WordDetailScreen />} /></Routes>
    </MemoryRouter>);
    expect(html).toContain(card.illustration.path);
    expect(html).toContain(card.illustration.captionEn);
    expect(html).toContain(card.illustration.captionZh);
    expect(html).not.toContain('圖片尚未收錄');
    expect(html).not.toContain('圖片／圖說對應：');
    expect(html).toContain('圖說');
    expect(html).toContain('字義');
  });
});
