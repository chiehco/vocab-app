// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { createComponentHarness } from '../../test/componentHarness';
import DirectScreen from './DirectScreen';
import { practiceQuestions } from './model';
import { startSession } from './store';
import { TOWN_ITEMS, TOWN_UNIT } from '../town/townModel';
import { practiceIds } from '../vocabulary/model';
import { directRewardWord } from '../rewards/directScope';
import { directRoundId } from '../rewards/model';

let view:ReturnType<typeof createComponentHarness>;
beforeEach(async()=>{
  await progressDb.delete();await progressDb.open();await contentDb.delete();await contentDb.open();
  await progressDb.settings.put({key:'autoPronounce',value:false});
  vi.spyOn(HTMLElement.prototype,'scrollIntoView').mockImplementation(()=>{});
  view=createComponentHarness();
});
afterEach(async()=>{await view.unmount();vi.restoreAllMocks();await progressDb.delete();await contentDb.delete();});
const button=(text:string)=>[...view.container.querySelectorAll('button')].find(button=>button.textContent===text);

it.each([true,false])('unrewarded grammar (correct=%s) neither presents nor starts a mixed advanced fill round',async correct=>{
  const grammarItems=new Set(TOWN_UNIT.items.filter(item=>item.kind!=='vocabulary').map(item=>item.learningItemId));
  const grammar=practiceQuestions.find(question=>question.learningItemId && grammarItems.has(question.learningItemId) && question.options.length && !directRewardWord(question.questionId))!;
  expect(grammar).toBeDefined();
  const fill=practiceQuestions.find(question=>question.questionId===practiceIds([TOWN_ITEMS[0]])[0])!;
  const session=await startSession([grammar.questionId,fill.questionId],'mixed grammar and fill',undefined,undefined,'advanced');
  const realNow=Date.now.bind(Date);let dwell=0;
  vi.spyOn(Date,'now').mockImplementation(()=>realNow()+dwell);
  await view.render(<MemoryRouter initialEntries={[`/practice/direct?session=${session.id}`]}><DirectScreen/></MemoryRouter>);
  const answer=grammar.options.find(option=>(option.id===grammar.answer)===correct)!;
  await view.waitFor(()=>expect(button(`${answer.id} · ${answer.text}`)).toBeDefined());
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});
  expect(await progressDb.rewardRounds.count()).toBe(0);
  // Ten minutes of grammar dwell must not consume the subsequent fill window.
  dwell=600_000;
  await view.click(button(`${answer.id} · ${answer.text}`));
  await view.waitFor(()=>expect(view.container.querySelector('.direct-answer-feedback')).not.toBeNull());
  expect(await progressDb.rewardRounds.count()).toBe(0);expect(await progressDb.rewardLedger.count()).toBe(0);
  const beforeFill=Date.now();await view.click(button('下一題'));
  await view.waitFor(()=>expect(view.container.querySelector('.direct-question-area input')).not.toBeNull());
  await view.waitFor(()=>expect(view.container.textContent).toContain('填空加成：3 分鐘'));
  const round=await progressDb.rewardRounds.get(directRoundId(session.id));
  expect(round).toMatchObject({challenge:'fill-v2',distinctWordCount:1});expect(round!.startedAt).toBeGreaterThanOrEqual(beforeFill);
  const input=view.container.querySelector('input')!;input.value=fill.answer;
  await act(async()=>{input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));});
  await view.waitFor(()=>expect(view.container.querySelector('.reward-receipt')?.textContent).toContain('基礎金幣 +5'));
  const start=round!.startedAt;await view.unmount();view=createComponentHarness();
  await view.render(<MemoryRouter initialEntries={[`/practice/direct?session=${session.id}`]}><DirectScreen/></MemoryRouter>);
  await view.waitFor(()=>expect(view.container.querySelector('.direct-answer-feedback')).not.toBeNull());
  expect((await progressDb.rewardRounds.get(directRoundId(session.id)))?.startedAt).toBe(start);
  expect(await progressDb.directAttempts.count()).toBe(2);expect(await progressDb.rewardLedger.count()).toBe(1);
});
