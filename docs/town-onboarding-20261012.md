# 字彙小鎮新手引導：本機驗收

2026-10-12。基準為實際核對並 fetch 的遠端 main `d94fe6bc227a03d8f261d805554bfc1742c007b4`；完成驗收後再次 ls-remote，main 仍為同一提交。App package 版本保持 `0.0.0`。

隔離分支：`fix/town-onboarding-20261012`。
隔離工作樹：`C:/Users/USER/Documents/Codex/2026-10-12/task/vocab-town-onboarding`。

最初範圍為使用者已批准的三項操作流程修正，只本機實作、測試與提交，初版為 `bd1560bc3650e3323cccad85da556009702a4a56`。後續使用者授權此專案推送，本輪按授權準備本任務的獨立分支與 draft PR，仍不合併或部署。未帶入 U9–U10 的 `94afb6f`、未重試其被拒推送。既有工作樹與使用者修改保留。

已讀固定總入口、來源工作區 AGENTS.md、協作規則、決策簿、城鎮試玩紀錄與共用 CLAUDE.md 的必讀資料。程式 checkout 內無 AGENTS.md 或 .agents/skills；文件工作區 .agents 為空。瀏覽器驗收使用 playwright 技能。

## 實際行為

- 零屋時顯示「答一題，蓋第一間小屋」，明說答案保存後該字落成，答錯也算，只讀卡／發音不算。
- 主入口直接開第一個未練字；地塊細節可練選取的字，已有房子則可重練。直接入口每次一字一題，原課本整單元練習範圍保留。
- 答案保存成功後，顯示「回小鎮看小屋」。返回網址帶穩定的教材項目／圖卡 ID，選取並捲到該地塊。返回只做導覽，不提交答案、不前進題序。
- 未作答可取消返回，不顯示落成訊息。進入與提交按鈕的既有／新增鎖避免連點重複動作；保存失敗保留題目並顯示錯誤。

## 兩條紀錄路徑保留

LV4 Unit 17 沿用 `directSessions/directAttempts`。基本四選一與輪換情境題先轉回 canonical 題號，再按原 `learningItemId` 定位。取消的一字練習可重開原 session；作答後回小鎮，再繼續時仍是原 session、選項、提示與 index。

LV1 Unit 1 沿用既有 WordList + Quiz，預設看英文選中文。小屋仍只由 `quiz-w2m/quiz-m2w/quiz-image/fill-blank` 的 reviewLogs 派生。既有課本 Unit 1 清單也取得返回入口。這一輪的題目、題序、選項、分數、session ID 及已答狀態放在瀏覽器導覽狀態，讓同分頁返回與重新整理能續答。

未修改 `townModel.ts`、`lv1TownModel.ts`、`direct/store.ts`、DB schema、資料表、進度記錄格式或 SRS 演算法。沒有新增分數、貨幣、連勝或成長門檻。小屋表示已練過，不表示已熟練；原有正誤與提示紀錄仍保留。

## 驗證

- `npm run typecheck`：通過。
- `npm run lint`：通過。
- `npm run build`：通過，含 PWA 產物。保留原有大型 bundle 警告。
- `git diff --check`：通過。
- `npm test -- --maxWorkers=2 --testTimeout=30000`：初版 74 檔、385 項全部通過。舊快照修正後全量 74 檔、387 項通過；最後補強錯題清單後，10 項相關流程回歸、typecheck、lint、build 再次通過。

全量首跑 384/385 通過，唯一失敗為既有 `lv1ReviewedImages.test.ts` 的 726 張圖片雜湊讀檔超過預設 5 秒；未修改該測試或素材，以 30 秒上限重跑全部通過。Sandbox 初次 npm 安裝、Vitest 暫存檔 rename 與 localhost 連線有環境限制，改由已批准的主機端執行後完成；沒有自動審查拒絕或未完成的驗證。

獨立 Chromium 瀏覽器（未使用使用者真實學習資料）驗收：

