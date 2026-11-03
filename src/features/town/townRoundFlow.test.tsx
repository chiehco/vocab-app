// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import type { WordRecord } from '../../db/types';
import { createComponentHarness } from '../../test/componentHarness';
import { LV1_TOWN_SOURCE_CARDS } from './lv1TownModel';
import { readTownStudyRound, startTownStudy, type TownKey } from './townStudy';
import { TOWN_ITEMS } from './townModel';
import TownStudyScreen from './TownStudyScreen';

let view: ReturnType<typeof createComponentHarness>;
const ids = [...new Set([...LV1_TOWN_SOURCE_CARDS.map(card => card.officialWordId), ...TOWN_ITEMS.map(item => item.officialWordId)].filter((id): id is string => !!id))];
const syntheticWords: WordRecord[] = ids.map((wordId, index) => ({
  wordId, word: `fixture${index}`, level: 'LV1', pos: 'n.', posAll: ['n.'],
  meaningZh: `測試義項 ${index}`, meaningEn: null, usagePattern: null, syllables: null,
  stressPattern: null, phoneticUs: null, familyKey: null, isCore: false, sourceNote: null, status: 'reviewed',
}));
function Flow() {
  const navigate = useNavigate();
  return <><button data-testid="back" onClick={() => navigate(-1)}>上一頁</button><Routes>
    <Route path="/town/:level/:unit/study" element={<TownStudyScreen />} />
    <Route path="/town/:level/:unit" element={<p>小鎮</p>} />
  </Routes></>;
}
async function open(id: string, town: TownKey = 'LV1/1') {
  await view.render(<MemoryRouter initialEntries={[`/town/${town}/study?session=${id}`]}><Flow /></MemoryRouter>);
}
async function reopen(id: string, town: TownKey = 'LV1/1') {
  await view.unmount(); view = createComponentHarness(); await open(id, town);
}
async function choose(id: string, index: number, correct: boolean) {
  await view.waitFor(() => expect(view.container.querySelectorAll('.seal-options button')).toHaveLength(4));
  const round = (await readTownStudyRound(id))!;
  const meaning = syntheticWords.find(word => word.wordId === round.items[index].wordId)!.meaningZh;
  const choice = [...view.container.querySelectorAll('.seal-options button')].find(button => (button.querySelector('span')!.textContent === meaning) === correct);
  await view.click(choice);
  await view.waitFor(() => expect(view.container.querySelector('.seal-card-answer')).not.toBeNull());
  expect(view.container.querySelector('.seal-answer-status')?.textContent).toBe(correct ? '答對了' : '這題還需要複習');
}
async function saveTwice() {
  await act(async () => {
    const save = view.container.querySelector<HTMLButtonElement>('.seal-swipe-hint')!;
    save.click(); save.click();
  });
}
const summary = () => view.container.querySelector('.town-practice-complete');
const fullRewards = () => view.container.querySelectorAll('.reward-panel:not(.reward-panel-compact)');
beforeEach(async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  await progressDb.delete(); await progressDb.open(); await contentDb.delete(); await contentDb.open();
  await contentDb.words.bulkPut(syntheticWords);
  await progressDb.settings.bulkPut([{key:'autoPronounce',value:false},{key:'dailyNewWordCap',value:10}]);
  view = createComponentHarness();
});
afterEach(async () => {
  await view.unmount(); await progressDb.delete(); await contentDb.delete(); vi.restoreAllMocks();
});

it('saving the first answer continues the frozen round without a per-word results page', async () => {
  const round = await startTownStudy('LV1/1');
  await open(round.id);
  await view.waitFor(() => expect(view.container.querySelectorAll('.seal-options button')).toHaveLength(4));
  await view.click(view.container.querySelector('.seal-options button'));
  await view.waitFor(() => expect(view.container.querySelector('.seal-card-answer')).not.toBeNull());
  await saveTwice();
  await view.waitFor(() => expect(view.container.querySelector('.seal-card-meta')?.textContent).toContain('第 2 張'));
  expect(view.container.querySelector('.town-study-saved')).toBeNull();
  expect(view.container.querySelector('.town-practice-complete')).toBeNull();
  expect(view.container.querySelectorAll('.reward-panel:not(.reward-panel-compact)')).toHaveLength(0);
  expect(await progressDb.reviewLogs.count()).toBe(1);
});

