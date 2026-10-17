# 網站累計瀏覽次數：Cloudflare

## 發布狀態

- **後端已上線；正式網站前端尚未上線。**
- 端點：`https://vocab-pageviews.chiehco.workers.dev/pageviews`。
- 後端現行版本：`93548a06-36a8-497a-b1d1-32d84ff594b3`。
- 獨立前端分支 `feat/site-pageviews-cloudflare-20261017` 已 rebase 至 main `4a55fb6`，保留 PR36 合併的 42 個教材單元。未混入 PR35 或其他工作區未提交檔案。
- 非秘密端點僅提交在此分支的 `.env.production`，不需 GitHub repository variable。沒有更動正式 main／Pages，合併、正式前端發布另待批准。
- GAS 候選仍完整保留於 `feat/site-pageviews-20261017` 的 `36b141a` 與原交付 ZIP；Cloudflare 分支不含 GAS transport。
- 雲端驗收留下 **11 次測試瀏覽**，總數截至驗收結束為 11，不清零、不當成既有訪客或補造歷史數字。

## 行為與資料

每次開啟或重新整理正式網站，一個新的 document 嘗試加 1。SPA 導航、換單字、答題、React 重繪、StrictMode 不增加。主頁顯示成功寫入後回傳的網站累計，並非不重複人數。

後端是單一 Worker 與 SQLite-backed Durable Object，只保存數字 `total`，固定物件 `site-total`。空 `POST /pageviews` 且 Origin 為 `https://chiehco.github.io` 才加數；錯誤來源、路徑、query、method、body、preflight 不加數，沒有 reset 或管理端點。Durable Object storage input gates 保護讀取／加 1／寫回，成功持久寫入才回傳。

前端 `main.tsx` 不 await 計數，每個 document 共用一個 Promise。只在 production build、正式網站 origin 與 `/vocab-app/` 或 `/vocab-app/index.html` 執行；本機、QA、private 與其他站點停用。端點限 HTTPS `*.workers.dev/pageviews`，不得含帳密、port、query 或 hash。

只發一次空 POST，`credentials: omit`、no-referrer、3 秒逾時。HTTP、離線、阻擋、格式、逾時失敗均安靜忽略，不重試、不補數，不影響學習、不顯示假的 0。主頁只顯示該次回應快照。

不傳送或保存頁面 hash、單字、答案、進度、姓名、email、裝置／訪客 ID、本機資料庫。Worker observability 關閉，無 console 或事件表。Cloudflare 仍會接觸 IP、Origin、瀏覽器網路標頭與連線時間等資料，不能宣稱供應商看不到連線資料。

免費方案支援 SQLite DO，有帳戶共用配額；故障或超額可漏計，不影響學習。公開端點可能被非瀏覽器偽造 Origin 灌數，維持簡單瀏覽計數範圍。

## 部署與驗收

使用者批准最小範圍 OAuth 與後端部署後，先核對帳戶及同名服務。官方 API 回覆 Worker 不存在（10007），再以 SQLite migration 建立服務。初次版本 `e74cfbd5-3b82-4b69-ab30-b758f9203dd0`，相同程式重新部署後為目前版本，累計延續。沒有改 DNS、付費方案、擴 OAuth、接 GitHub App 或建立 API token。詳見 [後端 README](../services/pageviews-cloudflare/README.md)。

- 本機後端 20 個測試通過：workerd／SQLite 100 次並發恰為 1–100，dispose／重啟同一儲存後為 101，儲存故障回傳 503。
- 雲端 POST 1 → GET／preflight／無效請求 → POST 2；8 次並發得到 3–10；重新部署後得到 11。CORS、無快取、拒絕來源與持久保存通過。
- 前端測試覆蓋每 document 一次、重新整理、SPA、StrictMode、離線／阻擋／逾時／不重試。最新 main 整合後完整測試與建置結果見本次交付紀錄。
- CI 已加入後端隔離測試，前端既有發布門檻維持。

官方依據：[並發計數器](https://developers.cloudflare.com/durable-objects/examples/build-a-counter/)、[免費方案](https://developers.cloudflare.com/durable-objects/platform/pricing/)、[SQLite migration](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/)。