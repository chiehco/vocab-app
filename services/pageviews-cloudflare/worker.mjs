import { DurableObject } from 'cloudflare:workers';

const SITE_ORIGIN = 'https://chiehco.github.io';

function json(value, status, allowedOrigin = false) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (allowedOrigin) headers['Access-Control-Allow-Origin'] = SITE_ORIGIN;
  return new Response(JSON.stringify(value), { status, headers });
}

export class PageViewCounter extends DurableObject {
  async increment() {
    const stored = await this.ctx.storage.get('total');
    const total = stored === undefined ? 0 : stored;
    if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0
      || total >= Number.MAX_SAFE_INTEGER) throw new Error('Counter unavailable');
    // Durable Object input gates serialize this storage read/modify/write sequence.
    // Await the durable write before returning; keep no visitor or event records.
    await this.ctx.storage.put('total', total + 1);
    return total + 1;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/pageviews' || url.search) return json({ error: 'not_found' }, 404);
    if (request.headers.get('Origin') !== SITE_ORIGIN) return json({ error: 'forbidden' }, 403);
    if (request.method === 'OPTIONS') {
      if (request.headers.get('Access-Control-Request-Method') !== 'POST'
        || request.headers.get('Access-Control-Request-Headers')) return json({ error: 'invalid_preflight' }, 400, true);
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': SITE_ORIGIN,
        'Access-Control-Allow-Methods': 'POST', 'Cache-Control': 'no-store', Vary: 'Origin',
      } });
    }
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, true);
    try {
      // HTTP may expose an empty stream even for a POST without a body.
      if (request.body !== null) {
        const reader = request.body.getReader();
        try {
          if (!(await reader.read()).done) {
            await reader.cancel();
            return json({ error: 'body_not_allowed' }, 400, true);
          }
        } finally { reader.releaseLock(); }
      }
      // Every request uses the same fixed object; nothing from the client selects it.
      const total = await env.PAGEVIEWS.getByName('site-total').increment();
      if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 1) {
        throw new Error('Counter unavailable');
      }
      return json({ total }, 200, true);
    } catch {
      // No automatic retry: the write could have committed before a transport failure.
      return json({ error: 'unavailable' }, 503, true);
    }
  },
};
