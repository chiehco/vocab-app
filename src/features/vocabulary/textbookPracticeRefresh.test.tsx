// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import pack from '../../../public/data/v1/sa-pack.json';
import baseline from '../../../scripts/fixtures/lv6-main-integration-baseline.json';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import type { WordRecord } from '../../db/types';
import { createComponentHarness } from '../../test/componentHarness';
import { textbookUnits } from './textbookCatalog';
import TextbookScreen from './TextbookScreen';

const snapshot = vi.hoisted(() => ({ words: [] as WordRecord[] }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => snapshot.words }));
const oldIds = new Set(baseline.mainWordIds);
const oldWords = pack.words.filter(word=>oldIds.has(word.wordId)) as unknown as WordRecord[];
const unit = textbookUnits.find(row=>row.level==='LV6' && row.unit===1)!;
const newlyInstalledId = unit.wordIds.find(id=>!oldIds.has(id))!;
let view: ReturnType<typeof createComponentHarness>;
const screen=()=> <MemoryRouter initialEntries={['/textbook/LV6/1']}><Routes>
  <Route path="/textbook/:level/:unit" element={<TextbookScreen/>}/>
  <Route path="/quiz" element={<p>Practice opened</p>}/>
</Routes></MemoryRouter>;
beforeEach(async()=>{
  snapshot.words=oldWords;
  await contentDb.delete(); await contentDb.open();
  await progressDb.delete(); await progressDb.open();
  await contentDb.words.bulkPut(pack.words as unknown as WordRecord[]);
  view=createComponentHarness();
  await view.render(screen());
});
afterEach(async()=>{await view.unmount();await contentDb.delete();await progressDb.delete();});
const start=()=>[...view.container.querySelectorAll('button')].find(button=>button.textContent?.includes('一般單字練習'));

it('waits for all 78 LV6 IDs before allowing practice after the former-main→current-starter content refresh',async()=>{
  expect(snapshot.words).toHaveLength(5052); expect(newlyInstalledId).toBeTruthy();
  expect(await contentDb.words.count()).toBe(pack.words.length);
  expect(start()?.disabled).toBe(true); expect(start()?.textContent).toContain('準備中');
  await view.click(start()); expect(await progressDb.settings.count()).toBe(0);
  snapshot.words=pack.words as unknown as WordRecord[]; await view.render(screen());
  expect(start()?.disabled).toBe(false);
  await view.click(start()); await view.waitFor(()=>expect(view.container.textContent).toContain('Practice opened'));
  const lists=await progressDb.settings.filter(row=>row.key.startsWith('word-list:')).toArray();
  expect(lists).toHaveLength(1); expect(lists[0].value).toMatchObject({wordIds:unit.wordIds,returnTo:'/textbook/LV6/1'});
  expect(await progressDb.reviewLogs.count()).toBe(0); expect(await progressDb.rewardWallet.count()).toBe(0);
});
it('still blocks a genuinely missing mapped word without creating a partial practice list',async()=>{
  snapshot.words=pack.words as unknown as WordRecord[]; await view.render(screen());
  await contentDb.words.delete(newlyInstalledId);
  await view.click(start()); await view.waitFor(()=>expect(view.container.textContent).toContain('字卡資料尚未載入完整'));
  expect(await progressDb.settings.count()).toBe(0); expect(await progressDb.reviewLogs.count()).toBe(0);
});
