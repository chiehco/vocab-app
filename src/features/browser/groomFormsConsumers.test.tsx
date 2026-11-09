// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { createComponentHarness } from '../../test/componentHarness';
import type { WordRecord } from '../../db/types';
import words from '../../../public/data/v1/words.json';
import saPack from '../../../public/data/v1/sa-pack.json';
import curriculum from '../direct/curriculumLV3Unit13.json';
import WordDetailScreen from './WordDetailScreen';
import DictionaryMeanings from './DictionaryMeanings';
import VocabularyScreen from '../vocabulary/VocabularyScreen';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: vi.fn() }));
vi.mock('../modes/useStudyBookmark', () => ({ useStudyBookmark: vi.fn() }));
vi.mock('../../hooks/useCardPronunciation', () => ({ useCardPronunciation: vi.fn() }));
vi.mock('../wordbeast/useIllustrationMedia', () => ({ useIllustrationMedia: vi.fn() }));

const groom = words.find(word => word.wordId === 'W003112')! as WordRecord;
let view: ReturnType<typeof createComponentHarness>;
beforeEach(() => {
  vi.clearAllMocks();
  view = createComponentHarness();
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  vi.mocked(useLiveQuery).mockReturnValue(undefined);
});
afterEach(async () => { await view.unmount(); vi.restoreAllMocks(); });
function expectForms() {
  expect([...view.container.querySelectorAll('.recorded-verb-forms dd')].map(node => node.textContent))
    .toEqual(['groom', 'groomed', 'groomed']);
  expect(view.container.querySelector('.recorded-forms-missing')).toBeNull();
}

it('renders approved installed groom forms on general card and meaning tabs, including reopening', async () => {
  expect(saPack.words.find(word => word.wordId === groom.wordId)).toEqual(groom);
  expect(groom).toMatchObject({word:'bridegroom/groom', wordVariants:['bridegroom','groom'], verbForms:{
    base:'groom',past:'groomed',pastParticiple:'groomed',status:'approved',
    sourceRef:'https://www.collinsdictionary.com/dictionary/english/groom',
  }});
  const before=JSON.stringify(groom);
  const results = [undefined, groom, [], [], [], [], [], [], [], undefined, undefined, {}, [], {}];
  let call = 0;
  vi.mocked(useLiveQuery).mockImplementation(() => results[call++ % results.length]);
  await view.render(<MemoryRouter initialEntries={['/word/W003112']}>
    <Routes><Route path="/word/:wordId" element={<WordDetailScreen />} /></Routes>
  </MemoryRouter>);
  expectForms();
  for (const label of ['字義','字卡','字義']) {
    await view.click([...view.container.querySelectorAll('.dossier-page-tabs button')]
      .find(button => button.textContent === label));
    expectForms();
  }
  expect(JSON.stringify(groom)).toBe(before);
});
it.each(['LI-LV3U13-V102','LI-LV3U13-V103'])('renders the same authenticated forms through linked curriculum card %s', async itemId => {
  const item=curriculum.learningItems.find(row => row.learningItemId === itemId)!;
  expect(item).toMatchObject({officialWordId:groom.wordId,lexemeRef:groom.wordId,practiceMode:'read_only'});
  vi.mocked(useLiveQuery).mockReturnValue({word:groom,senses:[]});
  await view.render(<MemoryRouter initialEntries={[`/vocabulary?level=LV3&unit=13&item=${itemId}`]}>
    <VocabularyScreen />
  </MemoryRouter>);
  expect(view.container.querySelector('.vocab-card h2')?.textContent).toBe(item.displayWord);
  expectForms();
});
it('does not expose forms through a linked card with a mismatched installed word ID', async () => {
  vi.mocked(useLiveQuery).mockReturnValue({word:{...groom,wordId:'OTHER'},senses:[]});
  await view.render(<DictionaryMeanings wordId={groom.wordId} />);
  expect(view.container.querySelector('.recorded-verb-forms')).toBeNull();
});
it('keeps the missing-forms fallback for unapproved installed groom forms', async () => {
  vi.mocked(useLiveQuery).mockReturnValue({word:{...groom,verbForms:{...groom.verbForms,status:'draft'}},senses:[]});
  await view.render(<DictionaryMeanings wordId={groom.wordId} />);
  expect(view.container.querySelector('.recorded-verb-forms')).toBeNull();
  expect(view.container.querySelector('.recorded-forms-missing')).not.toBeNull();
});
