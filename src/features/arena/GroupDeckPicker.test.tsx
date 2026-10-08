// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb, setSetting } from '../../db/progressDb';
import type { WordRecord } from '../../db/types';
import { createComponentHarness } from '../../test/componentHarness';
import bootstrap from '../../../public/data/v1/sa-pack.json';
import { findUnitByKey } from '../vocabulary/textbookCatalog';
import GroupDeckPicker from './GroupDeckPicker';
import { UNIT_SCOPE_PREFIX, useGroupScope } from './useGroupScope';

let view: ReturnType<typeof createComponentHarness>;
const eligible = () => true;
const lv4Key = '7000.ivy.LV4.17';
const lv3Key = '7000.ivy.LV3.1';

function Game({ gameKey }: { gameKey: string }) {
  const scope = useGroupScope();
  const location = useLocation();
  return <>
    <output data-testid="url">{location.search}</output>
    <output data-testid="scope">{scope.groupId}</output>
    <output data-testid="words">{scope.words?.map(word => word.wordId).join(',')}</output>
    <Link to={`?unit=${lv3Key}`}>切換網址到 LV3</Link>
    <GroupDeckPicker gameKey={gameKey} scope={scope} eligible={eligible} minimum={1} />
  </>;
}

function button(text: string) {
  return [...view.container.querySelectorAll('button')].find(button => button.textContent === text);
}
function selectedTile(title: string) {
  return [...view.container.querySelectorAll('.unit-tile')].find(tile => tile.querySelector('strong')?.textContent === title);
}
async function open(gameKey = 'slash', query = '?difficulty=normal') {
  await view.render(<MemoryRouter initialEntries={[`/game${query}`]}><Game gameKey={gameKey} /></MemoryRouter>);
}

beforeEach(async () => {
  await progressDb.delete(); await progressDb.open();
  await contentDb.delete(); await contentDb.open();
  await contentDb.words.bulkPut(bootstrap.words as WordRecord[]);
  view = createComponentHarness();
});
afterEach(async () => { await view.unmount(); await progressDb.delete(); await contentDb.delete(); });

it.each(['spell-barrage', 'meaning-karuta', 'slash'])('%s restores LV4 in the URL, picker, tile and actual word pool', async gameKey => {
  await setSetting(`gameDeck:${gameKey}`, UNIT_SCOPE_PREFIX + lv4Key);
  await open(gameKey);
  const installedIds = new Set(bootstrap.words.map(word => word.wordId));
  const expectedIds = findUnitByKey(lv4Key)!.wordIds.filter(id => installedIds.has(id));
  expect(expectedIds.length).toBeGreaterThan(0);
  await view.waitFor(() => {
    expect(view.container.querySelector('[data-testid="url"]')?.textContent).toBe(`?difficulty=normal&unit=${lv4Key}`);
    expect(view.container.querySelector('[data-testid="scope"]')?.textContent).toBe(UNIT_SCOPE_PREFIX + lv4Key);
    expect(view.container.querySelector('[data-testid="words"]')?.textContent).toBe(expectedIds.join(','));
    expect(button('LV4')?.getAttribute('aria-pressed')).toBe('true');
    expect(button('LV1')?.getAttribute('aria-pressed')).toBe('false');
    expect(selectedTile('Unit 17')?.getAttribute('aria-pressed')).toBe('true');
  });
  expect(await progressDb.customGroups.count()).toBe(0);
});

it('keeps manual level browsing until the active unit changes through navigation', async () => {
  await open('slash', `?unit=${lv4Key}`);
  await view.waitFor(() => { expect(selectedTile('Unit 17')?.getAttribute('aria-pressed')).toBe('true'); });
  await view.click(button('LV3'));
  expect(button('LV3')?.getAttribute('aria-pressed')).toBe('true');
  expect(view.container.querySelector('[data-testid="scope"]')?.textContent).toBe(UNIT_SCOPE_PREFIX + lv4Key);
  await view.click(button('LV1'));
  await view.click(view.container.querySelector('a'));
  await view.waitFor(() => {
    expect(button('LV3')?.getAttribute('aria-pressed')).toBe('true');
    expect(selectedTile('Unit 01')?.getAttribute('aria-pressed')).toBe('true');
    expect(view.container.querySelector('[data-testid="scope"]')?.textContent).toBe(UNIT_SCOPE_PREFIX + lv3Key);
  });
});

it('honors an explicit URL unit over a remembered unit', async () => {
  await setSetting('gameDeck:slash', UNIT_SCOPE_PREFIX + lv4Key);
  await open('slash', `?unit=${lv3Key}`);
  await view.waitFor(() => {
    expect(button('LV3')?.getAttribute('aria-pressed')).toBe('true');
    expect(selectedTile('Unit 01')?.getAttribute('aria-pressed')).toBe('true');
    expect(view.container.querySelector('[data-testid="scope"]')?.textContent).toBe(UNIT_SCOPE_PREFIX + lv3Key);
  });
});

it('clears a restored unit when choosing default and does not restore it again', async () => {
  await setSetting('gameDeck:slash', UNIT_SCOPE_PREFIX + lv4Key);
  await open();
  await view.waitFor(() => { expect(button('LV4')?.getAttribute('aria-pressed')).toBe('true'); });
  await view.click([...view.container.querySelectorAll('button')].find(button => button.querySelector('span')?.textContent === '預設'));
  await view.waitFor(() => {
    expect(view.container.querySelector('[data-testid="url"]')?.textContent).toBe('?difficulty=normal');
    expect(view.container.querySelector('[data-testid="scope"]')?.textContent).toBe('');
  });
  expect((await progressDb.settings.get('gameDeck:slash'))?.value).toBeNull();
});