it.each(([10,20,30] as const).flatMap(size => (['LV1/1','LV4/17'] as const).map(town => ({size,town}))))('$town: shows one summary only after all $size answers, with mixed correctness and duplicate clicks', async ({size,town}) => {
  await progressDb.settings.put({key:'dailyNewWordCap',value:size});
  const round = await startTownStudy(town);
  expect(round.items).toHaveLength(size);
  await open(round.id,town);
  for (let index=0; index<size; index++) {
    await choose(round.id,index,index%2===0);
    expect(summary()).toBeNull(); expect(fullRewards()).toHaveLength(0);
    expect(await progressDb.reviewLogs.count()).toBe(index);
    await saveTwice();
    await view.waitFor(() => expect(summary() !== null || view.container.querySelector('.seal-card-meta')?.textContent?.includes(`第 ${index+2} 張`)).toBe(true));
    expect(await progressDb.reviewLogs.count()).toBe(index+1);
    expect(summary() !== null).toBe(index===size-1);
  }
  expect(view.container.querySelectorAll('.town-practice-complete')).toHaveLength(1);
  expect(fullRewards()).toHaveLength(1);
  expect(summary()?.textContent).toContain(`本輪 ${size} 字`);
  const ledger = await progressDb.rewardLedger.toArray(), logs = await progressDb.reviewLogs.toArray();
  expect(ledger.filter(entry=>entry.kind==='answer')).toHaveLength(size);
  expect(logs.filter(log=>log.grade===2)).toHaveLength(size/2);
  expect(logs.filter(log=>log.grade===0)).toHaveLength(size/2);
  expect((await progressDb.checkIns.toArray())[0]).toMatchObject({reviewCount:size,newWordsCount:size,sessionsCount:1});
  const wallet = await progressDb.rewardWallet.get('local');
  await reopen(round.id,town);
  await view.waitFor(()=>expect(summary()).not.toBeNull());
  expect(await progressDb.rewardLedger.toArray()).toEqual(ledger);
  expect(await progressDb.reviewLogs.toArray()).toEqual(logs);
  expect(await progressDb.rewardWallet.get('local')).toEqual(wallet);
});

it('exit, Back and reload preserve an unanswered choice; a failed save stays in place and retries once', async () => {
  const round = await startTownStudy('LV1/1'); await open(round.id);
  await choose(round.id,0,false);
  const selected = (await readTownStudyRound(round.id))!.choices[0];
  await view.click(view.container.querySelector('header a'));
  await view.waitFor(()=>expect(view.container.textContent).toContain('小鎮'));
  await view.click(view.container.querySelector('[data-testid=back]'));
  await view.waitFor(()=>expect(view.container.querySelector('.seal-card-answer')).not.toBeNull());
  await reopen(round.id);
  await view.waitFor(()=>expect(view.container.querySelector('.seal-card-answer')).not.toBeNull());
  expect((await readTownStudyRound(round.id))!.choices[0]).toBe(selected);
  expect(await progressDb.reviewLogs.count()).toBe(0); expect(summary()).toBeNull();
  vi.spyOn(progressDb.rewardWallet,'put').mockRejectedValueOnce(Error('synthetic disk failure'));
  await saveTwice();
  await view.waitFor(()=>expect(view.container.querySelector('[role=alert]')?.textContent).toContain('synthetic disk failure'));
  expect(view.container.querySelector('.seal-card-answer')).not.toBeNull();
  expect(await progressDb.reviewLogs.count()).toBe(0); expect(await progressDb.rewardLedger.count()).toBe(0);
  await saveTwice();
  await view.waitFor(()=>expect(view.container.querySelector('.seal-card-meta')?.textContent).toContain('第 2 張'));
  expect(await progressDb.reviewLogs.count()).toBe(1);
  expect((await progressDb.rewardWallet.get('local'))?.balance).toBe(1);
  expect(summary()).toBeNull(); expect(fullRewards()).toHaveLength(0);
});

