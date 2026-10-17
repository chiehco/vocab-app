# 網站累計瀏覽次數：Cloudflare 候選

## 狀態與範圍

- Cloudflare 分支：`feat/site-pageviews-cloudflare-20261017`。獨立 worktree，基準為已核對的主站 main `d3f4192`；不合併教材候選、PR35 或其他工作區變更。
- GAS 候選完整保留於 `feat/site-pageviews-20261017` 的 `36b141a`，另有已交付 ZIP；此 Cloudflare 分支不包含 GAS transport。
- 每次開啟／重新整理一份正式網站 document 嘗試加 1。SPA 切頁、切單字、答題、React 重繪／StrictMode 重掛不增加。不是不重複人數。
- 顯示成功寫入後回傳的全站總數；從服務啟用時開始，不補造歷史、不用 localStorage 假裝全站統計。
- 沒有部署、建立憑證、OAuth 授權、連 GitHub App、修改 Cloudflare 帳號或推送分支。主站合併／部署仍待批准。

## 實作

- 後端位於 `services/pageviews-cloudflare/`：單一 ES module Worker 與一個 SQLite-backed Durable Object。只保存一個數字 `total`，固定物件名 `site-total`。
- 空白 `POST /pageviews` 才能加 1；只接受 `Origin: https://chiehco.github.io`。錯誤來源、路徑、query、method、body、preflight 都不加數。GET 不提供加數或 reset；沒有管理端點。
- `PageViewCounter.increment` 只讀／加 1／寫回 `total`，用 Durable Object 儲存的 input gates 保護並發，等待持久化寫入後才回傳。錯誤或超出 JS 安全整數範圍的已存值不覆寫。
- 回應固定 CORS、`Cache-Control: no-store`，不設 cookie。停用 Worker 應用 observability，無 console、訪客明細或識別碼。
- 前端 `main.tsx` 不 await 計數，單一 document 共用一份 Promise；只在 production 與正式網站路徑執行。端點限定 HTTPS `*.workers.dev/pageviews`，無 query／帳密。
- 每次只發一次空白 POST，`credentials: omit`、no-referrer、3 秒逾時；HTTP、離線、阻擋、格式或逾時失敗都靜默，不重試、不補數、不阻擋學習；不顯示假的 0。首頁重掛沿用同一回應快照。

## 資料與限制

- 應用不傳／保存網頁 hash、單字、答案、學習進度、姓名、email、裝置／訪客 ID、本機資料庫內容。服務只保存總數。
- Cloudflare 作為 HTTPS 服務商仍會接觸 IP、Origin、瀏覽器網路標頭、請求時間等連線資料及平台安全／執行中繼資料；不能聲稱供應商看不到連線資料。
- 免費方案支援 SQLite-backed Durable Objects，受 Worker／DO 請求、執行時間與儲存讀寫配額限制。超額失敗就隱藏數字，不強制升級。
- Origin／CORS 不是非瀏覽器請求的防偽認證，公開端點仍可能被灌數；離線或故障可能漏數。本功能不做訪客分析或防刷系統。

## 部署與授權

使用者目前已停在 Dashboard 的 Hello World 部署前。此功能第一次建立類別必須套用 SQLite migration；只貼 `worker.mjs` 並不足以建立命名空間與 binding。採官方本機 Wrangler 路徑，詳見 [最小操作與權限](../services/pageviews-cloudflare/README.md)。

已確認 Wrangler 4.151.1 可用；`wrangler whoami` 回報 `You are not authenticated. Please run wrangler login.`。未執行登入。下一步只需使用者批准並本人完成窄範圍 OAuth：`account:read`、`user:read`、`workers_scripts:write`，Wrangler 會自動加上 `offline_access` 並保存可續期登入。這不是訪客資料權限，且尚未授予。

## 驗證

- 服務 Node／VM 與本機 workerd／SQLite 測試 20 個通過，包括 100 次並發結果恰好 1–100，dispose／重啟同一持久化目錄後為 101。
- `wrangler deploy --dry-run` 通過，確認 `env.PAGEVIEWS → PageViewCounter`；只是本機打包，不代表已建立雲端資源。
- 主站全量 `npm test -- --maxWorkers=1 --testTimeout=15000`：106 檔、670 個測試全部通過，exit code 0，371.87 秒（session 75142 已完成）。lint、TypeScript 編譯、正式 Vite／PWA 建置與 `git diff --check` 通過；既有大 bundle 警告仍在。CI 加入獨立後端測試。
- 真正 Cloudflare 端點尚未建立／驗收。主站端點變數 `PAGEVIEW_ENDPOINT` 尚未設定。

官方依據：[並發計數器](https://developers.cloudflare.com/durable-objects/examples/build-a-counter/)、[免費方案](https://developers.cloudflare.com/durable-objects/platform/pricing/)、[SQLite migration](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/)。
