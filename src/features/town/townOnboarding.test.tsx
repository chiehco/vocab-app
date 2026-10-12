// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import type { WordRecord } from '../../db/types';
import { createComponentHarness } from '../../test/componentHarness';
import words from '../../../public/data/v1/words.json';
import DirectScreen from '../direct/DirectScreen';
import QuizScreen from '../quiz/QuizScreen';
import { practiceQuestions } from '../direct/model';
import { startScopeSession, submitAnswer, updateQuestion } from '../direct/store';
import { practiceIds } from '../vocabulary/model';
import TownScreen from './TownScreen';
import LV1TownScreen from './LV1TownScreen';
import { LV1_TOWN_SOURCE_CARDS } from './lv1TownModel';
import { TOWN_ITEMS } from './townModel';
import { openTownDirectPractice } from './townPractice';

let view: ReturnType<typeof createComponentHarness>;
function Flow() {
  const location = useLocation();
  return <><output data-testid="url">{location.pathname + location.search}</output><Routes>
    <Route path="/town/LV4/17" element={<TownScreen />} />
    <Route path="/town/LV1/1" element={<LV1TownScreen />} />
    <Route path="/practice/direct" element={<DirectScreen />} />
    <Route path="/quiz" element={<QuizScreen />} />
  </Routes></>;
}
const button = (text: string) => [...view.container.querySelectorAll('button')].find(el => el.textContent === text);
const link = (text: string) => [...view.container.querySelectorAll('a')].find(el => el.textContent === text);
const built = () => view.container.querySelectorAll('[data-town-item][data-built=true]');

