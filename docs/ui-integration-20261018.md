# 手機 UI 與商店整合／獨立 QA 交接

分支：`integrate/mobile-ui-town-shop-20261018`。基底是重新核對的正式 main `76dda67f58660fe8f95aab372fec20ccb106274a`。本次只整合已要求的 UI 與商店，不建立 PR、不合併、不部署、不合 PR35。正式 111 單元、學習排程、答案判定、發幣規則與計數器原始碼均未修改。

## 取用來源與提交

| 整合提交 | 來源與範圍 |
| --- | --- |
| `ae33924` | 原 `c11582d807e4f7b76d1d29bc5eb98d72b09e93cf`：新版窄字卡兩檔，完整保留。 |
| `bd0815e` | 從 `bcd0f2f`／`30646e1` 選取複習答後收選項、固定已會／下一張、共用操作列、手勢安全測試，以及其他頁面的教材導覽；排除舊 ReviewedCardsScreen 改法。 |
| `a6b49d5` | 原 `f3ff4c0`：小鎮自適應全貌、縮放定位、房屋字卡對話框。 |
| `10e7f0b` | 從 `30646e1` 選取精簡獎勵區、同輪計時、下一題折疊與回頂端、小鎮答後固定操作。 |
| `3c928e9` | 原 `ac43d70`：五件裝飾、6×6 廣場、原子扣款／持有／位置、收納搬動、DB v5 與備份 v8。 |
| `589b155` | 原 `8d163f1`：教材刷新保留全部 14 張非空合成表，含購買後餘額與裝飾。 |

另有本交接文件及可重跑 QA 腳本的提交；最終精確 head 與 CI 結果以交付回報為準。

`ReviewedCardsScreen.tsx` 和 `reviewed-cards.css` 與 `c11582d` 完全相同，沒有在該頁加回舊 `StudyActions` 或 `useCardSwipe`。共用 `StudyActions`／手勢仍用於原已要求的複習和其他教材頁，不全域隱藏導航。窄字卡以 `:has(.reviewed-cards-page)` 作用於目前頁面；商店只在有效 decorate route 使用 immersive。

與商店 head `8d163f1` 核對時，功能差異只有上述新版字卡兩檔。舊 `docs/mobile-study-ui-20261018.md` 的同頁字卡說明已過時，未帶入；此文件為整合交接依據。商店個別功能紀錄另見 `town-decoration-shop-20261018.md`。

## 已完成的本地驗證

- 7 檔 50 項定向回歸通過：答後操作、精簡獎勵、小鎮進出／保存、裝飾交易、教材刷新、計數器顯示與字級規則。lint、TypeScript／正式 PWA build 通過。
- 375×812、底部安全區 34px：逐次等待實際張數更新，從第 1 張連切到第 11 張，每次 `scrollY=0`；按鈕底端 766px，在安全邊界 778px 內。該頁沒有舊操作列，離開後四項導航恢復。
- 窄字卡展開更多內容、複習答後長內容捲到頁尾，最後內容可在固定操作列上方讀取。複習答後四選項消失，已會必須明確按下才保存。
- 小鎮全貌 351×551，內容無捲動溢位；房屋對話框開關、商店未確認返回不扣款、購買後返回小鎮與開字卡正常。
- 小鎮原生分段滑動不提交，明確按保存只增加一筆與應得 +5；下一題不再保存／發幣，獎勵說明折回、同一 `startedAt` 保留。固定操作列下緣與導航上緣同為 713px，未重疊。
- 在全新私密 context 原生建立 Dexie v4（IndexedDB version 40）的非空合成進度與 300 金幣，升級 v5 後內容保留。v7 舊備份恢復 300／無裝飾；v8 新備份恢復 275／一件裝飾與全部學習資料。還原目標均先檢查全部進度表為空。
- 正式建置計數器驗證將全部網路攔截成本地 dist 與合成回應：第一個 document 顯示 4321；SPA、十次切卡、小鎮／商店往返均只有一個 POST；重載顯示 4322。失敗回應不重試、不顯示假 0，課本入口仍可用。正式端點寫入為零，4321／4322 不是線上真實累計。
- 整合後的正式 service worker：購買噴泉後斷網重載，五件商品 SVG、持有與 60 金幣保留；離線搬動、收回、再重載與重新放置成功，收入仍為合成 10 筆、學習紀錄 0。

瀏覽器驗收只用全新非持久 contexts 與空 `storageState`；沒有操作使用者手機、既有個人瀏覽器資料或正式學習資料。測試程式沒有直接 clear/delete 進度；備份匯入只在另外新建且檢查為空的合成目標執行。

## 獨立 QA：clone、啟動與重跑

