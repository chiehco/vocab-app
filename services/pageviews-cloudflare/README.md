# 萬詞譜最小累計瀏覽計數器

單一 ES module Worker／SQLite Durable Object，無執行期套件，沒有訪客或學習資料表。Wrangler／Miniflare 只用於本機部署與測試。

## 部署狀態

- **後端已上線，正式網站前端尚未接入。**
- 端點：https://vocab-pageviews.chiehco.workers.dev/pageviews
- Worker：`vocab-pageviews`；帳戶 ID：`a6a0e9070c9872a9a8021ff57c240ee4`。
- 部署前 API 回覆同名 Worker 不存在（10007），沒有覆蓋未知資源。
- 初次版本：`e74cfbd5-3b82-4b69-ab30-b758f9203dd0`，2026-10-17 16:31 UTC。
- 同份程式重新部署後現行版本：`93548a06-36a8-497a-b1d1-32d84ff594b3`。
- 驗收共寫入 **11 次測試瀏覽**，保留在總數內；驗收結束總數為 11。沒有清零或補造歷史數字。
- 公開端點已填入獨立前端分支 `.env.production`；合併與 GitHub Pages 發布另待批准。

## 配置與驗收

`wrangler.jsonc` 包含 `PAGEVIEWS → PageViewCounter` binding 與 `v1/new_sqlite_classes` migration。不要改成 `new_classes` 或另加 `exports`。固定物件 `site-total` 只保存數字 `total`。空 POST 且 Origin 為 `https://chiehco.github.io` 才加 1；GET、query、錯誤路徑／來源、非空 body、無效 preflight 都拒絕而不加數。沒有讀數、reset 或管理端點。

本機 20 個測試通過，包括真實 workerd／SQLite 100 次並發得到 1–100、dispose／重啟後得到 101，以及儲存失敗回傳 503；Wrangler dry-run 通過。實際雲端驗收：POST 1 → GET／preflight／各無效請求 → POST 2；8 次並發得到 3–10；重新部署後 POST 得到 11。固定 CORS、無快取與拒絕來源通過。沒有刻意破壞雲端儲存；故障與前端離線／阻擋／逾時、不重試由隔離測試驗證。

服務只保存總數，不設 cookie，不收訪客 ID、單字、作答或進度。Worker observability 關閉，無 console。Cloudflare 作為 HTTPS 服務商仍接觸 IP、Origin、瀏覽器網路標頭等連線資料。Origin／CORS 不能阻止非瀏覽器偽造來源，這是簡單瀏覽次數，不是不重複人數。

免費方案支援 SQLite DO，仍有帳戶共用配額；故障或超額時安靜漏計，不影響學習、不重試或自動升級。沒有改 DNS 或付費方案。

## 後續維護

```powershell
$env:WRANGLER_SEND_METRICS='false'
npm ci
npm test
npm run check
# 僅在已有部署授權時：
npm run deploy
```

已按使用者批准完成官方 Wrangler OAuth，沿用 `account:read`、`user:read`、`workers_scripts:write`、`offline_access`。其中 Workers 權限涵蓋 scripts、Durable Objects、子網域、triggers、tail，不只限單一 Worker；offline_access 允許本機 CLI 保存可續期登入。不要因 CLI 警告缺少其他預設 scope 而擴權，不讀取或提交憑證。沒有建立 API token、接 GitHub App／Workers Builds，也不需 KV、routes、D1、Pages、R2 或 zone 權限。

來源：[計數並發](https://developers.cloudflare.com/durable-objects/examples/build-a-counter/)、[SQLite migration](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/)、[免費 SQLite DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)。