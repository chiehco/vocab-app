import { afterEach, expect, it, vi } from "vitest";
import { prefetchTodayImages, WORD_BEAST_IMAGE_CACHE } from "./prefetchTodayImages";

afterEach(() => vi.unstubAllGlobals());

function installCache(existingPaths = new Set<string>()) {
  const stored = new Set(existingPaths);
  const cache = {
    match: vi.fn(async (request: Request) => stored.has(new URL(request.url).pathname) ? new Response("cached") : undefined),
    put: vi.fn(async (request: Request) => { stored.add(new URL(request.url).pathname); }),
  };
  const open = vi.fn(async () => cache);
  vi.stubGlobal("caches", { open });
  return { cache, open, stored };
}

it("去除重複圖片，已快取的路徑不重新下載", async () => {
  const { cache, open } = installCache(new Set(["/wordbeast/s/W000001.webp"]));
  const fetchMock = vi.fn(async () => new Response("image", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await prefetchTodayImages([
    "https://example.test/wordbeast/s/W000001.webp?v=new",
    "https://example.test/wordbeast/s/W000001.webp?v=new",
  ]);

  expect(open).toHaveBeenCalledWith(WORD_BEAST_IMAGE_CACHE);
  expect(cache.match).toHaveBeenCalledTimes(1);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(result).toEqual({ processed: 1, cached: 1, failed: 0, total: 1, ready: true });
});

it("部分圖片失敗時不誤報離線完成", async () => {
  const { cache } = installCache();
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => (
    request.url.includes("bad") ? new Response("", { status: 503 }) : new Response("image", { status: 200 })
  )));
  const updates: number[] = [];

  const result = await prefetchTodayImages([
    "https://example.test/good.webp?v=1",
    "https://example.test/bad.webp?v=1",
  ], (value) => updates.push(value.processed));

  expect(cache.put).toHaveBeenCalledTimes(1);
  expect(updates.at(-1)).toBe(2);
  expect(result).toEqual({ processed: 2, cached: 1, failed: 1, total: 2, ready: false });
});

it("瀏覽器拒絕 CacheStorage 時回報待下載，不讓首頁一直停在準備中", async () => {
  vi.stubGlobal("caches", { open: vi.fn(async () => { throw new Error("storage denied"); }) });
  const result = await prefetchTodayImages(["https://example.test/card.webp"]);
  expect(result).toEqual({ processed: 1, cached: 0, failed: 1, total: 1, ready: false });
});