需 Node 22、npm，以及可啟動 Chromium 的 Playwright CLI。先在新目錄取得分支，核對 `git rev-parse HEAD` 與交付回報的精確 head 一致：

```powershell
git clone --depth 1 --branch integrate/mobile-ui-town-shop-20261018 https://github.com/chiehco/vocab-app.git vocab-ui-qa
cd vocab-ui-qa
git rev-parse HEAD
npm ci
npm run lint
npm run typecheck
npm run test -- --maxWorkers=1 --testTimeout=15000
npm run build
node -e "require('node:fs').mkdirSync('output/playwright',{recursive:true})"
npm run dev -- --host 127.0.0.1 --port 4185 --strictPort
```

另開終端、仍在 clone 目錄執行。腳本自行建立新的非持久 context，不使用 CLI 目前頁面的進度，也不能移除空資料檢查：

```powershell
npx --yes --package @playwright/cli playwright-cli --session vocab-ui-qa open http://127.0.0.1:4185
npx --yes --package @playwright/cli playwright-cli --session vocab-ui-qa run-code --filename=scripts/qa/mobile-ui-integration.playwright.txt
npx --yes --package @playwright/cli playwright-cli --session vocab-ui-qa run-code --filename=scripts/qa/production-counter-integration.playwright.txt
```

第一支涵蓋舊非空 DB 升級、連續切卡、導航恢復、長內容、複習／小鎮明確保存、商店返回與兩種備份恢復。第二支使用本地 `dist` 攔截正式網址及計數器，禁止真實計數寫入。這不是部署，也不需登入正式站。

離線重載另開終端啟動正式 preview，再執行第三支：

```powershell
npm run preview -- --host 127.0.0.1 --port 4186 --strictPort
```

```powershell
npx --yes --package @playwright/cli playwright-cli --session vocab-ui-qa run-code --filename=scripts/qa/offline-shop-integration.playwright.txt
```

三支腳本的圖片均輸出 `output/playwright/`。本機輸出不進 Git，依既定指示不傳 Library。若 4185／4186 被占用，可在新 clone 的 QA 腳本修改對應 base URL 並使用相同新埠，不需改產品程式。

## 人工跨頁加驗與交接門檻

1. 375×812 的 `#/textbook/LV1/1/cards` 應只有貼底換卡列，首頁／課本單元返回後導航恢復；上一張首張禁用，最後一張為本單元看完。不可要求或加入該新版沒有的左右滑手勢。
2. 複習答前選項、答後完整內容、已會與下一張，在 320×568、375×812、390×844 及安全區下可操作；長內容可自然上下捲，音訊／選字不提交。
3. LV1/1、LV4/17 小鎮保留全貌、縮放、拖曳、房屋對話框；布置店與小鎮／課本往返沒有殘留遮罩或錯誤導航狀態。
4. 商店不足額、重疊、越界不能買；取消／返回不扣；快速連按只扣一次；搬動／收回／重放免費。新舊備份與教材刷新後持有、花費及學習進度一致。
5. 計數器在 localhost 開發模式本來就停用；正式模式驗證必須用攔截腳本，不能為測試新增真實瀏覽數。服務不可用時仍能學習。

整合分支完整 CI 必須到終態；本次僅交付供獨立 QA 與後續審閱，正式發布仍待本次明確批准。

## UI-QA-01：320×568 長選項遮擋修復

獨立 QA 在 `7b4973e`、標準字級、底部安全區 34px、合成到期 `boy`、隨機種子 4 發現 C／D 最末行被導航擋住。本次先唯讀取用其報告及腳本，在自己的 4187 埠與全新私密 context 重現相同位置，沒有修改獨立 QA 工作區。

產品改動只在 `src/features/review/review.css` 增加兩條規則：寬度不超過 600px、高度不超過 650px 且尚未揭答時，將重複的「已完成複習」摘要收成細進度線。摘要仍可由輔助科技讀取；選項字級、行距、按鈕尺寸、保存與發幣邏輯都不變。揭答後恢復原摘要，375×812 不套用緊縮。新版字卡兩檔仍與 `c11582d` 完全一致。

| 種子 4、320×568 | 修正前 | 修正後 |
| --- | --- | --- |
| 導航上緣 | 469px | 469px |
| 選項整體底端 | 505.72px | 463.92px |
| C／D 文字底端 | 492.53px | 450.73px |
| 選項字級 | 16px | 16px |
| 單一選項高度 | 99.56px | 99.56px |

新增實際瀏覽器回歸 `scripts/qa/review-small-screen.playwright.txt`：以文字 Range 逐行檢查導航遮擋、整個選項邊界、真實點擊命中、字級與目標尺寸，涵蓋 320×568、375×812、390×844，並檢查可及性摘要、答對／答錯明確保存及 130% 字級自然捲讀。375×812 選項底端仍是 612.34px，與修正前一致。

