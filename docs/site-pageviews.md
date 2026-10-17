# 網站累計瀏覽次數（本機準備，尚未啟用）

## 定義與目前狀態

- 每次開啟或重新整理正式網站的一份 document，嘗試加 1。直接進入任何 `#/...` 頁面也算。
- SPA 切頁、切換單字、答題、React 重繪／StrictMode 重掛不增加。瀏覽器上一頁還原同一份 document 不增加。
- 顯示「網站累計瀏覽次數」，不是不重複訪客數；同一人重新整理會再算。
- 從服務正式啟用日開始累計，無法補出過去歷史。初始值為 0，第一個成功請求回傳 1；不匯入估算值。
- 2026-10-17 檢查最新 `origin/main` `d3f4192`：GitHub Pages + React/Vite PWA，只有同站教材及圖片下載，IndexedDB 保存本機學習資料。追蹤程式、套件、工作流程及設定中未見可重用的共用後端或計數服務。
- 獨立分支 `feat/site-pageviews-20261017`；沒有混入待發布的 42 單元候選或 PR35，沒有合併、推送或部署。

## 最小依賴與建議

需要 **一個 HTTPS 寫入端點 + 一個持久化、可原子加 1 的全站整數**。GitHub Pages 本身只提供靜態託管，瀏覽器本機儲存無法共用總數。

具體建議供選擇：由專案擁有者持有的 **Cloudflare Worker + 一個 SQLite-backed Durable Object**。所有請求固定送到同一個物件，只保存一個 `total`，依 Durable Objects 儲存序列化保證讀取／加 1／保存不會因並發遺失。無需另建訪客表、事件表、登入、前端金鑰或分析 SDK。這只是建議，尚未選定、註冊、建立或連線。

官方依據：[GitHub Pages 靜態託管](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[Cloudflare 計數器範例與並發儲存保證](https://developers.cloudflare.com/durable-objects/examples/build-a-counter/)。方案與費用需在啟用前核對當時帳戶方案／配額，這份本機修改沒有增加 npm 依賴。

## 真正需要使用者處理的設定（核准後才做）

1. 選定計數服務，並批准下述網路資料範圍；目前無需提供任何憑證。
2. 若採 Cloudflare：由擁有者提供可使用 Workers／Durable Objects 的帳戶與部署授權；設定一個 Worker、一個固定 Durable Object binding/migration；服務端只保留總數，不開啟應用請求記錄或自行記錄 IP／UA。不將管理憑證放入前端或 repository variable。
3. 服務應符合下述介面並以隔離測試計數器驗收，然後提供正式 HTTPS 端點。
4. 設定 GitHub repository 的 **Actions variable `PAGEVIEW_ENDPOINT`** 為該端點（公開網址，非 secret）。工作流程會在 build 注入 `VITE_PAGEVIEW_ENDPOINT`；未設定時完全關閉。另行批准合併與部署後才上線。

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
