// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { progressDb } from '../../db/progressDb';
import { createComponentHarness } from '../../test/componentHarness';
import RewardPanel from './RewardPanel';
let view: ReturnType<typeof createComponentHarness>;
beforeEach(async()=>{await progressDb.delete();await progressDb.open();view=createComponentHarness();});
afterEach(async()=>{await view.unmount();await progressDb.delete();vi.restoreAllMocks();});
it('starts folded, displays the real wallet and accessible countdown, and folding never changes reward state',async()=>{
  const now=Date.now();vi.spyOn(Date,'now').mockReturnValue(now);
  await progressDb.rewardWallet.put({id:'local',balance:80,updatedAt:now});
  const round={id:'qa',startedAt:now-5000,questionCount:25,challenge:'meaning-v2' as const,distinctWordCount:25};
  await progressDb.rewardRounds.put(round);
  await view.render(<RewardPanel compact roundId="qa" resetKey={1}/>);
  await view.waitFor(()=>expect(view.container.querySelector('.reward-coin-count')?.textContent).toContain('80'));
  const details=view.container.querySelector<HTMLDetailsElement>('.reward-explanation')!;
  expect(details.open).toBe(false);
  const progress=view.container.querySelector('progress')!;
  expect(progress.value).toBe(25);expect(progress.max).toBe(30);expect(progress.getAttribute('aria-valuetext')).toBe('剩餘 25 秒');
  details.open=true;await view.render(<RewardPanel compact roundId="qa" resetKey={2}/>);
  expect(view.container.querySelector<HTMLDetailsElement>('.reward-explanation')!.open).toBe(false);
  expect(await progressDb.rewardRounds.get('qa')).toEqual(round);expect(await progressDb.rewardLedger.count()).toBe(0);
  expect((await progressDb.rewardWallet.get('local'))?.balance).toBe(80);
});
it('shows an unstarted or expired round without starting a timer or issuing coins',async()=>{
  await view.render(<RewardPanel compact roundPreview={{challenge:'meaning-v2',distinctWordCount:2}}/>);
  await view.waitFor(()=>expect(view.container.textContent).toContain('尚未計時'));
  expect(await progressDb.rewardRounds.count()).toBe(0);
  await progressDb.rewardRounds.put({id:'expired',startedAt:Date.now()-60000,questionCount:2,challenge:'meaning-v2',distinctWordCount:2});
  await view.render(<RewardPanel compact roundId="expired"/>);
  await view.waitFor(()=>expect(view.container.querySelector('progress')?.value).toBe(0));
  expect(view.container.textContent).toContain('加成時間已到');expect(await progressDb.rewardLedger.count()).toBe(0);
});
