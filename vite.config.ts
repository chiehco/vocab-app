import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
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
        globPatterns: ["**/*.{js,css,html,ico,svg}", "data/v1/sa-pack.json"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "index.html",
        runtimeCaching: [
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
  ],
});
