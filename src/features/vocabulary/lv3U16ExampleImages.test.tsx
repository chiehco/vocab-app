import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import allRegistry from './lv3U16ExampleImages.json';
import batch from '../../../docs/lv3-audit-20261107/U16-example-images-batch1.json';
import examples from '../../../public/data/v1/examples.json';
import words from '../../../public/data/v1/words.json';
import { approvedCurriculumIllustration, approvedWordIllustration } from './approvedCurriculum';
import { getWordBeastAsset } from '../wordbeast/wordBeastAssets';
import { resolveWordImageClue } from '../../quiz/imageClue';
import WordDetailScreen from '../browser/WordDetailScreen';
import StudyIllustration from '../wordbeast/StudyIllustration';
import { prefetchTodayImages, WORD_BEAST_IMAGE_CACHE } from '../wordbeast/prefetchTodayImages';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: vi.fn() }));
vi.mock('../modes/useStudyBookmark', () => ({ useStudyBookmark: vi.fn() }));
vi.mock('../../hooks/useCardPronunciation', () => ({ useCardPronunciation: vi.fn() }));
vi.mock('../wordbeast/useIllustrationMedia', () => ({ useIllustrationMedia: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());
const registry = allRegistry.filter(row => batch.items.some(item => item.registryRow.exampleId === row.exampleId));
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');

it('contains exactly the32 U16 candidate bindings', () => {
 expect(allRegistry).toEqual(batch.items.map(item => item.registryRow));
 expect(allRegistry).toHaveLength(32);
 for(const values of [allRegistry.map(r=>r.word),allRegistry.map(r=>r.officialWordId),allRegistry.map(r=>r.exampleId),allRegistry.map(r=>r.illustration.path)]) expect(new Set(values).size).toBe(32);
});

it.each(batch.items)('binds $registryRow.word to its exact unchanged example, ID and original image bytes', item => {
  const row = item.registryRow;
  expect(words.find(word => word.wordId === row.officialWordId)?.word).toBe(row.word);
  const example = examples.find(value => value.exampleId === row.exampleId);
  expect(example).toEqual({...item.selectedExampleAtPreparation,sensePos:item.expectedFinalSensePos,status:item.expectedFinalStatus});
  expect(example?.status).toBe('reviewed');
  expect(row.sensePos).toBe(example?.sensePos);
  expect(row.illustration.captionEn).toBe(example?.sentenceEn);
  expect(row.illustration.captionZh).toBe(example?.sentenceZh);
  expect(row.illustration).not.toHaveProperty('senseId');
  expect(item.manualUserApproved).toBe(false);
  expect(item.authorizedRepairWithoutPerImageApproval).toBe(true);
  expect(item.pixelReview.actuallyViewed).toBe(true);
  expect(item.pixelReview.acceptedForSelectedExampleOnly).toBe(true);
  for (const other of item.otherExamplesNotCovered) {
    const id = typeof other === 'string' ? other : other.exampleId;
    const found = examples.find(value => value.exampleId === id);
    expect(found).toBeDefined();
    if(typeof other !== 'string') for(const key of ['sentenceEn','sentenceZh','blankSentence','answer'] as const) expect(found?.[key]).toEqual(other[key]);
    expect(allRegistry.some(value => value.exampleId === (typeof other === 'string' ? other : other.exampleId))).toBe(false);
  }
  const bytes = readFileSync(item.publishedPath);
  expect(hash(bytes)).toBe(item.sha256);
  expect(bytes).toHaveLength(item.bytes);
  expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
  expect(bytes.subarray(12, 16).toString()).toBe('VP8L');
  expect(bytes[20]).toBe(0x2f);
  const dimensions = bytes.readUInt32LE(21);
  expect([(dimensions & 0x3fff) + 1, ((dimensions >>> 14) & 0x3fff) + 1]).toEqual(item.dimensions);
  expect(item.conversion.decodedPixelEquality).toBe(true);
  expect(item.conversion.noResizeCropOrSceneEdit).toBe(true);
  expect(item.conversion.rgbaPixelSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(item.sourceSha256).toBe(item.conversion.sourceSha256);
  expect(item.sha256).toBe(item.conversion.publishedSha256);
  expect(item.dimensions[0] * 3).toBe(item.dimensions[1] * 4);
  expect(item.publishedPath).toBe('public/' + row.illustration.path);
  expect(row.illustration.path).toContain(`${row.word.replaceAll('/', '-')}-${row.exampleId}-${item.sha256.slice(0, 12)}`);
  const damaged = Buffer.from(bytes); damaged[damaged.length - 1] ^= 1;
  expect(hash(damaged)).not.toBe(item.sha256);
});

it.each(registry)('resolves only the correct $word image/caption without a legacy media row', row => {
  const asset = getWordBeastAsset(row.officialWordId, row.word)!;
  expect(asset).toContain(row.illustration.path + '?v=');
  expect(approvedWordIllustration(row.word, row.officialWordId)).toEqual(row.illustration);
  expect(approvedWordIllustration(' ' + row.word.toUpperCase() + ' ', row.officialWordId)).toEqual(row.illustration);
  expect(approvedWordIllustration(row.word, 'W999999')).toBeUndefined();
  expect(approvedWordIllustration('unrelated', row.officialWordId)).toBeUndefined();
  expect(approvedCurriculumIllustration(row.word, asset)).toEqual(row.illustration);
  expect(approvedCurriculumIllustration('unrelated', asset)).toBeUndefined();
  expect(approvedCurriculumIllustration(row.word, '/wordbeast/unrelated.png')).toBeUndefined();
  for (const other of allRegistry.filter(value => value.word !== row.word)) {
    expect(approvedCurriculumIllustration(row.word, '/' + other.illustration.path)).toBeUndefined();
  }
  expect(resolveWordImageClue(row.word, asset, 'unrelated legacy caption')?.text).toBe(row.illustration.captionZh);
  const html = renderToStaticMarkup(<StudyIllustration src={asset} word={row.word} showSenseLabel />);
  expect(html).toContain(escape(row.illustration.captionEn));
  expect(html).toContain(escape(row.illustration.captionZh));
  expect(html).not.toContain('undefined');
});

it.each(registry)('renders $word general card with selected caption and both unchanged practice examples available', row => {
  const word = words.find(value => value.wordId === row.officialWordId)!;
  const pair = examples.filter(value => value.word === row.word);
  expect(pair.some(e=>e.exampleId===row.exampleId)).toBe(true);
  vi.mocked(useLiveQuery).mockReturnValue(undefined)
    .mockReturnValueOnce(undefined).mockReturnValueOnce(word).mockReturnValueOnce([])
    .mockReturnValueOnce([]).mockReturnValueOnce(pair).mockReturnValueOnce([])
    .mockReturnValueOnce([]).mockReturnValueOnce([]).mockReturnValueOnce([]);
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={[`/word/${word.wordId}`]}>
    <Routes><Route path="/word/:wordId" element={<WordDetailScreen />} /></Routes>
  </MemoryRouter>);
  expect(html).toContain(row.illustration.path);
  expect(html).toContain(escape(row.illustration.captionEn));
  expect(html).toContain(escape(row.illustration.captionZh));
  expect(html).not.toContain('圖片尚未收錄');
  expect(html).not.toContain('圖片適用義項：');
});

it('pins the entire accepted batch proof, including pixel review and uncovered examples', () => {
  const expected = '7567ca0f4a375affa6d539d19b8cf52f7216639293dfda8febc4d4fa5b89b9bd';
  expect(hash(JSON.stringify(batch))).toBe(expected);
  for (const key of Object.keys(batch)) {
    const changed: Record<string, unknown> = structuredClone(batch); changed[key] = 'unrecorded';
    expect(hash(JSON.stringify(changed))).not.toBe(expected);
  }
  for (const field of ['sha256', 'bytes', 'dimensions', 'pixelReview', 'selectedExampleAtPreparation', 'otherExamplesNotCovered']) {
    const changed = structuredClone(batch);
    (changed.items[0] as Record<string, unknown>)[field] = 'unrecorded';
    expect(hash(JSON.stringify(changed))).not.toBe(expected);
  }
});

it('prefetches the 32 exact assets once and reuses their bytes across asset revisions', async () => {
  const stored = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (request: Request, options: { ignoreSearch?: boolean }) => {
      expect(options.ignoreSearch).toBe(true);
      return stored.get(new URL(request.url).pathname)?.clone();
    }),
    put: vi.fn(async (request: Request, response: Response) => { stored.set(new URL(request.url).pathname, response.clone()); }),
  };
  const open = vi.fn(async () => cache); vi.stubGlobal('caches', { open });
  const fetchMock = vi.fn(async (request: Request) => {
    const file = batch.items.find(item => '/' + item.registryRow.illustration.path === new URL(request.url).pathname)!;
    expect(file).toBeDefined();
    return new Response(new Uint8Array(readFileSync(file.publishedPath)), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  const urls = registry.map(row => new URL(getWordBeastAsset(row.officialWordId, row.word)!, 'https://example.test/').href);
  const result = await prefetchTodayImages([...urls, urls[0]]);
  expect(result).toEqual({ processed: 32, cached: 32, failed: 0, total: 32, ready: true });
  expect(open).toHaveBeenCalledWith(WORD_BEAST_IMAGE_CACHE);
  expect(fetchMock).toHaveBeenCalledTimes(32);
  expect(cache.put).toHaveBeenCalledTimes(32);
  for (const item of batch.items) {
    const bytes = Buffer.from(await stored.get('/' + item.registryRow.illustration.path)!.clone().arrayBuffer());
    expect(hash(bytes)).toBe(item.sha256);
  }
  const again = await prefetchTodayImages(urls.map(url => url.replace(/\?v=.*/, '?v=next')));
  expect(again.ready).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(32);
});

it('does not claim the image pack ready when one of the 32 asset fetches fails', async () => {
  const put = vi.fn(async () => undefined);
  vi.stubGlobal('caches', { open: vi.fn(async () => ({ match: vi.fn(async () => undefined), put })) });
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => new Response('', { status: request.url.includes(registry[1].exampleId) ? 503 : 200 })));
  const urls = registry.map(row => new URL(getWordBeastAsset(row.officialWordId, row.word)!, 'https://example.test/').href);
  expect(await prefetchTodayImages(urls)).toEqual({ processed: 32, cached: 31, failed: 1, total: 32, ready: false });
  expect(put).toHaveBeenCalledTimes(31);
});
