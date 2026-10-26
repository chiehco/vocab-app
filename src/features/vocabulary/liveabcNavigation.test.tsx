// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react';
import { createComponentHarness } from '../../test/componentHarness';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import type { WordRecord } from '../../db/types';
import pack from '../../../public/data/v1/sa-pack.json';
import TextbookScreen from './TextbookScreen';
import VocabularyScreen from './VocabularyScreen';
import { getStudyResume } from '../modes/studyResume';

const snapshot=vi.hoisted(()=>({words:[] as WordRecord[]}));
// Exercise the real query result shapes now that textbook cards also load
// word/sense details; a global words-array mock cannot stand in for every query.
vi.mock('../../components/useUnitProgress',()=>({useUnitProgress:()=>new Map()}));
let view:ReturnType<typeof createComponentHarness>;
const render=async (path:string)=>{
  view=createComponentHarness();
  await view.render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/textbook" element={<TextbookScreen/>}/>
    <Route path="/textbook/:level/:unit" element={<TextbookScreen/>}/>
    <Route path="/vocabulary" element={<VocabularyScreen/>}/>
    <Route path="/quiz" element={<p>Practice opened</p>}/>
  </Routes></MemoryRouter>);
};
beforeEach(async()=>{
  await progressDb.delete(); await progressDb.open(); await contentDb.delete(); await contentDb.open();
  snapshot.words=pack.words as unknown as WordRecord[]; await contentDb.words.bulkPut(snapshot.words);
});
afterEach(async()=>{await view?.unmount(); await progressDb.delete(); await contentDb.delete();});
const button=(text:string)=>[...view.container.querySelectorAll('button')].find(e=>e.textContent?.includes(text));
const link=(text:string)=>[...view.container.querySelectorAll('a')].find(e=>e.textContent?.includes(text));

it('selects the LiveABC publisher, shows only seven units, and returns to the same book',async()=>{
  await render('/textbook?level=LV3');
  expect(button('常春藤')?.getAttribute('aria-pressed')).toBe('true');
  await view.click(button('LiveABC'));
  expect(view.container.textContent).toContain('核心字彙完全攻略 · Basic');
  const tiles=[...view.container.querySelectorAll('.unit-tile')]; expect(tiles).toHaveLength(7);
  await view.click(tiles[0]); expect(view.container.textContent).toContain('14 個詞彙');
  expect(link('看字卡')?.getAttribute('href')).toBe('/vocabulary?level=LIVEABC_BASIC&unit=1');
  await view.click(link('選單元')); expect(view.container.querySelectorAll('.unit-tile')).toHaveLength(7);
});

it('reads an unlinked supplement without borrowed art or examples and resumes the exact item',async()=>{
  await render('/vocabulary?level=LIVEABC_BASIC&unit=2');
  const selector=view.container.querySelector<HTMLSelectElement>('select[aria-label="跳到項目"]')!;
  const carry=[...selector.options].find(o=>o.textContent?.includes('carry out'))!;
  selector.value=carry.value;
  await act(async()=>{selector.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(view.container.querySelector('article')?.textContent).toContain('carry out');
  expect(view.container.querySelector('article')?.textContent).toContain('進行；執行');
  expect(view.container.querySelector('article img')).toBeNull();
  expect(view.container.textContent).toContain('教材補充詞，尚未連到一般字卡');
  expect((await getStudyResume())?.href).toContain(carry.value);
  await view.click(link('課本單元')); expect(view.container.textContent).toContain('LiveABC');
  expect(await progressDb.cardStates.count()).toBe(0);
});

it('opens general practice with only existing mapped words and creates a template once on repeated clicks',async()=>{
  await render('/textbook/LIVEABC_BASIC/1');
  await view.click(button('加入我的群組'));
  await view.waitFor(()=>expect(view.container.textContent).toContain('已加入我的群組'));
  expect(await progressDb.customGroups.count()).toBe(1);
  await view.click(button('加入我的群組'));
  expect(await progressDb.customGroups.count()).toBe(1);
  await view.waitFor(()=>expect(button('一般單字練習（14 詞）')?.disabled).toBe(false));
  await view.click(button('一般單字練習（14 詞）'));
  await view.waitFor(()=>expect(view.container.textContent).toContain('Practice opened'));
  const lists=await progressDb.settings.filter(s=>s.key.startsWith('word-list:')).toArray();
  expect(lists).toHaveLength(1); expect(lists[0].value).toMatchObject({returnTo:'/textbook/LIVEABC_BASIC/1'});
  expect(await progressDb.reviewLogs.count()).toBe(0); expect(await progressDb.rewardWallet.count()).toBe(0);
});

it.each(['/textbook/LIVEABC_BASIC/8','/vocabulary?level=LIVEABC_BASIC&unit=8','/textbook/UNKNOWN/1'])('blocks excluded/unknown direct link %s',async(path)=>{
  await render(path); expect(view.container.textContent).toContain('尚未開放');
  expect(view.container.querySelector('article')).toBeNull(); expect(link('看字卡')).toBeUndefined();
  expect(await progressDb.customGroups.count()).toBe(0); expect(await progressDb.settings.count()).toBe(0);
});
