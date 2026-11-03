// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { contentDb } from '../../../db/contentDb';
import { progressDb } from '../../../db/progressDb';
import { createComponentHarness } from '../../../test/componentHarness';
import type { WordRecord } from '../../../db/types';
import TownWordDrawer from './TownWordDrawer';
import ThreeTownMap from './ThreeTownMap';

const word = { wordId: 'W999001', word: 'zzlocal', level: 'LV1', pos: 'n.', posAll: ['n.'], meaningZh: '本機測試字', status: 'reviewed' } as WordRecord;
let view: ReturnType<typeof createComponentHarness>;
beforeEach(async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {});
  await progressDb.delete(); await progressDb.open(); await contentDb.delete(); await contentDb.open();
  await contentDb.words.put(word);
  await progressDb.settings.put({ key: 'autoPronounce', value: false });
  view = createComponentHarness();
});
afterEach(async () => { await view.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); await progressDb.delete(); await contentDb.delete(); });

it('embeds the real five-page dossier, shows honest empty states and never writes progress when reading', async () => {
  const snapshot = async () => Promise.all(progressDb.tables.map(async table => ({ name: table.name, rows: await table.toArray() })));
  const before = await snapshot();
  const close = vi.fn();
  const card = (open: boolean) => <MemoryRouter><TownWordDrawer open={open} wordId={word.wordId} word={word.word} onClose={close}><p>原有補練入口</p></TownWordDrawer></MemoryRouter>;
  await view.render(card(true));
  await view.waitFor(() => expect(view.container.querySelectorAll('.dossier-page-tabs button')).toHaveLength(5));
  expect(view.container.querySelector('dialog')?.open).toBe(true);
  expect(view.container.textContent).toContain('本機測試字');
  expect(view.container.querySelector('.word-dossier-nav')).toBeNull();
  await view.click([...view.container.querySelectorAll('button')].find(b => b.textContent === '記憶法'));
  expect(view.container.textContent).toContain('尚未收錄記憶法');
  expect(await snapshot()).toEqual(before);
  await act(async () => { view.container.querySelector('dialog')?.close(); });
  expect(close).toHaveBeenCalled();
  await view.render(card(false));
  expect(view.container.querySelector('.word-dossier-page')).toBeNull();
  expect(await snapshot()).toEqual(before);
});

it('without WebGL keeps all plots, original stages and keyboard-accessible card selection', async () => {
  vi.stubGlobal('WebGL2RenderingContext', undefined);
  const select = vi.fn();
  await view.render(<MemoryRouter><ThreeTownMap plots={[{ id: 'one', word: 'zzlocal', built: true, stage: 2 }]} selectedId="one" onSelect={select} /></MemoryRouter>);
  const plot = view.container.querySelector('[data-town-item=one]');
  expect(plot?.getAttribute('data-house-stage')).toBe('2');
  await view.click(plot);
  expect(select).toHaveBeenCalledWith('one');
  expect(view.container.querySelector('canvas')).toBeNull();
  expect(await progressDb.reviewLogs.count()).toBe(0);
});
