# 小鎮今日學習主流程

本次範圍依使用者 2026-10-12 的裁示：小鎮主入口沿用一般學新、複習排程及當日額度；完成一般學習的實際紀錄也能呈現房屋。單字補練為次要入口。初次交付只在本機實作、測試及提交，後續發布依使用者的明確授權處理。

## 入口與排程

- LV1 Unit 1、LV4 Unit 17 的主按鈕進入本小鎮詞域的今日學習。與一般等級範圍複習共用 `buildStudyQueue`，沿用 `dailyNewWordCap - checkIns.newWordsCount`、全部到期／待回想字卡及同日回顧優先規則。沒有新增每輪固定題數，也沒有更改 S+A 的每日計畫。
- 詞域按教材官方 wordId 映射；LV1 的 woman 即使字庫列為 LV2，仍屬於 Unit 1。LV1 有 38 詞，LV4 可映射 43 詞。
- LV4 的 reluctance、frustrated、frustrating 沒有官方映射，明示暫不排入日課，保留原有 Direct 單字補練。沒有猜測 ID 或新增字庫資料。
- 沒有可排的題目時，顯示今天安排已完成；不將單字補練偽裝成主要日課。單字補練仍保留 LV4 Direct、LV1 Quiz 的不同路由與證據。

## 保存、返回與續輪

- 新增 `/town/:level/:unit/study?session=…`。每輪的詞域快照、題序、選項、選擇、揭答及實際 reviewLog ID 存在既有 settings 表；不增加資料表、改主鍵或升級 DB。
- 選擇／揭答尚未保存時可返回，不產生房屋。保存成功後留在本題結果，提供「回小鎮看小屋」及手動下一張。返回網址帶教材 item ID 定位對應房屋。
- 一般 flashcard、known、same-day-recap 的既有保存方法及 SRS 政策照常使用。日課收據與字卡、歷史、打卡在同一交易保存；失敗全部回滾。重按、重開、Back 或兩個並行保存不會再記同一題或重排 SRS。
- 下一張只在真實保存紀錄存在時前進，重按不跳過下一題。既有進度備份保留 settings 與原 reviewLog ID，恢復後能續輪而不重交。
- 保存前再次檢查全域新字額度。其他入口已耗盡額度或跨日時，明示尚未保存／原紀錄保留，提供依目前額度重新安排；原快照不會冒充完成的答案。

## 房屋證據

房屋為唯讀投影，不偽造 reviewLogs 或 directAttempts。LV4 保留原 Direct 首答、提示與查閱證據，另讀取實際 flashcard／known／same-day-recap 記錄。LV1 保留原四種 Quiz 記錄，並納入上述一般學習記錄。相同歷史 ID 去重，一個教材單字只呈現一棟房屋。

一般評分／已會標記不冒充無提示首答正確；畫面分別標示「完成一般學習／複習」「已會標記」或「還需要複習」。原 Direct 作答也不被轉換成一般 SRS 卡片。

## 分支界線

初次交付基於 PR31 的 `eccb167b68bf0cee2e6f3de438c5d16cd995b6d6`，其 main 基底為 `8eb8088428510fccce4d4decc20a5c753221195e`。本分支保留 PR31 修正；發布順序先處理 PR31，再對齊 PR32 的 main 基底。

獎勵舊版提交 `ee460061d291394e7de84580868e45e8fb4c6c2b` 不在本分支。新版「辨義 30 秒 10 詞 +30；填空 3 分鐘 15 詞 +60」的未完成修改保存於 stash `4cccabec32ce8b136347b8eafc001dcaae19d246`，並有外部備份 patch；本次沒有將舊獎勵參數當成新版完成。

## 驗收

自動測試涵蓋動態額度、超過 20 詞的到期隊列、woman 跨字庫等級、43／3 映射、原補練路由、取消、錯答、連點、失敗回滾、重開、Back、備份恢復、known／recap 的原 SRS 政策，以及空隊列無主單題回退。

初次本機驗收的命令結果、Chromium 手機截圖與實測報告保存在相鄰 `town-daily-study-evidence` 資料夾。該次未驗實體手機、Safari／Firefox、生產更新與離線升級，沒有操作真實使用者瀏覽器進度。後續正式發布及驗收以固定總入口 `版本來源.json`、Actions 與 `town-reward-policy-evidence/production` 的紀錄為準。
