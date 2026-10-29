// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import type { WordRecord } from '../../db/types';
import { createComponentHarness } from '../../test/componentHarness';
import pack from '../../../public/data/v1/sa-pack.json';
import baseline from '../../../scripts/fixtures/lv4-u2-notes-confirmation-baseline.json';
import { curriculumUnits, findUnit, learningItems, templateGroup, validGroup } from '../direct/model';
import { getOrCreateTemplateGroup, saveGroup } from '../direct/store';
import GroupsScreen from '../direct/GroupsScreen';
import SiegeScreen from '../siege/SiegeScreen';
import TextbookScreen from './TextbookScreen';
import VocabularyScreen from './VocabularyScreen';
import { textbookUnits } from './textbookCatalog';
import { isUnitPublished, unitReleaseHold } from './unitReleasePolicy';

let view: ReturnType<typeof createComponentHarness>;
const unitIds = baseline.itemIds;
const rootText = () => view.container.textContent ?? '';
function CurrentRoute() { const location = useLocation(); return <output data-testid="url">{location.pathname + location.search}</output>; }
const button = (text: string) => [...view.container.querySelectorAll('button')].find(b => b.textContent === text);
beforeEach(async () => {
  await Promise.all([...contentDb.tables, ...progressDb.tables].map(t => t.clear()));
  await contentDb.words.bulkPut(pack.words as WordRecord[]);
  view = createComponentHarness();
});
afterEach(async () => { await view.unmount(); await Promise.all([...contentDb.tables, ...progressDb.tables].map(t => t.clear())); });

it('opens all24 LV4 units while retaining all164 existing U2 identities and other namespace restrictions', () => {
  expect(textbookUnits.filter(u => u.level === 'LV4').map(u => u.unit)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  expect(curriculumUnits.filter(u => u.level === 'LV4')).toHaveLength(24);
  expect(findUnit(2, 'LV4')!.items.map(i => i.learningItemId)).toEqual(unitIds);
  expect(unitIds).toHaveLength(164);
  expect(unitIds.every(id => learningItems.some(i => i.learningItemId === id))).toBe(true);
  expect(validGroup({ ...templateGroup(2, 'LV4'), itemIds: [...unitIds].reverse() })).toBe(true);
  expect(unitReleaseHold('LV4', 2)).toBeUndefined();
  expect(isUnitPublished('LV3', 2)).toBe(true);
  expect(isUnitPublished('LV1', 2)).toBe(true);
  expect(unitReleaseHold('LIVEABC_ADVANCED', 1)?.status).toBe('not_available');
  expect(unitReleaseHold('LIVEABC_BASIC', 8)?.status).toBe('not_available');
  expect(textbookUnits.filter(u => u.level === 'LV4').every(u => !u.partial)).toBe(true);
});

it.each([
  ['/textbook/LV4/2', '/textbook/:level/:unit', <TextbookScreen key="textbook" />, '一般單字練習（102 詞）'],
  ['/vocabulary?level=LV4&unit=2', '/vocabulary', <VocabularyScreen key="vocabulary" />, '127 個詞彙、37 項用法與搭配'],
  ['/arena/word-siege?level=LV4&unit=2', '/arena/word-siege', <SiegeScreen key="siege" />, '個可玩單字'],
] as const)('opens the existing U2 at %s without fallback or automatic learning/rewards', async (url, path, screen, expected) => {
  await view.render(<MemoryRouter initialEntries={[url]}><CurrentRoute /><Routes><Route path={path} element={screen} /></Routes></MemoryRouter>);
  await view.waitFor(() => expect(rootText()).toContain(expected));
  expect(view.container.querySelector('[data-testid="url"]')?.textContent).toBe(url);
  expect(rootText()).not.toContain('p22 完整來源待補');
  expect(rootText()).not.toContain('LV4 Unit 1');
  expect(view.container.querySelector('iframe')).toBeNull();
  for (const table of progressDb.tables.filter(t => t.name !== 'settings')) expect(await table.count()).toBe(0);
  expect((await progressDb.settings.toArray()).every(row => row.key === 'learning:last-location')).toBe(true);
});

it('includes U2 in all24 vocabulary options and new template choices', async () => {
  await view.render(<MemoryRouter initialEntries={['/vocabulary?level=LV4&unit=2']}><VocabularyScreen /></MemoryRouter>);
  await view.waitFor(() => expect(view.container.querySelector('select[aria-label="教材單元"]')).not.toBeNull());
  const options = [...view.container.querySelectorAll('select[aria-label="教材單元"] option')].map(o => (o as HTMLOptionElement).value);
  expect(options).toEqual(Array.from({ length: 24 }, (_, i) => String(i + 1)));
  expect(view.container.querySelector('.vocab-card')).not.toBeNull();
  await view.unmount(); view = createComponentHarness();
  await view.render(<MemoryRouter initialEntries={['/groups?create=1']}><GroupsScreen /></MemoryRouter>);
  await view.waitFor(() => expect(button('LV4')).toBeDefined()); await view.click(button('LV4'));
  const tiles = [...view.container.querySelectorAll('.unit-tile strong')].map(t => t.textContent);
  expect(tiles).toHaveLength(24); expect(tiles).toContain('Unit 02'); expect(tiles).toContain('Unit 01'); expect(tiles).toContain('Unit 24');
});

it('preserves a renamed and reordered old164-item U2 group when reopening the template', async () => {
  const group = { ...templateGroup(2, 'LV4'), id: 'retained-u2-policy', name: '我的 U2 排序', itemIds: [...unitIds].reverse() };
  await saveGroup(group);
  const saved = await progressDb.customGroups.get(group.id);
  await view.render(<MemoryRouter initialEntries={['/groups?group=' + group.id]}><GroupsScreen /></MemoryRouter>);
  await view.waitFor(() => expect(rootText()).toContain(group.name));
  expect(rootText()).not.toContain('p22 完整來源待補');
  expect(view.container.querySelectorAll('.direct-items > li')).toHaveLength(164);
  expect(view.container.querySelector('a[href^="/quiz?group="]')).not.toBeNull();
  const reopened = await Promise.all([getOrCreateTemplateGroup(2, 'LV4'), getOrCreateTemplateGroup(2, 'LV4')]);
  expect(reopened.every(result => !result.added && result.group.id === group.id)).toBe(true);
  expect(await progressDb.customGroups.count()).toBe(1);
  expect(await progressDb.customGroups.get(group.id)).toEqual(saved);
});

it('still removes an active battle when navigation requests an unavailable book', async () => {
  await view.render(<MemoryRouter initialEntries={['/arena/word-siege?level=LV4&unit=1']}><Link to="/arena/word-siege?level=LIVEABC_ADVANCED&unit=1">unavailable book</Link><SiegeScreen /></MemoryRouter>);
  await view.waitFor(() => expect(button('進入守城')?.disabled).toBe(false)); await view.click(button('進入守城'));
  expect(view.container.querySelector('iframe')).not.toBeNull();
  await view.click([...view.container.querySelectorAll('a')].find(a => a.textContent === 'unavailable book'));
  await view.waitFor(() => expect(rootText()).toContain('目前 LiveABC Basic 僅提供照片核對完成的 Unit 01–07'));
  expect(view.container.querySelector('iframe')).toBeNull(); expect(button('進入守城')).toBeUndefined();
});
