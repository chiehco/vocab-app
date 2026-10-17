import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const endpoint = 'https://counter.example.test/pageviews';
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('PROD', true);
  vi.stubEnv('MODE', 'production');
  vi.stubEnv('VITE_PAGEVIEW_ENDPOINT', endpoint);
  vi.stubGlobal('location', new URL('https://chiehco.github.io/vocab-app/#/textbook/LV4/17'));
  vi.stubGlobal('navigator', { onLine: true });
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ total: 1234 }) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('counts once per document, including deep links, concurrent callers, and SPA changes', async () => {
  const { recordPageView } = await import('./pageViews');
  const first = recordPageView();
  expect(recordPageView()).toBe(first);
  expect(await first).toBe(1234);
  vi.stubGlobal('location', new URL('https://chiehco.github.io/vocab-app/#/quiz?answer=private'));
  expect(await recordPageView()).toBe(1234);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(endpoint, {
    method: 'POST', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer',
    cache: 'no-store', redirect: 'error', signal: expect.any(AbortSignal),
  });
});

it('starts a new count after a document reload (new module lifetime)', async () => {
  await (await import('./pageViews')).recordPageView();
  vi.resetModules();
  await (await import('./pageViews')).recordPageView();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it.each(['', 'http://counter.example.test', '/api/count', 'invalid',
  'https://user:password@counter.example.test', 'https://counter.example.test/?key=secret',
  'https://counter.example.test/#anything'])('rejects an unconfigured or unsuitable endpoint: %s', async value => {
  vi.stubEnv('VITE_PAGEVIEW_ENDPOINT', value);
  expect(await (await import('./pageViews')).recordPageView()).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([
  ['https://localhost:4173/vocab-app/', 'production', true, true],
  ['https://preview.example.test/vocab-app/', 'production', true, true],
  ['https://chiehco.github.io/another-app/', 'production', true, true],
  ['https://chiehco.github.io/vocab-app/other.html', 'production', true, true],
  ['https://chiehco.github.io/vocab-app/', 'qa', true, true],
  ['https://chiehco.github.io/vocab-app/', 'private', true, true],
  ['https://chiehco.github.io/vocab-app/', 'development', false, true],
  ['https://chiehco.github.io/vocab-app/', 'production', true, false],
] as const)('does not count excluded environments: %s %s', async (url, mode, prod, online) => {
  vi.stubGlobal('location', new URL(url));
  vi.stubGlobal('navigator', { onLine: online });
  vi.stubEnv('MODE', mode);
  vi.stubEnv('PROD', prod);
  expect(await (await import('./pageViews')).recordPageView()).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('accepts index.html on the production site', async () => {
  vi.stubGlobal('location', new URL('https://chiehco.github.io/vocab-app/index.html#/quiz'));
  expect(await (await import('./pageViews')).recordPageView()).toBe(1234);
});

it.each([null, {}, { total: 0 }, { total: -1 }, { total: 1.2 }, { total: '1234' },
  { total: Number.MAX_SAFE_INTEGER + 1 }])('hides invalid response data and never retries: %j', async data => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => data });
  const { recordPageView } = await import('./pageViews');
  expect(await recordPageView()).toBeNull();
  expect(await recordPageView()).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it.each(['network', 'http', 'json', 'sync'])('silently settles %s failures without retries', async failure => {
  if (failure === 'network') fetchMock.mockRejectedValue(new TypeError('blocked/offline'));
  if (failure === 'sync') fetchMock.mockImplementation(() => { throw new Error('blocked'); });
  if (failure === 'http') fetchMock.mockResolvedValue({ ok: false });
  if (failure === 'json') fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new Error('invalid JSON'); } });
  const { recordPageView } = await import('./pageViews');
  expect(await recordPageView()).toBeNull();
  expect(await recordPageView()).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('aborts a stalled request after 3 seconds and never retries on reconnect', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal!.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const { recordPageView } = await import('./pageViews');
  const pending = recordPageView();
  await vi.advanceTimersByTimeAsync(3000);
  expect(await pending).toBeNull();
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  expect(await recordPageView()).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
