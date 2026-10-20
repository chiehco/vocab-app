// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import type { ExampleRecord, WordRecord } from '../../db/types';
import { createComponentHarness } from '../../test/componentHarness';
import words from '../../../public/data/v1/words.json';
import examples from '../../../public/data/v1/examples.json';
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
import { saveWordList } from '../modes/wordLists';
import TownStudyScreen from './TownStudyScreen';

let view: ReturnType<typeof createComponentHarness>;
function Flow() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="url">{location.pathname + location.search}</output><button data-testid="history-back" onClick={() => navigate(-1)}>上一頁</button><Routes>
    <Route path="/town/LV4/17" element={<TownScreen />} />
    <Route path="/town/LV1/1" element={<LV1TownScreen />} />
    <Route path="/town/:level/:unit/study" element={<TownStudyScreen />} />
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
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  await progressDb.delete(); await progressDb.open();
  await contentDb.delete(); await contentDb.open();
  const ids = new Set(LV1_TOWN_SOURCE_CARDS.map(card => card.officialWordId));
  TOWN_ITEMS.forEach(item=>{if(item.officialWordId)ids.add(item.officialWordId);});
  await contentDb.words.bulkPut(words.filter(word => ids.has(word.wordId)) as WordRecord[]);
  await progressDb.settings.put({ key: 'autoPronounce', value: false });
  view = createComponentHarness();
});

it.each(['LV1/1','LV4/17'] as const)('%s: main daily entry saves, returns to the exact house, reloads and continues without another save',async town=>{
  await progressDb.settings.put({key:'dailyNewWordCap',value:2});
  await view.render(<MemoryRouter initialEntries={[`/town/${town}`]}><Flow /></MemoryRouter>);
  await view.waitFor(()=>expect(button('開始今日學新與複習 →')).toBeDefined());
  expect(view.container.textContent).toContain('本輪還有 2 字');expect(built()).toHaveLength(0);
  await view.click(button('開始今日學新與複習 →'));
  await view.waitFor(()=>expect(view.container.querySelectorAll('.seal-options button')).toHaveLength(4));
  const url=view.container.querySelector('[data-testid=url]')!.textContent!;
  await view.click(view.container.querySelector('.seal-options button'));
  expect(await progressDb.reviewLogs.count()).toBe(0);
  await view.click(link('← 回小鎮 · 保留本輪進度'));
  await view.waitFor(()=>expect(button('繼續今天的學習 →')).toBeDefined());expect(built()).toHaveLength(0);
  await view.click(button('繼續今天的學習 →'));
  await view.waitFor(()=>expect(view.container.querySelector('.seal-answered')).not.toBeNull());
  expect(view.container.querySelector('.seal-options')).toBeNull();
  expect(view.container.querySelector('.seal-card-answer')).not.toBeNull();
  await act(async()=>{const save=view.container.querySelector<HTMLButtonElement>('.seal-swipe-hint')!;save.click();save.click();});
  await view.waitFor(()=>expect(link('回小鎮看小屋 →')).toBeDefined());expect(await progressDb.reviewLogs.count()).toBe(1);
  const log=(await progressDb.reviewLogs.toArray())[0],card=await progressDb.cardStates.get(log.word),checkin=await progressDb.checkIns.get(log.reviewedAt.slice(0,10));
  await view.click(link('回小鎮看小屋 →'));await view.waitFor(()=>expect(built()).toHaveLength(1));
  const selected=view.container.querySelector('[aria-pressed=true][data-town-item]');expect(selected?.querySelector('.town-plot-word')?.textContent).toBe(log.word);
  await view.unmount();view=createComponentHarness();
  await view.render(<MemoryRouter initialEntries={[url]}><Flow /></MemoryRouter>);
  await view.waitFor(()=>expect(link('回小鎮看小屋 →')).toBeDefined());expect(view.container.querySelector('.seal-options')).toBeNull();
  expect(await progressDb.reviewLogs.count()).toBe(1);expect(await progressDb.cardStates.get(log.word)).toEqual(card);expect(await progressDb.checkIns.get(log.reviewedAt.slice(0,10))).toEqual(checkin);
  await view.click(button('下一張 →'));await view.waitFor(()=>expect(view.container.querySelector('.seal-card-meta')?.textContent).toContain('第 2 張'));
  expect(await progressDb.reviewLogs.count()).toBe(1);expect(await progressDb.directAttempts.count()).toBe(0);
});

