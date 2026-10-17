# 萬詞譜最小累計瀏覽計數器

只有 `worker.mjs` 的 Worker＋SQLite Durable Object，無執行期套件或框架，無訪客／學習資料表。Wrangler、Miniflare 都只是本機部署與測試工具。

## 目前已完成

- Worker 名稱固定 `vocab-pageviews`，路徑 `/pageviews`，正式網站 Origin `https://chiehco.github.io`。
- `wrangler.jsonc` 同時包含 `PAGEVIEWS → PageViewCounter` binding 與 `v1/new_sqlite_classes` migration。不要改成 `new_classes`，不要另加 `exports`；官方仍支援此 migration 流程，兩種 lifecycle 設定不能並用。
- `npm test`：20 個測試通過；真正本機 workerd／SQLite 100 次並發無遺失，重啟後持續累計。
- `npm run check`：Wrangler dry-run 通過。沒有登入或雲端部署。

## 下一個最小授權步驟（尚未執行）

已安裝 Wrangler 4.151.1，`whoami` 證實尚未登入。先請使用者批准下列範圍，再由電腦啟動 OAuth，使用者本人在瀏覽器確認：

| OAuth scope | 官方 CLI 說明的可存取範圍 |
| --- | --- |
| `account:read` | 帳戶資料、analytics 與 memberships 的讀取權限；本次只需辨識部署帳戶。 |
| `user:read` | 使用者名稱、email、帳戶 memberships 的讀取權限。 |
| `workers_scripts:write` | Workers scripts、Durable Objects、子網域、triggers、tail data 的讀寫權限。不是僅限單一 Worker 的細粒度權限。 |
| `offline_access` | Wrangler 自動附加，允許續期，會在這台電腦保存登入憑證；不是一次用完就失效的登入。 |

不請求 `workers:write`、Workers KV、routes、D1、Pages、R2、zone、郵件或 GitHub App 權限。上表來自此版本官方 `wrangler login --scopes-list`，自動 `offline_access` 已核對 CLI 的 OAuth URL 生成程式。真正授權畫面若出現額外範圍，先停止回報，不能自行允許。

批准後才可啟動的命令：

```powershell
npm exec -- wrangler login --browser=false --scopes account:read user:read workers_scripts:write
```

這個命令尚未執行，不需要使用者貼上密碼、token、API key 或驗證碼。成功後先用 `wrangler whoami` 確認帳戶，再另經批准部署。不要使用 temporary account，也不需要手動建立 API token。

## 部署（授權與部署批准後才做）

在本目錄執行 `npm ci`、`npm test`、`npm run check`，然後批准後才執行 `npm run deploy`。`wrangler deploy` 會一併上傳程式、套用 SQLite migration 與 binding，無需先在 Dashboard 部署 Hello World。

取得 `https://vocab-pageviews.<帳戶子網域>.workers.dev/pageviews` 後，由開發工作驗收。不要用正式計數器隨意試打來製造數字；測試寫入應使用隔離測試 Worker，或在正式網站獲批准接入時驗證真實頁面載入。

後續只將公開端點設定為 GitHub repository Actions variable `PAGEVIEW_ENDPOINT`，不把管理憑證放到前端。網站合併與發布仍待另行批准。

## Dashboard 路徑核實結果

- 官方首次 migration 流程要求 Wrangler 設定及 `wrangler deploy`；沒有核實只用 Hello World／Quick Edit 貼上程式就能完成新類別、SQLite namespace 與 binding 的流程。Dashboard 新增 binding 不等同建立新類別。
- 官方 Dashboard＋GitHub Workers Builds 可以代跑 Wrangler，但需要 GitHub 授權且預設產生部署 API token；目前不採用，未連 GitHub App 或建立憑證。
- 不要套用使用者尚未提供的畫面位置或猜測按鈕步驟。Dashboard 名稱若已填 `vocab-pageviews`，保持部署前暫停即可。

來源：[首次 migration](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/)、[Workers Builds 設定與 token](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)、[Workers Builds Git 授權](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)、[免費 SQLite DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)。
