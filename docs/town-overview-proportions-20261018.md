# 小鎮全景比例與手機操作驗收

基準為 main `11fb2e727870b1c03e8486e45dfc9044ba169df2`。此批只調整小鎮呈現、縮放與選屋操作，交付獨立分支供核對。

## 比例與顯字

- 房屋圖形由 `scale(.78)` 改為 `.55`，寬度約縮小 29.5%；每棟原有 104×104 邏輯範圍保留，彼此不重疊。
- 中央保留區由 2×2 改為置中的 3×3；廣場內側由 190×190 改為 300×300，邊長增加約 58%。商店仍使用原本 6×6 放置座標。
- 依可用寬高從 5、7、9…19 欄中選取能完整容納全鎮的比例；全景在地圖內水平與垂直置中。
- 全景隱藏字名。按「＋」直接進入可讀尺度，預設最低 `.8`；130% 字級為 `1`。字名螢幕字級分別為 12px／15.6px，最多兩行，可換行顯示長字。
- 全景每棟小於 44px 時，第一次點圖只會以點擊位置為中心放大，第二次點屋才開卡。放大後可保留原有原生觸控捲動與滑鼠拖曳；拖曳不開卡。鍵盤仍可逐棟選取。
- 「看全貌」重設縮放與位置；「回到這棟」放大並定位目前選取的房屋。

## 可重跑的驗收

使用隔離的新瀏覽器 context，空 cookies／storage、禁止 service worker；所有資料均為合成資料。計數器攔截或封鎖，不使用個人瀏覽器或真實進度。

```powershell
npm run dev:private -- --host 127.0.0.1 --port 4187 --strictPort
npx --yes --package @playwright/cli playwright-cli --session town-overview open about:blank
npx --yes --package @playwright/cli playwright-cli --session town-overview run-code --filename=scripts/qa/town-overview-proportions.playwright.txt
```

專用夾具 `scripts/qa/town-overview.fixture.html` 直接使用實際 TownView，只提供合成 props，練習 callbacks 為空操作；不寫入學習或商店資料。

11 組版面／互動案例涵蓋 375×812、320×568、130% 字級、812×375 橫向；38 棟全建成／僅建 3 棟、3 棟小鎮、96 棟壓力案例。檢查一屏全景、隱字／顯字、長字完整換行、互不重疊的點選範圍、首／中／末棟對應字卡、原生觸控拖動、返回選屋、重設全景、鍵盤開關卡及 34px 底部安全區。瀏覽前後 reviewLogs、cardStates、wallet、owned decorations 皆保持空白。

另以實際 LV1/1、LV4/17 路由完成 16 組完成／未完成狀態、兩種手機、130% 字級及橫向回歸，保留 PR39 完成訊息與計數器的空間分配；既有 `mobile-ui-integration` 流程涵蓋字卡、明確保存答案、小鎮／商店往返、6×6 格與備份。

本地驗證：town 7 檔共 97 項測試、lint、typecheck、production build。完整測試由分支 push 的 CI 執行；部署工作流只對 main push 觸發。

本機截圖與 JSON 報告位於 `output/town-proportion-20261018/`（未追蹤），基準截圖取自上述 main 的 UTF-8 原始碼快照。未建立 PR，未合併或部署；PR35 不在此批範圍。