- LV1 零屋 → 直接答題 → 故意答錯 → 返回一棟並定位；取消不蓋屋；連點只記一筆；答題前後重整及小鎮重開保留；同輪續答不重記。
- LV4 零屋 → 查字提示 → 取消仍零屋 → 回原 session → 故意答錯 → 返回一棟並定位；重整不重記；完成後明確重練換題，仍一棟。
- LV4 原課本 46 題 session 返回前後完整一致。LV1 原課本十題輪次在第二題返回／重整，題目、隨機選項、index=1、score=1 與 session ID 完整一致，接續只新增下一筆答案。
- 320／390／736px 小鎮、Quiz 及 Direct 回答頁均無水平溢出；新增主要按鈕與返回連結高度 48px 以上。返回的選取地塊在地圖可見範圍內。
- 各驗收頁瀏覽器 console 無錯誤或警告。

本機證據位於 `C:/Users/USER/Documents/Codex/2026-10-12/task/town-onboarding-evidence/`：完整測試輸出、瀏覽器腳本／結果、`playwright/verification-summary.json` 及六張手機截圖。這些測試產物不進程式提交。

## 邊界與接續

未驗實體手機、學生實際反應、Firefox／Safari及正式站部署。LV1 的精確輪次續答依同分頁導覽歷史；全新分頁或電腦重啟後未還原該分頁歷史，不保證還原同一題序。學習紀錄與小屋仍存於既有 IndexedDB，LV4 session 也仍持久保存。

本任務不處理既有 Codex 訊息路徑錯誤，也未宣稱能修復它。程式、證據與本機提交可在重啟後從上述工作樹接續。

本機再啟動：在隔離工作樹執行 `npm run dev -- --host 127.0.0.1 --port 5188 --strictPort`，使用 `http://127.0.0.1:5188/#/town/LV1/1` 或 `#/town/LV4/17`。驗收用服務與獨立瀏覽器在交付前關閉。

## 後續正式建置離線驗收

依使用者的續答文案要求，LV1 小鎮與 Quiz 返回區加上「本輪續答請留在同一分頁」。未擴資料模型。這句文案後的 TypeScript、lint、8 項相關流程回歸與正式 build 再次通過。

以最終 `dist`、真實 service worker 及獨立 Chromium profile 驗收，先完成安裝快取，再將瀏覽器網路設為 offline：

- LV1 離線答題保存一筆 reviewLog，返回一棟、離線重整、接回同分頁原輪次；始終只有一筆，未重交答案。
- LV1 在全新分頁開啟同一 Quiz URL，另建未作答輪次，不假稱接回原 session、不新增答案；同分頁提示可見。
- LV4 離線答題保存一筆 directAttempt，返回一棟、離線重整與續答；session 和 attempt 完整不變。新分頁也可讀回原持久保存 session。
- 最終 JS 資產已進 service worker cache，頁面由正式 `sw.js` 控制；全程 pageErrors 為空。這是正式建置的本機離線驗收，並未部署正式站。

更新驗收時也確認新版備妥提示正常；相同 hash URL 的導覽不會重新載入程式，需要真正重新整理載入新建置。離線證據與三張截圖位於上述 evidence 的 `pwa/`，原線上流程證據保留。

## 瀏覽器上一頁的舊快照

返回流程檢查另重現：先從未答 Quiz 回小鎮、續答並保存，再按瀏覽器上一頁，小鎮歷史可能仍帶原本未答快照。現在恢復與提交前都優先核對同 session、題型、單字及該字在本輪的出現次序，已保存答案不再重交；分數與錯題清單從既有 reviewLogs 恢復。原紀錄不含錯誤選項時，明說先前答錯，不憑空猜當時選項。

新增答對／答錯兩項真實歷史返回回歸，確認 logs、quizStats、checkIns 不變，分數與結果頁錯題清單正確。最終正式 PWA 亦在全新 origin 離線重跑「上一頁 → 續答」，已保存題目保持停用、只有一筆 log，後續回鎮、重整與新分頁驗證全數通過，pageErrors 為空。未增加 DB 表、索引或紀錄欄位。
