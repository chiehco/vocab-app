import { useEffect, useRef } from "react";

export type SwipeResult = "prev" | "next" | null;

/** iOS Safari 從螢幕左右緣起滑是瀏覽器上下頁手勢，這段距離內不接手。 */
export const SWIPE_EDGE_GUARD_PX = 24;
/** 低於這個水平距離視為誤觸，不換字。 */
export const SWIPE_MIN_DISTANCE_PX = 48;
/** 垂直位移超過水平位移的這個比例視為在捲動頁面。 */
export const SWIPE_MAX_OFF_AXIS_RATIO = 0.6;

/** 純函式，方便測邊界；dx 向左為負。 */
export function resolveSwipe(
  { startX, dx, dy, viewportWidth }: { startX: number; dx: number; dy: number; viewportWidth: number },
): SwipeResult {
  if (startX < SWIPE_EDGE_GUARD_PX || startX > viewportWidth - SWIPE_EDGE_GUARD_PX) return null;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX) return null;
  if (Math.abs(dy) > Math.abs(dx) * SWIPE_MAX_OFF_AXIS_RATIO) return null;
  return dx < 0 ? "next" : "prev";
}

/** 手勢起點若在可橫向捲動的區塊（例如字根列）或輸入元件上，讓原本的操作優先。 */
function startsOnOwnGesture(target: EventTarget | null, container: HTMLElement): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== container.parentElement) {
    if (node.matches("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return true;
    if (node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 1) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * 左右滑換字卡。滑動只是既有上一張／下一張按鈕的補充，按鈕仍是主要操作。
 * 容器需要 touch-action: pan-y（.swipe-pane），否則垂直捲動會被手勢吃掉。
 */
export function useSwipeNavigate<T extends HTMLElement>(
  { onPrev, onNext, enabled = true }: { onPrev?: () => void; onNext?: () => void; enabled?: boolean },
) {
  const ref = useRef<T>(null);
  const handlers = useRef({ onPrev, onNext });
  handlers.current = { onPrev, onNext };

  useEffect(() => {
    const container = ref.current;
    if (!container || !enabled) return;
    let start: { x: number; y: number; id: number } | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || !event.isPrimary) return;
      if (startsOnOwnGesture(event.target, container)) return;
      start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return;
      const result = resolveSwipe({
        startX: start.x,
        dx: event.clientX - start.x,
        dy: event.clientY - start.y,
        viewportWidth: window.innerWidth,
      });
      start = null;
      if (result === "prev") handlers.current.onPrev?.();
      if (result === "next") handlers.current.onNext?.();
    };
    const onPointerCancel = () => { start = null; };

    container.addEventListener("pointerdown", onPointerDown, { passive: true });
    container.addEventListener("pointerup", onPointerUp, { passive: true });
    container.addEventListener("pointercancel", onPointerCancel, { passive: true });
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [enabled]);

  return ref;
}
