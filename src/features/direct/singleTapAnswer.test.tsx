// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { contentDb } from '../../db/contentDb';
import { progressDb } from '../../db/progressDb';
import { createComponentHarness } from '../../test/componentHarness';
import { practiceQuestions } from './model';
import * as store from './store';
import DirectScreen from './DirectScreen';
let view: ReturnType<typeof createComponentHarness>;
const question=practiceQuestions.find(q=>q.questionId==='CHOICE-CLOZE-ORIG-LV4U20-ferry')!;
beforeEach(async()=>{
 await progressDb.delete();await progressDb.open();await contentDb.delete();await contentDb.open();
 await progressDb.settings.put({key:'autoPronounce',value:false});
 vi.spyOn(HTMLElement.prototype,'scrollIntoView').mockImplementation(()=>{});
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true});
 view=createComponentHarness();
});
afterEach(async()=>{await view.unmount();vi.restoreAllMocks();await progressDb.delete();await contentDb.delete()});
const button=(text:string)=>[...view.container.querySelectorAll('button')].find(b=>b.textContent===text);
async function open(ids=[question.questionId]){
 const session=await store.startSession(ids,'合成單次提交',undefined,ids,'basic');
 await view.render(<MemoryRouter initialEntries={[`/practice/direct?session=${session.id}`]}><DirectScreen/></MemoryRouter>);
 await view.waitFor(()=>expect(button('A · sway')).toBeDefined());return session;
}
it('keeps lookup independent, records its hint, and submits once even with repeated clicks during a slow save',async()=>{
 const session=await open();
 expect(view.container.querySelector<HTMLDetailsElement>('.direct-answer-explanation')?.open).toBe(false);
 expect(view.container.querySelector<HTMLDetailsElement>('.reward-explanation')?.open).toBe(false);
 expect(view.container.querySelector('.direct-answer-feedback')).toBeNull();
 await view.click(view.container.querySelector('[aria-label="查選項：sway"]'));
 await view.waitFor(()=>expect(view.container.querySelector('dialog')?.open).toBe(true));
 expect(await progressDb.directAttempts.count()).toBe(0);expect(await progressDb.rewardLedger.count()).toBe(0);
 const realUpdate=store.updateQuestion;let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 vi.spyOn(store,'updateQuestion').mockImplementationOnce(async(...args)=>{await gate;return realUpdate(...args)});
 const submit=vi.spyOn(store,'submitAnswer');const selected=button('A · sway'),other=button('D · ferry');
 await view.click(selected);await view.click(selected);await view.click(other);
 expect(submit).not.toHaveBeenCalled();expect(await progressDb.directAttempts.count()).toBe(0);
 release();await view.waitFor(()=>expect(view.container.querySelector('.direct-answer-feedback')).not.toBeNull());
 const attempts=await progressDb.directAttempts.toArray();expect(attempts).toHaveLength(1);expect(attempts[0]).toMatchObject({choice:'A',hintUsed:true,correct:false,firstAttempt:true});
 expect(submit).toHaveBeenCalledTimes(1);expect(await progressDb.rewardLedger.count()).toBe(1);expect((await progressDb.rewardWallet.get('local'))?.balance).toBe(1);
 expect((await progressDb.directSessions.get(session.id))?.index).toBe(0);
 expect(view.container.querySelectorAll('.direct-option-explanation')).toHaveLength(4);
});
it('reports a failed save without an attempt or award, then permits one-click retry',async()=>{
 await open();vi.spyOn(store,'updateQuestion').mockRejectedValueOnce(new Error('synthetic write failure'));
 await view.click(button('D · ferry'));await view.waitFor(()=>expect(view.container.querySelector('[role="alert"]')?.textContent).toContain('未能儲存'));
 expect(await progressDb.directAttempts.count()).toBe(0);expect(await progressDb.rewardLedger.count()).toBe(0);
 await view.click(button('D · ferry'));await view.waitFor(()=>expect(view.container.querySelector('.direct-answer-feedback')).not.toBeNull());
 expect(await progressDb.directAttempts.count()).toBe(1);expect((await progressDb.directAttempts.toArray())[0]).toMatchObject({choice:'D',firstAttempt:true,correct:true});
 expect(await progressDb.rewardLedger.count()).toBe(1);expect((await progressDb.rewardWallet.get('local'))?.balance).toBe(5);
});
it('does not reveal option explanations before submission or advance twice on repeated next clicks',async()=>{
 const next=practiceQuestions.find(q=>q.sourceType==='original_target_word_choice'&&q.questionId!==question.questionId)!;
 const session=await open([question.questionId,next.questionId]);expect(view.container.querySelector('.direct-option-explanation')).toBeNull();
 await view.click(button('D · ferry'));await view.waitFor(()=>expect(button('下一題')).toBeDefined());
 const realNext=store.nextQuestion;let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 const spy=vi.spyOn(store,'nextQuestion').mockImplementationOnce(async id=>{await gate;return realNext(id)});
 const nextButton=button('下一題');await view.click(nextButton);await view.click(nextButton);expect(spy).toHaveBeenCalledTimes(1);
 release();await view.waitFor(()=>expect(view.container.querySelector('.direct-question-area')).not.toBeNull());
 expect((await progressDb.directSessions.get(session.id))?.index).toBe(1);expect(await progressDb.directAttempts.count()).toBe(1);
});
