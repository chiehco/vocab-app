# 網站累計瀏覽次數（本機準備，尚未啟用）

## 定義與目前狀態

- 每次開啟或重新整理正式網站的一份 document，嘗試加 1。直接進入任何 `#/...` 頁面也算。
- SPA 切頁、切換單字、答題、React 重繪／StrictMode 重掛不增加。瀏覽器上一頁還原同一份 document 不增加。
- 顯示「網站累計瀏覽次數」，不是不重複訪客數；同一人重新整理會再算。
- 從服務正式啟用日開始累計，無法補出過去歷史。初始值為 0，第一個成功請求回傳 1；不匯入估算值。
- 2026-10-17 檢查最新 `origin/main` `d3f4192`：GitHub Pages + React/Vite PWA，只有同站教材及圖片下載，IndexedDB 保存本機學習資料。追蹤程式、套件、工作流程及設定中未見可重用的共用後端或計數服務。
- 獨立分支 `feat/site-pageviews-20261017`；沒有混入待發布的 42 單元候選或 PR35，沒有合併、推送或部署。

**目前只完成前端、mock 測試及這份服務規格。尚未寫後端 Worker／Durable Object 程式，尚未實作或驗證服務端的原子遞增、持久化、CORS。** 不應把「前端準備完成」描述成已可使用的全站計數功能。

## 最小依賴與建議

需要 **一個 HTTPS 寫入端點 + 一個持久化、可原子加 1 的全站整數**。GitHub Pages 本身只提供靜態託管，瀏覽器本機儲存無法共用總數。

具體建議供選擇：由專案擁有者持有的 **Cloudflare Worker + 一個 SQLite-backed Durable Object**。所有請求固定送到同一個物件，只保存一個 `total`，依 Durable Objects 儲存序列化保證讀取／加 1／保存不會因並發遺失。無需另建訪客表、事件表、登入、前端金鑰或分析 SDK。這只是建議，尚未選定、註冊、建立或連線。

