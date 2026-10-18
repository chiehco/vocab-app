// @vitest-environment happy-dom
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createComponentHarness } from '../test/componentHarness';
import { useCardSwipe } from './useCardSwipe';

let view: ReturnType<typeof createComponentHarness>;
const previous = vi.fn(), next = vi.fn(), pick = vi.fn();
function Card() {
  const swipe = useCardSwipe('card', previous, next);
  return <article {...swipe}><p>Selectable card text</p><button onClick={pick}>Play or answer</button></article>;
}
async function pointer(type: string, target: Element, x: number, y: number, id=1) {
  await act(async () => { target.dispatchEvent(new PointerEvent(type, { bubbles:true, pointerId:id, pointerType:'touch', clientX:x, clientY:y })); });
}
async function swipe(target: Element, dx: number, dy=0) {
  await pointer('pointerdown',target,160,200);await pointer('pointermove',target,160+dx,200+dy);await pointer('pointerup',target,160+dx,200+dy);
}
beforeEach(async()=>{vi.clearAllMocks();view=createComponentHarness();await view.render(<Card/>);});
afterEach(async()=>{window.getSelection()?.removeAllRanges();await view.unmount();vi.restoreAllMocks();});

it('changes exactly one card in either direction and keeps vertical/diagonal reading gestures',async()=>{
  const card=view.container.querySelector('article')!;
  await swipe(card,-100);expect(next).toHaveBeenCalledTimes(1);
  await swipe(card,100);expect(previous).toHaveBeenCalledTimes(1);
  for(const [dx,dy] of [[15,120],[80,90],[20,0]])await swipe(card,dx,dy);
  expect(next).toHaveBeenCalledTimes(1);expect(previous).toHaveBeenCalledTimes(1);
});
it('dragging an answer/audio button cannot activate it or change a card; a real tap still works',async()=>{
  const button=view.container.querySelector('button')!;
  await swipe(button,-100);
  await act(async()=>{button.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));});
  expect(pick).not.toHaveBeenCalled();expect(next).not.toHaveBeenCalled();
  await pointer('pointerdown',button,160,200);await pointer('pointerup',button,160,200);
  await view.click(button);expect(pick).toHaveBeenCalledTimes(1);
});
it('does not navigate during selection, a long press, cancelled touch or two-finger pinch',async()=>{
  const card=view.container.querySelector('article')!, text=view.container.querySelector('p')!;
  const range=document.createRange();range.selectNodeContents(text);window.getSelection()?.addRange(range);
  await swipe(card,-100);window.getSelection()?.removeAllRanges();
  let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now);
  await pointer('pointerdown',card,160,200);now=900;await pointer('pointerup',card,30,200);
  await pointer('pointerdown',card,160,200);await pointer('pointercancel',card,30,200);await pointer('pointerup',card,30,200);
  await pointer('pointerdown',card,160,200);await pointer('pointerdown',card,180,200,2);
  await pointer('pointerup',card,30,200);await pointer('pointerup',card,240,200,2);
  expect(next).not.toHaveBeenCalled();expect(previous).not.toHaveBeenCalled();
});
