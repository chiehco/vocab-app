// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
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
  ['/textbook/LV6/21', '/textbook/:level/:unit', <TextbookScreen key="textbook" />],
  ['/vocabulary?level=LV6&unit=21', '/vocabulary', <VocabularyScreen key="vocabulary" />],
  ['/arena/word-siege?level=LV6&unit=21', '/arena/word-siege', <SiegeScreen key="siege" />],
] as const)('keeps missing LV6 U21 source pending at %s without falling back or creating progress', async (url, path, screen) => {
  await view.render(<MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={screen} /></Routes></MemoryRouter>);
  await view.waitFor(() => expect(view.container.textContent).toContain('p199 完整來源待補'));
  expect(view.container.querySelector('a[href="/textbook?level=LV6"]')).not.toBeNull();
  expect(view.container.querySelector('.vocab-card')).toBeNull();
  expect(view.container.querySelector('iframe')).toBeNull();
  expect(view.container.textContent).not.toContain('LV6 Unit 1');
  expect(await Promise.all(progressDb.tables.map(table => table.count()))).toEqual(progressDb.tables.map(() => 0));
});