本地 2 檔 4 項複習／字級測試、lint、TypeScript 與正式 build 通過；既有 375×812 完整整合腳本已在修復版重跑通過，包含連續第 1→11 張、導航恢復、小鎮、商店及舊合成進度與 v7／v8 備份。所有外部請求皆阻擋，沒有碰真實進度或寫正式計數器。完整 CI 與新 head 另由交付回報提供。

複驗時，在已安裝依賴的新 clone 啟動 4187，再另開同目錄終端執行：

```powershell
npm run dev -- --host 127.0.0.1 --port 4187 --strictPort
```

```powershell
node -e "require('node:fs').mkdirSync('output/playwright/review-p2',{recursive:true})"
npx --yes --package @playwright/cli playwright-cli --session review-p2 open http://127.0.0.1:4187
npx --yes --package @playwright/cli playwright-cli --session review-p2 run-code --filename=scripts/qa/review-small-screen.playwright.txt
```

修正前後截圖及日誌在本機 `output/playwright/review-p2/`，不進 Git、不傳 Library。此修復仍未建立 PR、合入 main 或部署。

## UI-QA-01-R1：缺圖佔位與超長選項的捲讀

已實際查看獨立 QA 的 `long-parents-320.png`，並在本分支原 head `0dc80ee`、自己的 4187 埠重現：合成到期 `parent(s)`、種子 4、320×568、安全區 34px，缺圖佔位保留 100px，選項底端 618.30px，導航上緣 469px。獨立 QA 工作區僅讀取，未修改。

這次產品改動仍只有 `review.css`，只套用寬 ≤600px、高 ≤650px 的答前狀態：

- 缺圖佔位和正式插圖一樣收起；揭答後恢復圖片／佔位及完整意思。
- 每日複習的答前區域使用原生垂直捲動，高度止於 65px 導航加底部安全區的上緣。長內容末端留 16px，鍵盤聚焦末項也會捲到可操作的位置；離開或揭答恢復原頁面佈局。明確排除共用 `seal-review` 類別的小鎮學習頁，不改其捲動方式。
- 不縮字、不截詞義、不改按鈕高度或答題／保存規則；375×812、390×844 不套用本次新增規則。新版課本字卡兩檔繼續與 `c11582d` 完全一致。

| 內容與尺寸 | 首屏選項底端 | 導航上緣 | 閱讀方式 |
| --- | --- | --- | --- |
| boy、320×568、16px | 463.92px | 469px | 四個選項首屏可見、可點；不需捲動作答 |
| team、320×568、16px | 463.92px | 469px | 四個選項首屏可見、可點 |
| parent(s)、320×568、16px | 518.30px | 469px | 完整長詞義需上下捲動；區域最大捲 65px 後底端 453.30px，末項在導航上方 |
| parent(s)、375×812、16px | 598.53px | 713px | 與修正前相同，首屏完整 |
| boy、375×812、16px | 612.34px | 713px | 與修正前相同，首屏完整 |

超出視窗的文字保留原生上下捲讀，不宣稱所有長文都能零捲動。130% 字級是 20.8px；隔離的極長詞義 fixture 有 98 行，逐行捲動檢查均可到達，末尾文字完整。原生垂直拖曳、答前橫滑與閱讀皆未提交答案或增加學習紀錄。

新增 `scripts/qa/review-scroll-fallback.playwright.txt`。沿用上方 4187 啟動方式，再執行：

```powershell
npx --yes --package @playwright/cli playwright-cli --session review-r1 open http://127.0.0.1:4187
npx --yes --package @playwright/cli playwright-cli --session review-r1 run-code --filename=scripts/qa/review-scroll-fallback.playwright.txt
```

腳本在全新且經空庫檢查的非持久瀏覽器 context 播種合成資料；阻擋所有外部請求及 Service Worker。涵蓋 boy／parent(s)／team 三尺寸、真實已載入插圖／缺圖佔位／故意載圖失敗、安全區 0／34px、130% 字級、極長詞義每行可達、鍵盤末項焦點、原生垂直手勢及答前橫滑不提交、parent(s) 揭答後明確保存一次與返回後版面恢復。既有 `review-small-screen` 的大字級捲到底檢查同步支援此原生捲讀區。

完整 UTF-8 幾何報告在 `output/playwright/review-r1/report.json`，修正前後手機截圖及檢視頁在同目錄。本地輸出不進 Git、不傳 Library；交付回報提供最終 head 及完整 CI 終態。本次仍未建立 PR、合入 main 或部署。
