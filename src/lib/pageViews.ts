// One promise per loaded document, outside React's mount/effect lifecycle.
// Failed or timed-out writes are never retried: the server may already have counted.
let pageView: Promise<number | null> | undefined;

async function incrementPageView(): Promise<number | null> {
  if (!import.meta.env.PROD || import.meta.env.MODE !== 'production'
    || globalThis.location?.origin !== 'https://chiehco.github.io'
    || !/^\/vocab-app\/(?:index\.html)?$/.test(globalThis.location.pathname)
    || globalThis.navigator?.onLine === false) return null;

  const configured = import.meta.env.VITE_PAGEVIEW_ENDPOINT;
  if (!configured) return null;
  let endpoint: URL;
  try {
    endpoint = new URL(configured);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password
      || endpoint.search || endpoint.hash) return null;
  } catch { return null; }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(endpoint.href, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
      // Empty body: no URL/hash, word, answer, progress, or visitor identifier.
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null || !('total' in data)) return null;
    return typeof data.total === 'number' && Number.isSafeInteger(data.total) && data.total >= 1
      ? data.total : null;
  } catch { return null; }
  finally { clearTimeout(timeout); }
}

export function recordPageView(): Promise<number | null> {
  pageView ??= incrementPageView();
  return pageView;
}
