import { useEffect, useRef, type PointerEvent, type MouseEvent } from 'react';

const INTERACTIVE = 'a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]';
type Gesture = { id: number; x: number; y: number; time: number; blocked: boolean; axis?: 'x' | 'y' };

/** One deliberate horizontal touch changes one card. Vertical scroll and selection stay native. */
export function useCardSwipe(key: string, onPrevious?: () => void, onNext?: () => void) {
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Set<number>());
  const suppressClickUntil = useRef(0);
  useEffect(() => { gesture.current = null; }, [key]);
  const selected = () => !!window.getSelection()?.toString();
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      pointers.current.add(event.pointerId);
      suppressClickUntil.current = 0;
      if (pointers.current.size !== 1) { gesture.current = null; return; }
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(),
        blocked: selected() || !!(event.target as Element).closest(INTERACTIVE) };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = Math.abs(event.clientX - start.x), dy = Math.abs(event.clientY - start.y);
      if (Math.max(dx, dy) < 12) return;
      suppressClickUntil.current = performance.now() + 500;
      if (!start.axis) start.axis = dx > dy * 1.5 ? 'x' : 'y';
      if (start.axis === 'x' && !selected()) {
        event.preventDefault();
      }
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      pointers.current.delete(event.pointerId);
      const start = gesture.current;
      gesture.current = null;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 12) suppressClickUntil.current = performance.now() + 500;
      if (start.blocked || start.axis === 'y' || selected() || performance.now() - start.time > 700
        || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx > 0) onPrevious?.(); else onNext?.();
    },
    onPointerCancel(event: PointerEvent<HTMLElement>) {
      pointers.current.delete(event.pointerId); gesture.current = null;
      suppressClickUntil.current = performance.now() + 500;
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (event.detail > 0 && performance.now() < suppressClickUntil.current) {
        event.preventDefault(); event.stopPropagation();
      }
    },
  };
}
