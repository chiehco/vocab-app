// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import pack from '../../../public/data/v1/sa-pack.json';
import type { WordRecord } from '../../db/types';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { createComponentHarness } from '../../test/componentHarness';
import SiegeScreen from '../siege/SiegeScreen';
import TextbookScreen from './TextbookScreen';
import VocabularyScreen from './VocabularyScreen';

let view: ReturnType<typeof createComponentHarness>;
beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
  view = createComponentHarness();
});
afterEach(async () => {
  await view.unmount();
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(table => table.clear()));
});

it.each([
  ['/textbook/LV4/2', '/textbook/:level/:unit', <TextbookScreen key="textbook" />, '一般單字練習（102 詞）'],
  ['/vocabulary?level=LV4&unit=2', '/vocabulary', <VocabularyScreen key="vocabulary" />, '127 個詞彙、37 項用法與搭配'],
  ['/arena/word-siege?level=LV4&unit=2', '/arena/word-siege', <SiegeScreen key="siege" />, '個可玩單字'],
] as const)('opens source-confirmed LV4 U2 at %s without learning or reward side effects', async (url, path, screen, expected) => {
  await contentDb.words.bulkPut(pack.words as unknown as WordRecord[]);
  await view.render(<MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={screen} /></Routes></MemoryRouter>);
  await view.waitFor(() => expect(view.container.textContent).toContain(expected));
  expect(view.container.textContent).not.toContain('p22 完整來源待補');
  expect(view.container.querySelector('iframe')).toBeNull();
  expect(view.container.textContent).not.toContain('LV6 Unit 1');
  for (const table of progressDb.tables.filter(t => t.name !== 'settings')) expect(await table.count()).toBe(0);
});

it.each([
  ['/textbook/LV6/21', '/textbook/:level/:unit', <TextbookScreen key="textbook" />, '一般單字練習（74 詞）'],
  ['/vocabulary?level=LV6&unit=21', '/vocabulary', <VocabularyScreen key="vocabulary" />, '119 個詞彙、36 項用法'],
  ['/arena/word-siege?level=LV6&unit=21', '/arena/word-siege', <SiegeScreen key="siege" />, '個可玩單字'],
] as const)('opens accepted U21 text at %s without creating learning or reward records on render', async (url, path, screen, expected) => {
  await contentDb.words.bulkPut(pack.words as unknown as WordRecord[]);
  await view.render(<MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={screen} /></Routes></MemoryRouter>);
  await view.waitFor(() => expect(view.container.textContent).toContain(expected));
  expect(view.container.textContent).not.toContain('完整來源待補');
  expect(view.container.querySelector('iframe')).toBeNull();
  for (const table of progressDb.tables.filter(table => table.name !== 'settings')) expect(await table.count()).toBe(0);
  if (path === '/vocabulary') {
    const select = view.container.querySelector<HTMLSelectElement>('select[aria-label="教材單元"]')!;
    expect(Array.from(select.options).map(option => Number(option.value))).toEqual(Array.from({length:25}, (_, i) => i + 1));
  }
  // VocabularyScreen persists its navigation location, independently of learning.
  const settings = await progressDb.settings.toArray();
  expect(settings.every(row => row.key === 'learning:last-location')).toBe(true);
});
