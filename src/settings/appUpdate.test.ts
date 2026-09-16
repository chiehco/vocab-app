import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

const script = readFileSync('public/registerSW.js', 'utf8');
async function setup(controlled = true, offline = false) {
  const swEvents: Record<string, () => void> = {};
  const windowEvents: Record<string, () => void> = {};
  const elements: { textContent?: string; onclick?: () => void; children: unknown[] }[] = [];
  const reload = vi.fn();
  const update = offline ? vi.fn().mockRejectedValue(new Error('offline')) : vi.fn().mockResolvedValue(undefined);
  const register = vi.fn().mockResolvedValue({ update });
  runInNewContext(script, {
    navigator: { serviceWorker: { controller: controlled ? {} : null, register, addEventListener: (event: string, fn: () => void) => { swEvents[event] = fn; } } },
    document: {
      body: { append: vi.fn() }, addEventListener: vi.fn(),
      createTextNode: (text: string) => text,
      createElement: () => {
        const element = { children: [] as unknown[], style: {}, setAttribute: vi.fn(), remove: vi.fn(),
          replaceChildren(...children: unknown[]) { this.children = children; },
          append(child: unknown) { this.children.push(child); } };
        elements.push(element); return element;
      },
    },
    window: { addEventListener: (event: string, fn: () => void) => { windowEvents[event] = fn; } },
    location: { reload }, Date,
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  return { swEvents, windowEvents, elements, reload, register };
}
it('offers reload after an existing installation updates, without interrupting an answer', async () => {
  const app = await setup();
  expect(app.register).toHaveBeenCalledWith('./sw.js', { scope: './', updateViaCache: 'none' });
  app.swEvents.controllerchange();
  expect(app.reload).not.toHaveBeenCalled();
  const button = app.elements.find(element => element.textContent === '更新版本');
  expect(button).toBeDefined();
  button!.onclick!();
  expect(app.reload).toHaveBeenCalledOnce();
});
it('does not prompt a first-time installation to reload', async () => {
  const app = await setup(false);
  app.swEvents.controllerchange();
  expect(app.elements).toHaveLength(0);
});
it('reports a manual offline check without reloading or touching stored progress', async () => {
  const app = await setup(true, true);
  app.windowEvents['vocab-check-update']();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(app.elements[0].children[0]).toContain('暫時無法取得更新');
  expect(app.reload).not.toHaveBeenCalled();
});