it('an empty daily queue clearly completes without making single-word practice the primary fallback',async()=>{
  await progressDb.settings.put({key:'dailyNewWordCap',value:0});
  await view.render(<MemoryRouter initialEntries={['/town/LV4/17']}><Flow /></MemoryRouter>);
  await view.waitFor(()=>expect(view.container.textContent).toContain('今天的安排已完成'));
  expect(button('開始今日學新與複習 →')).toBeUndefined();expect(view.container.querySelector('.town-practice-entry')).toBeNull();
  expect(button('練這個字，蓋小屋')).toBeDefined();expect(view.container.textContent).toContain('reluctance');
  expect(await progressDb.reviewLogs.count()).toBe(0);expect(await progressDb.directAttempts.count()).toBe(0);
});
afterEach(async () => {
  await view.unmount(); await progressDb.delete(); await contentDb.delete();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it.each([true, false])('LV4: a saved answer (correct=%s) returns to the house without resubmitting or advancing', async correct => {
  await view.render(<MemoryRouter initialEntries={['/town/LV4/17']}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(button('練這個字，蓋小屋')).toBeDefined());
  expect(built()).toHaveLength(0);
  expect(view.container.textContent).toContain('只看字卡或聽發音不會蓋屋');
  // Rapid entry clicks are locked before session creation completes.
  await act(async () => {
    const entry = button('練這個字，蓋小屋')!;
    entry.click(); entry.click();
  });
  await view.waitFor(() => expect(view.container.querySelector('.direct-stem')).not.toBeNull());
  expect(await progressDb.directSessions.count()).toBe(1);
  const [session] = await progressDb.directSessions.toArray();
  const question = practiceQuestions.find(q => q.questionId === session.questionIds[0])!;
  const option = question.options.find(o => (o.id === question.answer) === correct)!;
  expect(view.container.querySelector('h1')?.textContent).not.toContain(question.targetWord);
  expect(view.container.querySelector('h1')?.textContent).not.toContain(question.targetMeaningZh);
  await view.click(button(`${option.id} · ${option.text}`));
  expect(await progressDb.directAttempts.count()).toBe(0);
  await act(async () => { const selected = button(`${option.id} · ${option.text}`)!; selected.click(); selected.click(); });
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(view.container.querySelector('.direct-question-area')).toBeNull();
  expect(view.container.querySelector('.direct-answer-feedback')?.textContent).toContain(question.targetMeaningZh);
  expect(await progressDb.directAttempts.count()).toBe(1);
  expect((await progressDb.rewardWallet.get('local'))?.balance).toBe(correct ? 5 : 1);
  const savedSession = await progressDb.directSessions.get(session.id);
  await view.click(link('回小鎮看小屋 →'));
  await view.waitFor(() => expect(built()).toHaveLength(1));
  expect(view.container.querySelector('[aria-pressed=true][data-town-item]')?.getAttribute('data-town-item')).toBe(TOWN_ITEMS[0].learningItemId);
  await view.click(link('繼續本輪補練 →'));
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(await progressDb.directSessions.get(session.id)).toEqual(savedSession);
  expect((await progressDb.directSessions.get(session.id))?.index).toBe(0);
  expect(await progressDb.directAttempts.count()).toBe(1);
  expect(await progressDb.reviewLogs.count()).toBe(0);
  expect(await progressDb.rewardLedger.where('kind').equals('answer').count()).toBe(1);
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
  await view.click(link('繼續本輪補練 →'));
  await view.waitFor(() => expect(button(`${q.options[0].id} · ${q.options[0].text}`)).toBeDefined());
  await view.click(button(`${q.options[0].id} · ${q.options[0].text}`));
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
  const option = q.options.find(option => option.id === q.answer)!;
  await view.waitFor(() => expect(button(`${option.id} · ${option.text}`)).toBeDefined());
  vi.spyOn(progressDb.directAttempts, 'add').mockRejectedValueOnce(new Error('disk full'));
  await view.click(button(`${option.id} · ${option.text}`));
  await view.waitFor(() => expect(view.container.querySelector('[role=alert]')?.textContent).toContain('未能儲存'));
  expect(link('回小鎮看小屋 →')).toBeUndefined();
  expect(await progressDb.directAttempts.count()).toBe(0);
  await view.click(button(`${option.id} · ${option.text}`));
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(await progressDb.directAttempts.count()).toBe(1);
});

it.each([true, false])('LV1: saved Quiz answer (correct=%s) retains the exact round across town return', async correct => {
  await view.render(<MemoryRouter initialEntries={['/town/LV1/1']}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(button('練這個字，蓋小屋')).toBeDefined());
  await view.click(button('練這個字，蓋小屋'));
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-options button')).toHaveLength(4));
  expect(view.container.querySelector('[data-testid=url]')?.textContent).toContain('/quiz?list=');
  expect(view.container.querySelector('.word-prompt')?.textContent).toContain('boy');
  // Cancel before answering, then continue the same randomized options.
  const options = [...view.container.querySelectorAll('.trial-options button')].map(el => el.textContent);
  await view.click(link('← 回小鎮 · 保留本輪進度'));
  await view.waitFor(() => expect(link('繼續本輪補練 →')).toBeDefined());
  expect(built()).toHaveLength(0);
  await view.click(link('繼續本輪補練 →'));
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-options button')).toHaveLength(4));
  expect([...view.container.querySelectorAll('.trial-options button')].map(el => el.textContent)).toEqual(options);
  const meaning = words.find(word => word.word === 'boy')!.meaningZh;
  const option = [...view.container.querySelectorAll('.trial-options button')].find(el => (el.querySelector('span')?.textContent === meaning) === correct)!;
  await act(async () => { (option as HTMLButtonElement).click(); (option as HTMLButtonElement).click(); });
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(await progressDb.reviewLogs.count()).toBe(1);
  expect((await progressDb.rewardWallet.get('local'))?.balance).toBe(correct ? 5 : 1);
  const logs = await progressDb.reviewLogs.toArray();
  expect(logs[0]).toMatchObject({ word: 'boy', mode: 'quiz-w2m', grade: correct ? 2 : 0, schedulingApplied: false });
  await view.click(link('回小鎮看小屋 →'));
  await view.waitFor(() => expect(built()).toHaveLength(1));
  expect(view.container.querySelector('[aria-pressed=true][data-town-item]')?.getAttribute('data-town-item')).toBe(LV1_TOWN_SOURCE_CARDS[0].id);
  await view.click(link('繼續本輪補練 →'));
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(view.container.querySelector('.trial-options')).toBeNull();
  expect(view.container.querySelector('.trial-answer-feedback')).not.toBeNull();
  expect(await progressDb.reviewLogs.toArray()).toEqual(logs);
  expect((await progressDb.rewardWallet.get('local'))?.balance).toBe(correct ? 5 : 1);
  expect(await progressDb.directAttempts.count()).toBe(0);
});

it('LV1: failed answer save cannot claim a house or lose the question', async () => {
  await view.render(<MemoryRouter initialEntries={['/town/LV1/1']}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(button('練這個字，蓋小屋')).toBeDefined());
  await view.click(button('練這個字，蓋小屋'));
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-options button')).toHaveLength(4));
  vi.spyOn(progressDb.reviewLogs, 'add').mockRejectedValueOnce(new Error('disk full'));
  const option = view.container.querySelector('.trial-options button');
  await view.click(option);
  expect(await progressDb.reviewLogs.count()).toBe(0);
  await view.click(option);
  await view.waitFor(() => expect(view.container.querySelector('[role=alert]')?.textContent).toContain('尚未保存'));
  expect(link('回小鎮看小屋 →')).toBeUndefined();
  expect(await progressDb.reviewLogs.count()).toBe(0);
  expect(await progressDb.quizStats.count()).toBe(0);
  await view.click(option);
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(await progressDb.reviewLogs.count()).toBe(1);
});

it.each([true, false])('LV1: browser Back restores an old pre-answer snapshot without duplicating evidence (correct=%s)', async correct => {
  await view.render(<MemoryRouter initialEntries={['/town/LV1/1']}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(button('練這個字，蓋小屋')).toBeDefined());
  await view.click(button('練這個字，蓋小屋'));
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-options button')).toHaveLength(4));
  await view.click(link('← 回小鎮 · 保留本輪進度'));
  await view.waitFor(() => expect(link('繼續本輪補練 →')).toBeDefined());
  await view.click(link('繼續本輪補練 →'));
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-options button')).toHaveLength(4));
  const meaning = words.find(word => word.word === 'boy')!.meaningZh;
  const option = [...view.container.querySelectorAll('.trial-options button')].find(el => (el.querySelector('span')?.textContent === meaning) === correct);
  await view.click(option); await view.click(option);
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  const savedLogs = await progressDb.reviewLogs.toArray();
  const savedStats = await progressDb.quizStats.toArray();
  const savedCheckIns = await progressDb.checkIns.toArray();
  // The previous town history entry still contains the earlier unanswered snapshot.
  await view.click(view.container.querySelector('[data-testid=history-back]'));
  await view.waitFor(() => expect(built()).toHaveLength(1));
  await view.click(link('繼續本輪補練 →'));
  await view.waitFor(() => expect(link('回小鎮看小屋 →')).toBeDefined());
  expect(view.container.querySelector('.trial-options')).toBeNull();
  expect(view.container.querySelector('#trial-feedback-title')?.textContent).toContain(correct ? '答對了' : '這題答錯了');
  expect(await progressDb.reviewLogs.toArray()).toEqual(savedLogs);
  expect(await progressDb.quizStats.toArray()).toEqual(savedStats);
  expect(await progressDb.checkIns.toArray()).toEqual(savedCheckIns);
  await view.click(view.container.querySelector('.trial-next'));
  await view.waitFor(() => expect(view.container.querySelector('.trial-result-page')).not.toBeNull());
  expect(view.container.querySelector('.trial-missed b')?.textContent).toBe(correct ? undefined : 'boy');
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

it('LV4: switching options only selects, and the second activation saves the final choice', async () => {
  const session = await openTownDirectPractice(TOWN_ITEMS[0].learningItemId);
  const q = practiceQuestions.find(q => q.questionId === session.questionIds[0])!;
  await view.render(<MemoryRouter initialEntries={[`/practice/direct?session=${session.id}&town=LV4`]}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(view.container.querySelectorAll('.direct-option')).toHaveLength(4));
  const [first, second] = [...view.container.querySelectorAll<HTMLButtonElement>('.direct-option')];
  await act(async () => { first.click(); second.click(); });
  expect(second.getAttribute('aria-pressed')).toBe('true');
  expect(first.getAttribute('aria-pressed')).toBe('false');
  expect(await progressDb.directAttempts.count()).toBe(0);
  await view.click(second);
  await view.waitFor(() => expect(view.container.querySelector('.direct-answer-feedback')).not.toBeNull());
  expect((await progressDb.directAttempts.toArray())[0].choice).toBe(q.options[1].id);
  expect((await progressDb.directSessions.get(session.id))?.index).toBe(0);
});

it.each(['w2m', 'm2w', 'image'])('LV1 %s: safe header, selection changes, and in-place result', async mode => {
  const boy = words.find(word => word.word === 'boy')! as WordRecord;
  const list = await saveWordList([boy], 'boy 男孩', '/textbook/LV1/1');
  await view.render(<MemoryRouter initialEntries={[`/quiz?list=${list.id}`]}><Flow /></MemoryRouter>);
  const names = { w2m: '見名辨義', m2w: '循義喚名', image: '看圖喚名' };
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-modes button')).toHaveLength(4));
  const modeButton = [...view.container.querySelectorAll<HTMLButtonElement>('.trial-modes button')].find(el => el.querySelector('h3')?.textContent === names[mode as keyof typeof names])!;
  await view.waitFor(() => expect(modeButton.disabled).toBe(false));
  await view.click(modeButton);
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-options button')).toHaveLength(4));
  await view.waitFor(() => expect(view.container.querySelector('.reward-panel-compact .reward-countdown') !== null).toBe(mode === 'w2m'));
  const explanation = view.container.querySelector<HTMLDetailsElement>('.reward-explanation')!;
  expect(explanation.open).toBe(false);
  expect(view.container.querySelector<HTMLDetailsElement>('.trial-context-notes')?.open).toBe(false);
  explanation.open = true;
  await act(async () => { await vi.waitFor(async () => expect(await progressDb.rewardRounds.count()).toBe(1)); });
  const rewardRound = (await progressDb.rewardRounds.toArray())[0];
  expect(view.container.querySelector('h1')?.textContent).not.toContain(boy.word);
  expect(view.container.querySelector('h1')?.textContent).not.toContain(boy.meaningZh);
  const [first, second] = [...view.container.querySelectorAll<HTMLButtonElement>('.trial-options button')];
  await view.click(first); await view.click(second);
  expect(second.getAttribute('aria-pressed')).toBe('true');
  expect(first.getAttribute('aria-pressed')).toBe('false');
  expect(await progressDb.reviewLogs.count()).toBe(0);
  await act(async () => { second.click(); second.click(); });
  await view.waitFor(() => expect(view.container.querySelector('.trial-answer-feedback')).not.toBeNull());
  expect(view.container.querySelector('.trial-options')).toBeNull();
  expect(view.container.querySelector('.choice-question')).toBeNull();
  expect(view.container.querySelector('.trial-answer-meaning')?.textContent).toBe(boy.meaningZh);
  expect(view.container.querySelector('.trial-answer-example')?.textContent).toContain('boy');
  expect(view.container.querySelector('.realm-count')?.textContent).toBe('1 / 1');
  expect(view.container.querySelector('.reward-panel-compact .reward-coin-count')).not.toBeNull();
  expect(view.container.querySelector<HTMLDetailsElement>('.reward-explanation')?.open).toBe(false);
  expect((await progressDb.rewardRounds.toArray())[0]).toEqual(rewardRound);
  expect(await progressDb.reviewLogs.count()).toBe(1);
});

it('LV4 advanced fill: Enter submits once without option-selection semantics', async () => {
  const session = await startScopeSession(practiceIds([TOWN_ITEMS[0]]), 'answer-leaking title', undefined, 'advanced');
  const q = practiceQuestions.find(q => q.questionId === session.questionIds[0])!;
  await view.render(<MemoryRouter initialEntries={[`/practice/direct?session=${session.id}&town=LV4`]}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(view.container.querySelector('input')).not.toBeNull());
  expect(view.container.querySelector('h1')?.textContent).not.toContain('answer-leaking title');
  const input = view.container.querySelector('input')!;
  input.value = q.answer;
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await view.waitFor(() => expect(view.container.querySelector('.direct-answer-feedback')).not.toBeNull());
  expect(await progressDb.directAttempts.count()).toBe(1);
  expect((await progressDb.directAttempts.toArray())[0].correct).toBe(true);
});

it('LV1 fill: one confirmation saves, and result replaces the input', async () => {
  const boy = words.find(word => word.word === 'boy')! as WordRecord;
  await contentDb.examples.bulkPut(examples.filter(example => example.word === 'boy') as ExampleRecord[]);
  const list = await saveWordList([boy], 'boy 男孩', '/textbook/LV1/1');
  await view.render(<MemoryRouter initialEntries={[`/quiz?list=${list.id}`]}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-modes button')).toHaveLength(4));
  const modeButton = [...view.container.querySelectorAll<HTMLButtonElement>('.trial-modes button')].find(el => el.querySelector('h3')?.textContent === '殘句補名')!;
  await view.waitFor(() => expect(modeButton.disabled).toBe(false));
  await view.click(modeButton);
  await view.waitFor(() => expect(view.container.querySelector('.fill-question input')).not.toBeNull());
  await view.waitFor(() => expect(view.container.querySelector('.reward-panel-compact .reward-countdown')).not.toBeNull());
  const explanation = view.container.querySelector<HTMLDetailsElement>('.reward-explanation')!;
  expect(explanation.open).toBe(false);
  explanation.open = true;
  await act(async () => { await vi.waitFor(async () => expect(await progressDb.rewardRounds.count()).toBe(1)); });
  const rewardRound = (await progressDb.rewardRounds.toArray())[0];
  await view.click(view.container.querySelector('.trial-next'));
  await view.waitFor(() => expect(view.container.querySelector('.trial-answer-feedback')).not.toBeNull());
  expect(view.container.querySelector('input')).toBeNull();
  expect(view.container.querySelector('.reward-panel-compact .reward-coin-count')).not.toBeNull();
  expect(view.container.querySelector<HTMLDetailsElement>('.reward-explanation')?.open).toBe(false);
  expect((await progressDb.rewardRounds.toArray())[0]).toEqual(rewardRound);
  expect(view.container.querySelector('#trial-feedback-title')?.textContent).toContain('答錯');
  expect(await progressDb.reviewLogs.count()).toBe(1);
  expect((await progressDb.reviewLogs.toArray())[0]).toMatchObject({ mode: 'fill-blank', grade: 0 });
});

it('LV1 fill: a failed save shows the alert inside the sticky submit bar and allows retry', async () => {
  const boy = words.find(word => word.word === 'boy')! as WordRecord;
  await contentDb.examples.bulkPut(examples.filter(example => example.word === 'boy') as ExampleRecord[]);
  const list = await saveWordList([boy], 'boy 男孩', '/textbook/LV1/1');
  await view.render(<MemoryRouter initialEntries={[`/quiz?list=${list.id}`]}><Flow /></MemoryRouter>);
  await view.waitFor(() => expect(view.container.querySelectorAll('.trial-modes button')).toHaveLength(4));
  const modeButton = [...view.container.querySelectorAll<HTMLButtonElement>('.trial-modes button')].find(el => el.querySelector('h3')?.textContent === '殘句補名')!;
  await view.waitFor(() => expect(modeButton.disabled).toBe(false));
  await view.click(modeButton);
  await view.waitFor(() => expect(view.container.querySelector('.fill-question input')).not.toBeNull());
  const transaction = progressDb.transaction.bind(progressDb) as (...args: unknown[]) => unknown;
  let failed = false;
  // Fail only the answer-saving transaction (it writes quizStats), once.
  vi.spyOn(progressDb, 'transaction').mockImplementation(((...args: unknown[]) => {
    if (!failed && Array.isArray(args[1]) && args[1].includes(progressDb.quizStats)) { failed = true; return Promise.reject(new Error('save failed')); }
    return transaction(...args);
  }) as never);
  await view.click(view.container.querySelector('.fill-submit'));
  await view.waitFor(() => expect(view.container.querySelector('.fill-submit-bar > [role=alert]')).not.toBeNull());
  expect(view.container.querySelector('.fill-submit-bar > [role=alert]')?.textContent).toContain('尚未保存');
  expect(view.container.querySelector('.fill-submit-bar > [role=alert] + .fill-submit')).not.toBeNull();
  expect(view.container.querySelector('.trial-answer-feedback')).toBeNull();
  expect(await progressDb.reviewLogs.count()).toBe(0);
  await view.click(view.container.querySelector('.fill-submit'));
  await view.waitFor(() => expect(view.container.querySelector('.trial-answer-feedback')).not.toBeNull());
  expect(view.container.querySelector('[role=alert]')).toBeNull();
  expect(await progressDb.reviewLogs.count()).toBe(1);
});
