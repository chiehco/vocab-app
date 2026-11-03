// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { createComponentHarness } from '../../test/componentHarness';
import CheckInCalendar from './CheckInCalendar';

const clock = vi.hoisted(() => ({ today: '2026-01-02' }));
vi.mock('../../hooks/useToday', () => ({ useToday: () => clock.today }));
let view: ReturnType<typeof createComponentHarness>;
const snapshot = () => Promise.all(progressDb.tables.map(async table => ({ name: table.name, rows: await table.toArray() })));
const button = (label: string) => view.container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const day = (date: string) => view.container.querySelector<HTMLButtonElement>(`button[aria-label^="${Number(date.slice(0, 4))} 年 ${Number(date.slice(5, 7))} 月 ${Number(date.slice(8))} 日，有學習"]`);
const title = () => view.container.querySelector('strong')?.textContent;

beforeEach(async () => {
  clock.today = '2026-01-02';
  await progressDb.delete();
  await progressDb.open();
  view = createComponentHarness();
});
afterEach(async () => { await view.unmount(); await progressDb.delete(); });

it('reads legacy schema-1 check-ins after the existing DB upgrade without changing history', async () => {
  await progressDb.delete();
  const legacy = new Dexie(progressDb.name);
  legacy.version(1).stores({ cardStates: 'word, dueDate, state', reviewLogs: '++id, word, reviewedAt, sessionId', checkIns: 'date', quizStats: 'word', settings: 'key' });
  const rows = [
    { date: '2025-12-31', reviewCount: 17, newWordsCount: 3, sessionsCount: 2 },
    { date: '2026-01-01', reviewCount: 9, newWordsCount: 1, sessionsCount: 1 },
  ];
  await legacy.table('checkIns').bulkAdd(rows);
  legacy.close();
  await progressDb.open();
  await progressDb.rewardWallet.put({ id: 'local', balance: 321, updatedAt: 1 });
  await progressDb.rewardLedger.put({ id: 'legacy-award', kind: 'daily-check-in', amount: 30, createdAt: 1, taiwanDate: '2025-12-31' });
  const before = await snapshot();
  await view.render(<CheckInCalendar />);
  await view.waitFor(() => expect(day('2026-01-01')?.classList.contains('stamped')).toBe(true));
  expect(button('下個月')?.disabled).toBe(true);
  await view.click(day('2026-01-01'));
  expect(view.container.textContent).toContain('1 月 1 日：練習 9 次，新學 1 個字');
  await view.click(button('上個月'));
  expect(title()).toBe('2025 年 12 月');
  expect(button('上個月')?.disabled).toBe(true);
  expect(view.container.querySelector('[aria-pressed="true"]')).toBeNull();
  await view.click(day('2025-12-31'));
  expect(view.container.textContent).toContain('12 月 31 日：練習 17 次，新學 3 個字');
  await view.click(button('下個月'));
  expect(title()).toBe('2026 年 1 月');
  expect(await snapshot()).toEqual(before);
  expect(await progressDb.checkIns.toArray()).toEqual(rows);
});

it('handles an empty database, blank days and future days without creating records or rewards', async () => {
  const before = await snapshot();
  await view.render(<CheckInCalendar />);
  await view.waitFor(() => expect(view.container.textContent).toContain('這個月還沒開始，隨時都可以'));
  expect(button('上個月')?.disabled).toBe(true);
  expect(button('下個月')?.disabled).toBe(true);
  expect(view.container.querySelectorAll('.stamped')).toHaveLength(0);
  expect(button('2026 年 1 月 3 日')?.disabled).toBe(true);
  await view.click(button('2026 年 1 月 1 日'));
  expect(view.container.textContent).toContain('1 月 1 日：這天沒有紀錄');
  expect(await snapshot()).toEqual(before);
});

it('reacts to new check-ins and follows the current month across a year boundary', async () => {
  clock.today = '2025-12-31';
  await view.render(<CheckInCalendar />);
  await view.waitFor(() => expect(view.container.textContent).toContain('這個月還沒開始'));
  await act(async () => { await progressDb.checkIns.add({ date: '2025-12-31', reviewCount: 4, newWordsCount: 2, sessionsCount: 1 }); });
  await view.waitFor(() => expect(day('2025-12-31')?.classList.contains('stamped')).toBe(true));
  clock.today = '2026-01-01';
  await view.render(<CheckInCalendar />);
  expect(title()).toBe('2026 年 1 月');
  expect(button('下個月')?.disabled).toBe(true);
  expect(button('上個月')?.disabled).toBe(false);
  await view.click(button('上個月'));
  expect(day('2025-12-31')?.classList.contains('stamped')).toBe(true);
});
