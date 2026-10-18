// @vitest-environment happy-dom
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createComponentHarness } from '../../test/componentHarness';
import { ReviewFlashcard } from './ReviewScreen';
import type { WordRecord } from '../../db/types';
vi.mock('dexie-react-hooks',()=>({useLiveQuery:()=>undefined}));
vi.mock('../wordbeast/useIllustrationMedia',()=>({useIllustrationMedia:()=>undefined}));
const word={wordId:'W000291',word:'enter',meaningZh:'進入；參加',pos:'v.',level:'LV1'} as WordRecord;
const options=[word,...['room','add','garden'].map(name=>({...word,word:name,meaningZh:name}))];
let view:ReturnType<typeof createComponentHarness>;
const flip=vi.fn(),grade=vi.fn(),known=vi.fn();
function card(flipped=false,choice:string|null=null,saveBeforeNext=false,saving=false){return <ReviewFlashcard item={{wordRecord:word,isNew:true}} flipped={flipped} choice={choice} options={options} onFlip={flip} onGrade={grade} onKnown={known} position={1} saving={saving} saveBeforeNext={saveBeforeNext}/>;}
async function swipe(){const el=view.container.querySelector('.seal-card')!;await act(async()=>{for(const [type,x]of [['pointerdown',200],['pointermove',60],['pointerup',60]]as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:1,clientX:x,clientY:250}));});}
beforeEach(()=>{view=createComponentHarness();vi.clearAllMocks();vi.spyOn(HTMLElement.prototype,'scrollIntoView').mockImplementation(()=>{});});
afterEach(async()=>{await view.unmount();vi.restoreAllMocks();});
it('keeps choices before answering, replaces them with content after answering and never auto-marks known',async()=>{
  await view.render(card());expect(view.container.querySelectorAll('.seal-options button')).toHaveLength(4);
  await swipe();expect(flip).not.toHaveBeenCalled();expect(grade).not.toHaveBeenCalled();
  await view.click(view.container.querySelector('.seal-options button'));expect(flip).toHaveBeenCalledTimes(1);
  await view.render(card(true,'enter'));expect(view.container.querySelector('.seal-options')).toBeNull();
  expect(view.container.querySelector('.seal-card-answer')?.textContent).toContain('進入');
  expect(view.container.querySelector('[role=status]')?.textContent).toBe('答對了');
  expect(view.container.querySelector('.study-actions-dock .seal-known')).not.toBeNull();expect(known).not.toHaveBeenCalled();
  await view.click(view.container.querySelector('.seal-known'));expect(known).toHaveBeenCalledTimes(1);
});
it('town choices still require explicit saving, and busy actions cannot advance',async()=>{
  await view.render(card(true,'enter',true));await swipe();expect(grade).not.toHaveBeenCalled();
  await view.click(view.container.querySelector('.seal-swipe-hint'));expect(grade).toHaveBeenCalledExactlyOnceWith(2);
  grade.mockClear();await view.render(card(true,'room',false,true));await swipe();
  await view.click(view.container.querySelector('.seal-swipe-hint'));expect(grade).not.toHaveBeenCalled();
});
it('answered review swipes advance with the existing correct/incorrect grade',async()=>{
  await view.render(card(true,'enter'));await swipe();expect(grade).toHaveBeenLastCalledWith(2);
  await view.render(card(true,'room'));await swipe();expect(grade).toHaveBeenLastCalledWith(0);
});
