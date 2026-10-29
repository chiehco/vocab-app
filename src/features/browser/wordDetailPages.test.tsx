import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import WordDetailScreen from './WordDetailScreen';
import type { ExampleRecord, NoteRecord, WordRecord } from '../../db/types';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: vi.fn() }));
vi.mock('../modes/useStudyBookmark', () => ({ useStudyBookmark: vi.fn() }));
vi.mock('../../hooks/useCardPronunciation', () => ({ useCardPronunciation: vi.fn() }));
vi.mock('../wordbeast/useIllustrationMedia', () => ({ useIllustrationMedia: vi.fn() }));

const word = { wordId: 'W999001', word: 'zzpage', level: 'LV3', pos: 'n.', posAll: ['n.'], meaningZh: '測試字', meaningEn: 'a test word', usagePattern: null, syllables: null, stressPattern: null, phoneticUs: null, familyKey: null, isCore: false, sourceNote: null, status: 'reviewed' } as WordRecord;
const example = { exampleId: 'E1', word: 'zzpage', sentenceEn: 'This is a basic sentence.', sentenceZh: '這是基本例句。', exampleType: 'basic', status: 'reviewed' } as ExampleRecord;
const phrase = { noteId: 'N1', word: 'zzpage', noteType: 'phrase', title: 'zzpage up', content: '片語說明' } as NoteRecord;

// useLiveQuery 依元件內呼叫順序：group, word, groupCards, senses, examples, relations, examDistractors, morphemes, notes。
function render(examples: ExampleRecord[], notes: NoteRecord[]) {
  vi.mocked(useLiveQuery).mockReturnValue(undefined)
    .mockReturnValueOnce(undefined).mockReturnValueOnce(word).mockReturnValueOnce([])
    .mockReturnValueOnce([]).mockReturnValueOnce(examples).mockReturnValueOnce([]).mockReturnValueOnce([])
    .mockReturnValueOnce([]).mockReturnValueOnce(notes);
  return renderToStaticMarkup(<MemoryRouter initialEntries={[`/word/${word.wordId}`]}><Routes><Route path="/word/:wordId" element={<WordDetailScreen />} /></Routes></MemoryRouter>);
}
const tabs = (html: string) => [...(html.match(/<nav[^>]*單字卡分頁[^>]*>(.*?)<\/nav>/)?.[1] ?? '').matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map(m => m[1]);

beforeEach(() => { vi.clearAllMocks(); });

it('shows only pages that have content, card page first', () => {
  expect(tabs(render([example], []))).toEqual(['字卡', '字義']);
  expect(tabs(render([example], [phrase]))).toEqual(['字卡', '字義', '搭配']);
  expect(tabs(render([], [{ ...phrase, noteId: 'N2', noteType: 'usage' }]))).toEqual(['字卡', '字義', '記憶法']);
});

it('card page keeps tab navigation and a neutral unlinked example without a redundant next-page control', () => {
  const html = render([example], [phrase]);
  expect(html).toContain('This is a basic sentence.');
  expect(tabs(html)).toEqual(['字卡', '字義', '搭配']);
  expect(html).toContain('<small>例句</small>');
  expect(html).not.toContain('義項未連結');
  expect(html).not.toContain('下一頁：');
  expect(html).not.toContain('詳細資料');
  expect(html).not.toContain('<h2>字義</h2>');
  expect(html).not.toContain('片語與文法');
});
