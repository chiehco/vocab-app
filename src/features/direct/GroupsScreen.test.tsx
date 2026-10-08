// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import type { WordRecord } from '../../db/types';
import { createComponentHarness } from '../../test/componentHarness';
import bootstrap from '../../../public/data/v1/sa-pack.json';
import GroupsScreen from './GroupsScreen';
import { saveGroup } from './store';

let view: ReturnType<typeof createComponentHarness>;
function Screen() {
  const location = useLocation();
  return <><output data-testid="url">{location.search}</output><GroupsScreen /></>;
}
function button(text: string) {
  return [...view.container.querySelectorAll('button')].find(button => button.textContent === text);
}
function tile(title: string) {
  return [...view.container.querySelectorAll('.unit-tile')].find(tile => tile.querySelector('strong')?.textContent === title);
}

beforeEach(async () => {
  await progressDb.delete(); await progressDb.open();
  await contentDb.delete(); await contentDb.open();
  await contentDb.words.bulkPut(bootstrap.words as WordRecord[]);
  view = createComponentHarness();
});
afterEach(async () => { await view.unmount(); await progressDb.delete(); await contentDb.delete(); });

it.each([['LV3', 'Unit 01'], ['LV4', 'Unit 17']])('%s: creating, returning and selecting the same unit opens the edited group', async (level, title) => {
  await view.render(<MemoryRouter initialEntries={['/groups?create=1']}><Screen /></MemoryRouter>);
  await view.waitFor(() => { expect(button(level)).toBeDefined(); });
  await view.click(button(level));
  await view.click(tile(title));
  await view.waitFor(() => { expect(view.container.querySelector('h1')?.textContent).toContain(level); });
  expect(view.container.querySelector('[role="status"]')?.textContent).toContain('已建立');
  const [group] = await progressDb.customGroups.toArray();
  expect(group).toBeDefined();
  await act(async () => { await saveGroup({ ...group, name: '我的單元編輯', itemIds: group.itemIds.slice(1).reverse() }); });
  const edited = await progressDb.customGroups.get(group.id);
  await view.click(view.container.querySelector('a[href="/groups"]'));
  await view.waitFor(() => { expect(view.container.querySelector('h1')?.textContent).toBe('我的群組'); });
  await view.click(tile(title));
  await view.waitFor(() => {
    expect(view.container.querySelector('h1')?.textContent).toBe('我的單元編輯');
    expect(view.container.querySelector('[data-testid="url"]')?.textContent).toBe(`?group=${group.id}`);
    expect(view.container.querySelector('[role="status"]')?.textContent).toContain('沒有重複新增或覆蓋內容');
  });
  expect(await progressDb.customGroups.count()).toBe(1);
  expect(await progressDb.customGroups.get(group.id)).toEqual(edited);
});