官方依據：[GitHub Pages 靜態託管](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[Cloudflare 計數器範例與並發儲存保證](https://developers.cloudflare.com/durable-objects/examples/build-a-counter/)。這份本機修改沒有增加 npm 依賴；後續可用單一 JavaScript Worker 檔案，不需要後端框架或分析 SDK。

## 免費方案核對（2026-10-17）

**支援。** Cloudflare 官方價目明確列出 Workers Free 可使用 **SQLite-backed Durable Objects**；不能選舊的 key-value 儲存後端。SQLite 物件也可直接用其 `storage.get/put` API 保存單一總數，不需要另建資料服務。

官方免費配額包含：Durable Object 請求 100,000／日、執行時間 13,000 GB-s／日、讀取 500 萬列／日、寫入 100,000 列／日、總儲存 5 GB；入口 Worker 另有 100,000 請求／日及每次 10 ms CPU 限制。這些是帳戶／方案配額，不是對本站保證的可用瀏覽量；使用量還會與其他用途共用。免費配額超過時相應操作會失敗，前端隱藏數字且不重試，不需要為此增加分析或排隊系統。

來源：[Durable Objects 官方價格／免費方案條件](https://developers.cloudflare.com/durable-objects/platform/pricing/)、[Workers 官方價格](https://developers.cloudflare.com/workers/platform/pricing/)、[SQLite 物件可用 get/put 與持久化說明](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/)。啟用當日仍需核對帳戶狀態與當時配額；這次沒有登入、註冊或啟用服務。

## 真正需要使用者處理的設定（核准後才做）

1. 擁有者選定 Cloudflare、批准下述網路資料範圍，並持有可用的 Workers Free 帳戶。現在不需要把憑證貼到對話。
2. 獲准後由開發工作補上單一 Worker 檔案與 Wrangler 設定：一個固定名稱的 SQLite Durable Object、一個 binding；新專案依官方教學以 `exports.<ClassName>` 宣告 `type: durable-object`、`storage: sqlite`。只保留總數，不啟用應用請求記錄或自行記錄 IP／UA。先做隔離的原子遞增／持久化／CORS 測試，再在獲得外部部署批准後發佈一次，取得 `workers.dev` HTTPS 網址；不需要自訂網域、D1、Workers KV、額外後端框架或前端金鑰。
3. 設定 GitHub repository 的 **Actions variable `PAGEVIEW_ENDPOINT`** 為固定 POST 端點（公開網址，非 secret）。工作流程會在 build 注入 `VITE_PAGEVIEW_ENDPOINT`；未設定時完全關閉。管理憑證只留在服務管理環境。
4. 另行批准合併與網站部署後才上線。這些設定都尚未執行；服務程式尚待實作，不能只填入任意 URL 就視為完成。

設定依據：[官方入門：binding、SQLite exports 與部署](https://developers.cloudflare.com/durable-objects/get-started/)。

不需要使用者設定 Google Analytics、不需要訪客 ID、登入、答題資料庫或更改教材。

## 資料範圍（啟用前須批准）

- 應用只發送 **空白 POST** 到固定端點：無 body、無 query、無自訂識別 header。
- `credentials: omit`，不傳 cookie／認證資訊；`referrerPolicy: no-referrer`，不傳網頁 URL、hash 或單字路徑。
- 不在應用 payload 放入單字、答案、學習進度、姓名／email、localStorage／IndexedDB 內容、裝置／訪客 ID；不建立任何識別碼。連線層資料範圍另見下一項。
- **服務供應商仍會因 HTTPS 連線接觸來源 IP、瀏覽器網路標頭（例如 User-Agent）、Origin 及請求時間**。Origin 是 `https://chiehco.github.io`。應用不保存這些資料；供應商平台的安全處理／記錄保留政策須在選定時確認，不能宣稱第三方完全看不到網路資料。
- 應用持久化資料僅一個全站 `total`。不保留逐次事件、日期報表或訪客紀錄。

## 服務介面與驗收條件

- 單一固定路徑：`POST` 空 body → 原子持久化 `total + 1` 後，回傳 `200 application/json`、`{ "total": <正安全整數> }`。
- 所有使用者使用相同的計數物件，不以 URL、Origin、IP 或訪客資料建立不同物件。不得採用最終一致的 KV 讀改寫作為並發計數器。
- 回應 `Cache-Control: no-store`、`Access-Control-Allow-Origin: https://chiehco.github.io`、`Vary: Origin`；不設 cookie，不允許 credentials。只接受正式 Origin 的 POST；其他 method／path／Origin 拒絕且不加數。若處理 OPTIONS 預檢，只回應 CORS，不能加數。
- 伺服器加數失敗應回錯誤，不以舊值或假值作成功回應。永久保存總數，不因 Worker 重新啟動／休眠／部署歸零。
- 不做客戶端或服務端應用層自動重送，不使用 PWA background sync、離線佇列、定時器補數。超時時可能已在服務端加數，前端不再次嘗試。
- 正式啟用前，用隔離服務測試：並發 N 次得到恰好 N 個增量；重啟後持續累計；錯誤 method／Origin 不增加；確認沒有請求／個人資料寫入紀錄。這次只有 mocked fetch 的本機測試，尚未測到真正的後端持久化與 CORS。
- 公開計數端點不能依靠 CORS 防止非瀏覽器偽造；本功能是基本瀏覽次數，不提供防刷、不重複人數或精準訪客分析。也不引入指紋或登入解決它。

## 前端保護與顯示

- 只在 `PROD` 且 mode 為 `production`，origin 為正式網站且 pathname 是 `/vocab-app/` 或 `/vocab-app/index.html` 時啟用。dev／QA／private、預覽及其他專案頁不發送。
- `main.tsx` 啟動一次，且不 await；首頁元件共享同一份 Promise。成功時在首頁底部顯示總數，返回首頁不重新讀取或加數；數字為本次成功回應時的快照。
- 3 秒 timeout，離線／封鎖／HTTP 錯誤／格式錯誤靜默失敗，沒有重試按鈕、不擋教材載入或學習。服務未設定或不可用時隱藏數字，不顯示假的 0 或本機累計。
- 不把計數回應寫入 IndexedDB／localStorage／sessionStorage，也不讓 Service Worker cache 或背景重送 POST。
- 離線／阻擋／失敗的開啟可能漏計，恢復連線也不補數；這是保持學習不中斷且避免超時重送重複加數的明確限制。

本機開發不能用正式計數器試打。本機測試使用 `counter.example.test` 並完全 mock fetch，沒有向該網址或任何計數服務發出請求。

## 本機驗證結果（2026-10-17）

- `npm test -- --maxWorkers=1 --testTimeout=15000`：**106 個測試檔、667 個測試全數通過**，exit code 0，358.62 秒；session 69436 已完成。
- 新增的計數模組及 StrictMode／SPA 元件測試：2 檔、31 個測試通過，已包含在上述 667 個測試中。
- `npm run lint`、`git diff --check` 通過。
- `npm run build` 通過，包含 TypeScript 編譯、Vite 正式建置與 PWA service worker 產出；既有大 bundle 警告仍存在。
- 服務端尚未實作，因此這些結果不包含真正後端的並發原子遞增、重啟持久化或 CORS 驗證。
