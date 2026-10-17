import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import test from 'node:test';
import { Miniflare } from 'miniflare';

const origin = 'https://chiehco.github.io';
const url = 'https://counter.example.test/pageviews';
const scriptPath = fileURLToPath(new URL('worker.mjs', import.meta.url));
const source = await readFile(scriptPath, 'utf8');
const context = createContext({ Response, URL });
const cloudflare = new SyntheticModule(['DurableObject'], function () {
  this.setExport('DurableObject', class { constructor(ctx) { this.ctx = ctx; } });
}, { context });
const module = new SourceTextModule(source, { context });
await module.link(specifier => {
  assert.equal(specifier, 'cloudflare:workers');
  return cloudflare;
});
await module.evaluate();
const { default: worker, PageViewCounter } = module.namespace;
const post = () => new Request(url, { method: 'POST', headers: { Origin: origin } });

test('returns only the total, with fixed CORS, no cookies, no cache, and one fixed object', async () => {
  let calls = 0;
  const response = await worker.fetch(post(), { PAGEVIEWS: { getByName(name) {
    assert.equal(name, 'site-total');
    calls++;
    return { increment: async () => 12 };
  } } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { total: 12 });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(calls, 1);
});

const invalidRequests = [
  [() => new Request(url), 403],
  [() => new Request(url, { method: 'POST', headers: { Origin: 'https://other.example' } }), 403],
  [() => new Request(url, { headers: { Origin: origin } }), 405],
  [() => new Request(url, { method: 'DELETE', headers: { Origin: origin } }), 405],
  [() => new Request(url + '?total=0', { method: 'POST', headers: { Origin: origin } }), 404],
  [() => new Request(url + '/reset', { method: 'POST', headers: { Origin: origin } }), 404],
  [() => new Request(url, { method: 'POST', headers: { Origin: origin }, body: 'answer=private' }), 400],
];
for (const [makeRequest, status] of invalidRequests) {
  test(`rejects ${makeRequest().method} ${makeRequest().url} with ${status} without counting`, async () => {
    const response = await worker.fetch(makeRequest(), { PAGEVIEWS: { getByName() { assert.fail('Must not count'); } } });
    assert.equal(response.status, status);
    if (status === 403) assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  });
}

test('valid preflight is read-only; unsupported methods/headers are rejected', async () => {
  for (const [method, headers, status] of [['POST', '', 204], ['DELETE', '', 400], ['POST', 'x-user-id', 400]]) {
    const response = await worker.fetch(new Request(url, { method: 'OPTIONS', headers: {
      Origin: origin, 'Access-Control-Request-Method': method, ...(headers ? { 'Access-Control-Request-Headers': headers } : {}),
    } }), { PAGEVIEWS: { getByName() { assert.fail('Preflight must not count'); } } });
    assert.equal(response.status, status);
  }
});

test('failed writes return 503 without retry or internal details', async () => {
  let attempts = 0;
  const response = await worker.fetch(post(), { PAGEVIEWS: { getByName() {
    return { increment: async () => { attempts++; throw new Error('private details'); } };
  } } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'unavailable' });
  assert.equal(attempts, 1);
});

for (const stored of [null, -1, 1.2, '10', NaN, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
  test(`preserves invalid/overflow storage: ${String(stored)}`, async () => {
    let writes = 0;
    const counter = new PageViewCounter({ storage: {
      get: async () => stored, put: async () => { writes++; },
    } });
    await assert.rejects(counter.increment(), /Counter unavailable/);
    assert.equal(writes, 0);
  });
}

test('waits for the durable write and persists only the single total key', async () => {
  let release;
  let markStarted;
  const started = new Promise(resolveStarted => { markStarted = resolveStarted; });
  const writes = [];
  const counter = new PageViewCounter({ storage: {
    get: async key => { assert.equal(key, 'total'); return undefined; },
    put: (key, value) => {
      writes.push([key, value]);
      return new Promise(resolveWrite => { release = resolveWrite; markStarted(); });
    },
  } });
  let completed = false;
  const result = counter.increment().then(total => { completed = true; return total; });
  await started;
  assert.equal(completed, false);
  assert.deepEqual(writes, [['total', 1]]);
  release();
  assert.equal(await result, 1);
});

test('Wrangler declares SQLite migration/binding, no secrets, and disabled application logs', async () => {
  const config = JSON.parse(await readFile(new URL('wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.name, 'vocab-pageviews');
  assert.deepEqual(config.durable_objects.bindings, [{ name: 'PAGEVIEWS', class_name: 'PageViewCounter' }]);
  assert.deepEqual(config.migrations, [{ tag: 'v1', new_sqlite_classes: ['PageViewCounter'] }]);
  assert.deepEqual(config.observability, { enabled: false });
  assert.equal(config.vars, undefined);
  assert.doesNotMatch(source, /console\.|request\.(json|text)\(|Cookie|User-Agent/);
});

test('local workerd/SQLite: 100 simultaneous loads produce exactly 1..100 and restart continues at 101',
  { timeout: 60000 }, async () => {
    const testRoot = resolve(fileURLToPath(new URL('.test-tmp/', import.meta.url)));
    await mkdir(testRoot, { recursive: true });
    const persistence = await mkdtemp(join(testRoot, 'counter-'));
    const options = {
      modules: true, scriptPath, compatibilityDate: '2026-07-01',
      durableObjects: { PAGEVIEWS: { className: 'PageViewCounter', useSQLite: true } },
      durableObjectsPersist: persistence,
    };
    let mf;
    try {
      mf = new Miniflare(options);
      const totals = await Promise.all(Array.from({ length: 100 }, async () => {
        const response = await mf.dispatchFetch(url, { method: 'POST', headers: { Origin: origin } });
        assert.equal(response.status, 200);
        return (await response.json()).total;
      }));
      assert.deepEqual(totals.sort((a, b) => a - b), Array.from({ length: 100 }, (_, i) => i + 1));
      await mf.dispose();
      mf = new Miniflare(options);
      const response = await mf.dispatchFetch(url, { method: 'POST', headers: { Origin: origin } });
      assert.deepEqual(await response.json(), { total: 101 });
    } finally {
      if (mf) await mf.dispose();
      assert.ok(resolve(persistence).startsWith(testRoot + sep), 'Cleanup must stay in the named local test directory');
      await rm(persistence, { recursive: true, force: true });
    }
  });