beforeEach(async () => {
  vi.stubGlobal('ResizeObserver', class {
    callback: () => void;
    constructor(callback: () => void) { this.callback = callback; }
    observe() { this.callback(); }
    disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {});
  await progressDb.delete(); await progressDb.open();
  await contentDb.delete(); await contentDb.open();
  const ids = new Set(LV1_TOWN_SOURCE_CARDS.map(card => card.officialWordId));
  await contentDb.words.bulkPut(words.filter(word => ids.has(word.wordId)) as WordRecord[]);
  await progressDb.settings.put({ key: 'autoPronounce', value: false });
  view = createComponentHarness();
});
afterEach(async () => {
  await view.unmount(); await progressDb.delete(); await contentDb.delete();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it.each([true, false])('LV4: a saved answer (correct=%s) returns to the house without resubmitting or advancing', async correct => {
  await view.render(<MemoryRouter initialEntries={['/town/LV4/17']}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(button('開始蓋第一間小屋 →')).toBeDefined());
  expect(built()).toHaveLength(0);
  expect(view.container.textContent).toContain('只看字卡或聽發音不會蓋屋');
  // Rapid entry clicks are locked before session creation completes.
  await act(async () => {
    const entry = button('開始蓋第一間小屋 →')!;
    entry.click(); entry.click();
  });
  await view.waitFor(() => expect(view.container.querySelector('.direct-stem')).not.toBeNull());
  expect(await progressDb.directSessions.count()).toBe(1);
  const [session] = await progressDb.directSessions.toArray();
  const question = practiceQuestions.find(q => q.questionId === session.questionIds[0])!;
  const option = question.options.find(o => (o.id === question.answer) === correct)!;
  await view.click(button(`${option.id} · ${option.text}`));
  await view.waitFor(() => expect(button('確認答案')?.disabled).toBe(false));
  await act(async () => { button('確認答案')!.click(); button('確認答案')!.click(); });
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(await progressDb.directAttempts.count()).toBe(1);
  const savedSession = await progressDb.directSessions.get(session.id);
  await view.click(link('回小鎮看小屋 →'));
  await view.waitFor(() => expect(built()).toHaveLength(1));
  expect(view.container.querySelector('[aria-pressed=true][data-town-item]')?.getAttribute('data-town-item')).toBe(TOWN_ITEMS[0].learningItemId);
  await view.click(link('繼續本輪練習 →'));
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(await progressDb.directSessions.get(session.id)).toEqual(savedSession);
  expect((await progressDb.directSessions.get(session.id))?.index).toBe(0);
  expect(await progressDb.directAttempts.count()).toBe(1);
  expect(await progressDb.reviewLogs.count()).toBe(0);
});

it('LV4: cancelling resumes the choice and lookups, and lookup alone never builds a house', async () => {
  const session = await openTownDirectPractice(TOWN_ITEMS[5].learningItemId);
  const q = practiceQuestions.find(q => q.questionId === session.questionIds[0])!;
  await updateQuestion(session.id, q.questionId, { choice: q.options[0].id, lookup: q.targetWord });
  await view.render(<MemoryRouter initialEntries={[`/practice/direct?session=${session.id}&town=LV4`]}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(link('← 回小鎮 · 保留本輪進度')).toBeDefined());
  expect(link('回小鎮看小屋 →')).toBeUndefined();
  await view.click(link('← 回小鎮 · 保留本輪進度'));
  await view.waitFor(() => expect(button('練這個字，蓋小屋')).toBeDefined());
  expect(built()).toHaveLength(0);
  expect((await openTownDirectPractice(TOWN_ITEMS[5].learningItemId)).id).toBe(session.id);
  await view.click(link('繼續本輪練習 →'));
  await view.waitFor(() => expect(button('確認答案')?.disabled).toBe(false));
  await view.click(button('確認答案'));
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect((await progressDb.directAttempts.toArray())[0].hintUsed).toBe(true);
  await view.click(link('回小鎮看小屋 →'));
  await view.waitFor(() => expect(built()).toHaveLength(1));
});

it('LV4: failed persistence shows no success CTA and leaves the plot empty', async () => {
  const session = await openTownDirectPractice(TOWN_ITEMS[0].learningItemId);
  const q = practiceQuestions.find(q => q.questionId === session.questionIds[0])!;
  await updateQuestion(session.id, q.questionId, { choice: q.answer });
  await view.render(<MemoryRouter initialEntries={[`/practice/direct?session=${session.id}&town=LV4`]}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(button('確認答案')).toBeDefined());
  vi.spyOn(progressDb.directAttempts, 'add').mockRejectedValueOnce(new Error('disk full'));
  await view.click(button('確認答案'));
  await view.waitFor(() => expect(view.container.querySelector('[role=alert]')?.textContent).toContain('未能儲存'));
  expect(link('回小鎮看小屋 →')).toBeUndefined();
  expect(await progressDb.directAttempts.count()).toBe(0);
});

it.each([true, false])('LV1: saved Quiz answer (correct=%s) retains the exact round across town return', async correct => {
  await view.render(<MemoryRouter initialEntries={['/town/LV1/1']}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(button('開始蓋第一間小屋 →')).toBeDefined());
  await view.click(button('開始蓋第一間小屋 →'));
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-options button')).toHaveLength(4));
  expect(view.container.querySelector('[data-testid=url]')?.textContent).toContain('/quiz?list=');
  expect(view.container.querySelector('.word-prompt')?.textContent).toContain('boy');
  // Cancel before answering, then continue the same randomized options.
  const options = [...view.container.querySelectorAll('.trial-options button')].map(el => el.textContent);
  await view.click(link('← 回小鎮 · 保留本輪進度'));
  await view.waitFor(() => expect(link('繼續本輪練習 →')).toBeDefined());
  expect(built()).toHaveLength(0);
  await view.click(link('繼續本輪練習 →'));
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-options button')).toHaveLength(4));
  expect([...view.container.querySelectorAll('.trial-options button')].map(el => el.textContent)).toEqual(options);
  const meaning = words.find(word => word.word === 'boy')!.meaningZh;
  const option = [...view.container.querySelectorAll('.trial-options button')].find(el => (el.querySelector('span')?.textContent === meaning) === correct)!;
  await act(async () => { (option as HTMLButtonElement).click(); (option as HTMLButtonElement).click(); });
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(await progressDb.reviewLogs.count()).toBe(1);
  const logs = await progressDb.reviewLogs.toArray();
  expect(logs[0]).toMatchObject({ word: 'boy', mode: 'quiz-w2m', grade: correct ? 2 : 0, schedulingApplied: false });
  await view.click(link('回小鎮看小屋 →'));
  await view.waitFor(() => expect(built()).toHaveLength(1));
  expect(view.container.querySelector('[aria-pressed=true][data-town-item]')?.getAttribute('data-town-item')).toBe(LV1_TOWN_SOURCE_CARDS[0].id);
  await view.click(link('繼續本輪練習 →'));
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect([...view.container.querySelectorAll<HTMLButtonElement>('.trial-options button')].every(el => el.disabled)).toBe(true);
  expect(await progressDb.reviewLogs.toArray()).toEqual(logs);
  expect(await progressDb.directAttempts.count()).toBe(0);
});

it('LV1: failed answer save cannot claim a house or lose the question', async () => {
  await view.render(<MemoryRouter initialEntries={['/town/LV1/1']}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(button('開始蓋第一間小屋 →')).toBeDefined());
  await view.click(button('開始蓋第一間小屋 →'));
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-options button')).toHaveLength(4));
  vi.spyOn(progressDb.reviewLogs, 'add').mockRejectedValueOnce(new Error('disk full'));
  await view.click(view.container.querySelector('.trial-options button'));
  await view.waitFor(() => expect(view.container.querySelector('[role=alert]')?.textContent).toContain('尚未保存'));
  expect(link('回小鎮看小屋 →')).toBeUndefined();
  expect(await progressDb.reviewLogs.count()).toBe(0);
  expect(await progressDb.quizStats.count()).toBe(0);
});

it('an existing house remains one house after another wrong answer and survives a reopened town', async () => {
  for (const correct of [true, false]) {
    const s = await startScopeSession(practiceIds([TOWN_ITEMS[0]]), 'retry');
    const q = practiceQuestions.find(q => q.questionId === s.questionIds[0])!;
    await updateQuestion(s.id, q.questionId, { choice: q.options.find(o => (o.id === q.answer) === correct)!.id });
    await submitAnswer(s.id, q.questionId);
  }
  await view.render(<MemoryRouter initialEntries={[`/town/LV4/17?item=${TOWN_ITEMS[0].learningItemId}`]}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(built()).toHaveLength(1));
  expect(button('再練這個字')).toBeDefined();
  expect(view.container.textContent).toContain('最近一次還不熟');
});