it.each([1,10])('interruption after saving restores the same card inline in a %s-word round without another grade or reward', async size => {
  await progressDb.settings.put({key:'dailyNewWordCap',value:size});
  const round = await startTownStudy('LV1/1'); await open(round.id); await choose(round.id,0,true);
  const put = progressDb.settings.put.bind(progressDb.settings);
  const failure = vi.spyOn(progressDb.settings,'put').mockImplementation((row,...args) => row.key===`town-study:${round.id}` && (row.value as typeof round).index===1
    ? Promise.reject(Error('synthetic advance failure')) as never : put(row,...args));
  await saveTwice();
  await view.waitFor(()=>expect(view.container.querySelector('[role=alert]')?.textContent).toContain('synthetic advance failure'));
  failure.mockRestore();
  const logs = await progressDb.reviewLogs.toArray(), ledger = await progressDb.rewardLedger.toArray(), card = await progressDb.cardStates.toArray();
  expect(logs).toHaveLength(1);
  await reopen(round.id);
  await view.waitFor(()=>expect(view.container.textContent).toContain('本題已保存，可繼續本輪。'));
  expect(view.container.querySelector('.seal-card-answer')).not.toBeNull();
  expect(view.container.querySelector('.seal-swipe-hint')).toBeNull(); expect(summary()).toBeNull(); expect(fullRewards()).toHaveLength(0);
  await act(async()=>{const next=view.container.querySelector<HTMLButtonElement>('.seal-controls .town-secondary')!;next.click();next.click();});
  await view.waitFor(()=>expect(size===1 ? summary()!==null : view.container.querySelector('.seal-card-meta')?.textContent?.includes('第 2 張')).toBe(true));
  expect(await progressDb.reviewLogs.toArray()).toEqual(logs); expect(await progressDb.rewardLedger.toArray()).toEqual(ledger);
  expect(await progressDb.cardStates.toArray()).toEqual(card);
  if(size>1)expect((await startTownStudy('LV1/1')).id).toBe(round.id);
  else expect((await readTownStudyRound(round.id))?.index).toBe(1);
});

it('a short queue reports its actual size, and an empty queue does not display round rewards', async () => {
  const available = syntheticWords.filter(word=>LV1_TOWN_SOURCE_CARDS.some(card=>card.officialWordId===word.wordId)).slice(0,3);
  await contentDb.words.clear(); await contentDb.words.bulkPut(available);
  await progressDb.settings.put({key:'dailyNewWordCap',value:30});
  const round = await startTownStudy('LV1/1'); expect(round.items).toHaveLength(3); await open(round.id);
  for (let index=0;index<3;index++) {
    await view.waitFor(()=>expect(view.container.querySelector('.seal-reveal')).not.toBeNull());
    await view.click(view.container.querySelector('.seal-reveal'));
    await view.waitFor(()=>expect(view.container.querySelector('.seal-grades')).not.toBeNull());
    await view.click(view.container.querySelector('.grade-2'));
    await view.waitFor(()=>expect(summary() !== null || view.container.querySelector('.seal-card-meta')?.textContent?.includes(`第 ${index+2} 張`)).toBe(true));
    expect(summary()!==null).toBe(index===2);
  }
  expect(summary()?.textContent).toContain('本輪 3 字'); expect(summary()?.textContent).not.toContain('30');
  expect(await progressDb.rewardLedger.count()).toBe(0); expect(await progressDb.reviewLogs.count()).toBe(3);
  await progressDb.settings.put({key:'dailyNewWordCap',value:0});
  await contentDb.words.clear();
  const empty=await startTownStudy('LV1/1'); await reopen(empty.id);
  await view.waitFor(()=>expect(summary()?.textContent).toContain('今天的安排已完成'));
  expect(fullRewards()).toHaveLength(0);
});

it('known marking and self grading retain their existing scheduling and coin policies while continuing', async () => {
  await progressDb.settings.put({key:'dailyNewWordCap',value:2});
  const round=await startTownStudy('LV1/1'); await open(round.id); await choose(round.id,0,true);
  await view.click(view.container.querySelector('.seal-known'));
  await view.waitFor(()=>expect(view.container.querySelector('.seal-card-meta')?.textContent).toContain('第 2 張'));
  expect((await progressDb.cardStates.get(round.items[0].word))?.intervalDays).toBe(21);
  const current=(await readTownStudyRound(round.id))!;current.options[1]=[];
  await progressDb.settings.put({key:`town-study:${round.id}`,value:current});
  await view.waitFor(()=>expect(view.container.querySelector('.seal-reveal')).not.toBeNull());
  await view.click(view.container.querySelector('.seal-reveal'));
  await view.waitFor(()=>expect(view.container.querySelector('.grade-1')).not.toBeNull());
  await view.click(view.container.querySelector('.grade-1'));
  await view.waitFor(()=>expect(summary()).not.toBeNull());
  expect((await progressDb.reviewLogs.toArray()).map(log=>log.mode)).toEqual(['known','flashcard']);
  expect((await progressDb.rewardWallet.get('local'))?.balance).toBe(5);
  expect((await progressDb.checkIns.toArray())[0].newWordsCount).toBe(1);
});
