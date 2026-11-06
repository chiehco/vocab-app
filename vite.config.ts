import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import { readFile, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

function withholdRetainedSourcePair(): Plugin {
  let projectRoot = "";
  // This retained elevator pairing is explicitly outside the public card registry.
  // Keep its source bytes and review history; withhold only the Pages artifact.
  const asset = "wordbeast/lv1-reviewed/LV1-U12-31-275c827e2d7a.webp";
  return {
    name: "withhold-retained-source-pair",
    apply: "build",
    configResolved(config) { projectRoot = config.root; },
    async writeBundle(options) {
      const registries = await Promise.all([
        "auditedWordIllustrations", "approvedExampleImages", "lv1ReviewedImages",
      ].map(async name => JSON.parse(await readFile(resolve(projectRoot,
        `src/features/vocabulary/${name}.json`), "utf8")) as Array<{ illustration?: { path?: string } }>));
      if (registries.flat().some(row => row.illustration?.path === asset)) {
        throw new Error("The retained source pairing now has a public registration; review its build exclusion.");
      }
      if (!options.dir) throw new Error("An explicit build output directory is required.");
      const outputRoot = resolve(options.dir), target = resolve(outputRoot, asset);
      if (!target.startsWith(outputRoot + sep)) throw new Error("Asset exclusion escaped the build output.");
      await rm(target, { force: true });
    },
  };
}

export default defineConfig({
  base: "./",
  test: { maxWorkers: 1 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "萬詞譜・字獸收服場",
        short_name: "萬詞譜",
        lang: "zh-TW",
        description: "用圖像、測驗與間隔複習，把英文單字一隻一隻收服回來。",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f6f0df",
        theme_color: "#66745a",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // 首次只安裝程式與 S+A 輕量包；完整資料不再是啟動門檻。
        globPatterns: ["**/*.{js,css,html,ico,svg}", "assets/gsat115-*.{png,pdf}", "exams/gsat/*.{jpg,pdf}", "data/v1/sa-pack.json", "templates/*.{xlsx,csv}", "curriculum/**/*.webp"],
        // Accepted LV1–LV6 starter union: 9.49 MiB.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        // Prefer the deployed shell on navigation; fall back to the offline shell.
        navigateFallback: undefined,
        directoryIndex: null,
        // General cards add an asset revision query; use the same precached curriculum image offline.
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "app-pages-v1",
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 10 },
              precacheFallback: { fallbackURL: "index.html" },
            },
          },
          {
            // Asset revisions use ?v=...; match the pathname so viewed cards remain available offline.
            urlPattern: ({ url }) => /\/wordbeast\/.*\.(?:png|webp)$/i.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "wordbeast-images-v1",
              matchOptions: {
                // 程式版號更新不應讓已下載的同一張圖卡突然離線失效。
                ignoreSearch: true,
              },
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
    withholdRetainedSourcePair(),
  ],
});
