// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { createComponentHarness } from '../../test/componentHarness';
import type { WordRecord } from '../../db/types';
import words from '../../../public/data/v1/words.json';
import curriculum from '../direct/curriculumLV3Unit7.json';
import WordDetailScreen from '../browser/WordDetailScreen';
import { ReviewFlashcard } from '../review/ReviewScreen';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: vi.fn() }));
vi.mock('../modes/useStudyBookmark', () => ({ useStudyBookmark: vi.fn() }));
vi.mock('../../hooks/useCardPronunciation', () => ({ useCardPronunciation: vi.fn() }));
vi.mock('../wordbeast/useIllustrationMedia', () => ({ useIllustrationMedia: vi.fn() }));

const observe = words.find(word => word.wordId === 'W002582')! as WordRecord;
const chinese = '仔細觀察……；遵守規則或習俗；慶祝／紀念節日';
let view: ReturnType<typeof createComponentHarness>;
beforeEach(() => {
  vi.clearAllMocks();
  view = createComponentHarness();
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  vi.mocked(useLiveQuery).mockReturnValue(undefined);
});
afterEach(async () => { await view.unmount(); vi.restoreAllMocks(); });

it('shows the complete note after opening and reopening the real WordDetailScreen usage tab', async () => {
  // The established useLiveQuery mock pattern, covering all fourteen calls on every render.
  const results = [undefined, observe, [], [], [], [], [], [], [], undefined, undefined, {}, [], {}];
  let call = 0;
  vi.mocked(useLiveQuery).mockImplementation(() => results[call++ % results.length]);
  await view.render(
    <MemoryRouter initialEntries={['/word/W002582']}>
      <Routes><Route path="/word/:wordId" element={<WordDetailScreen />} /></Routes>
    </MemoryRouter>,
  );
  const openTab = (label: string) => view.click([...view.container.querySelectorAll('nav[aria-label="單字卡分頁"] button')]
    .find(button => button.textContent === label));
  await openTab('搭配');
  expect(view.container.querySelector('.dossier-usage .usage-pattern-unaligned-zh p')?.textContent).toBe(chinese);
  expect(view.container.querySelectorAll('.dossier-usage .usage-pattern-items small')).toHaveLength(0);
  await openTab('字卡');
  expect(view.container.querySelector('.usage-pattern-unaligned-zh')).toBeNull();
  await openTab('搭配');
  expect(view.container.querySelectorAll('.usage-pattern-unaligned-zh')).toHaveLength(1);
  expect(view.container.querySelector('.usage-pattern-unaligned-zh p')?.textContent).toBe(chinese);
});

it('renders the real ReviewFlashcard back in one grid cell without grading or saving', async () => {
  const onFlip = vi.fn(), onGrade = vi.fn(), onKnown = vi.fn();
  const card = (flipped: boolean) => (
    <ReviewFlashcard item={{ wordRecord: observe, isNew: true }} flipped={flipped} options={null}
      onFlip={onFlip} onGrade={onGrade} onKnown={onKnown} position={1} saving={false} />
  );
  await view.render(card(false));
  expect(view.container.querySelector('.usage-pattern-unaligned-zh')).toBeNull();
  await view.render(card(true));
  const wrapper = view.container.querySelector('.answer-note > .usage-pattern-with-note');
  expect(wrapper?.querySelector('.usage-pattern-unaligned-zh p')?.textContent).toBe(chinese);
  expect(wrapper?.querySelectorAll('.usage-pattern-items > li')).toHaveLength(2);
  expect(wrapper?.querySelectorAll('.usage-pattern-items small')).toHaveLength(0);
  expect(wrapper?.parentElement?.children).toHaveLength(2);
  await view.render(card(false));
  await view.render(card(true));
  expect(view.container.querySelectorAll('.usage-pattern-unaligned-zh')).toHaveLength(1);
  expect(onFlip).not.toHaveBeenCalled();
  expect(onGrade).not.toHaveBeenCalled();
  expect(onKnown).not.toHaveBeenCalled();
});

it('retains the source-checked read-only curriculum identity rather than turning it into a practice card', () => {
  const item = curriculum.learningItems.find(row => row.learningItemId === 'LI-LV3U07-V040')!;
  expect(item).toMatchObject({
    officialWordId: 'W002582', lexemeRef: 'W002582',
    targetMeaningZh: '觀察；遵守', chapterMeaningsZh: '觀察；遵守',
    meaningSource: 'textbook_transcription', review: 'source_checked_text_only', practiceMode: 'read_only',
  });
});
