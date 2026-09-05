export const WORD_BEAST_IMAGE_CACHE = "wordbeast-images-v1";

export interface ImagePackProgress {
  processed: number;
  cached: number;
  failed: number;
  total: number;
  ready: boolean;
}

function progress(processed: number, cached: number, failed: number, total: number): ImagePackProgress {
  return { processed, cached, failed, total, ready: processed === total && failed === 0 };
}

/** 將今日新字圖片確實寫入與 Workbox 相同的 CacheStorage，最多同時下載三張。 */
export async function prefetchTodayImages(
  urls: Array<string | null>,
  onProgress: (value: ImagePackProgress) => void = () => undefined,
): Promise<ImagePackProgress> {
  const uniqueUrls = [...new Set(urls.filter((url): url is string => !!url))];
  const total = uniqueUrls.length;
  if (total === 0) {
    const empty = progress(0, 0, 0, 0);
    onProgress(empty);
    return empty;
  }
  if (typeof caches === "undefined") {
    const unavailable = progress(total, 0, total, total);
    onProgress(unavailable);
    return unavailable;
  }

  let cache: Cache;
  try {
    cache = await caches.open(WORD_BEAST_IMAGE_CACHE);
  } catch {
    const unavailable = progress(total, 0, total, total);
    onProgress(unavailable);
    return unavailable;
  }
  let cursor = 0;
  let processed = 0;
  let cached = 0;
  let failed = 0;

  async function worker() {
    while (cursor < total) {
      const url = uniqueUrls[cursor++];
      try {
        const request = new Request(url);
        const existing = await cache.match(request, { ignoreSearch: true });
        if (!existing) {
          const response = await fetch(request);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await cache.put(request, response.clone());
        }
        cached += 1;
      } catch {
        failed += 1;
      } finally {
        processed += 1;
        onProgress(progress(processed, cached, failed, total));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(3, total) }, () => worker()));
  return progress(processed, cached, failed, total);
}
