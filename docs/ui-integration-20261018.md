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
