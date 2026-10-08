import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

/** Small DOM harness: tests exercise real React effects, events and live queries. */
export function createComponentHarness() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  return {
    container,
    async render(element: ReactNode) {
      await act(async () => { root.render(element); });
    },
    async click(element: Element | null | undefined) {
      if (!element) throw new Error('Expected a clickable element');
      await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    },
    async waitFor(assertion: () => void) {
      const deadline = Date.now() + 3000;
      for (;;) {
        try { assertion(); return; }
        catch (error) { if (Date.now() >= deadline) throw error; }
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
      }
    },
    async unmount() {
      await act(async () => { root.unmount(); });
      container.remove();
    },
  };
}
