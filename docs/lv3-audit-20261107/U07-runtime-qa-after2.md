# LV3 U07 第二輪回開驗證

## 結果與界線

固定修正提交 `67c6cd5358795c801b8d3b0c27f054d81e136930` 的指定文字、顯示與保留驗證通過。observe 中文用法缺失已由實際瀏覽器回開確認修復。這不是整個 LV3、完整測試套件、正式發布或實體手機驗收。

第一輪 `U07-runtime-qa.md` 的失敗與完整證據保留。本輪未改產品、171 欄內容、manifest、scope、chain 或 transaction。技術測試另列，瀏覽器通過不覆蓋技術失敗。

## 實際覆蓋

- 回開 57 個受影響路徑：23 教材項目、34 一般字卡，共 76 component views。
- 171 欄符合獨立預期。101 直接顯示欄均在 DOM 核對成功；20 個 verbForms 的原形、過去式及過去分詞可見部分另列。24 共享鏡像及 26 純 metadata 欄仍只作資料驗證。
- 八張已安裝內容表完整 sorted-row hashes、五張 HTTP 原始集合、完整 U07 教材模組及 starter pack 符合預期。starter SHA-256：`8da05cd9cbadc91fb188781b787acf52f7534cc3fb6b3e35e36200e2af786f72`。
- if、immediate、observe、option 與對照 mound，分別在桌面、390×844 及關閉重開後檢查，共 15 views。四筆中文完整出現一次，保留原英文項目，不臆測配對。mound 保持原對照 HTML。沒有橫向溢出或採樣文字遮擋。
- 107 張 PNG：76 欄位頁面、30 用法畫面、1 Back 畫面。目視 observe 桌面及五詞窄版畫面，與 DOM 檢查一致。窄版是桌面模擬，非實體手機。

## 返回、重開與資料保留

正常 Back 回到 observe 並重選搭配頁，文字相同。四份關閉前快照涵蓋 2026-11-08 00:12:01–00:14:07 UTC。完成關閉後操作中斷，尚未得到重開結果。02:16 UTC 確認原程序不在、QA session 未開、Git 與受保護來源未變後，才接續重開；未重跑或覆寫既存 captures。

同一既有隔離 profile 的重開快照在 02:16:45 UTC，最後在 02:16:56 UTC。六份快照的 ContentDB 與所有非 settings ProgressDB 完整序列化列均等於第一輪最終基準。settings 只有正常導覽書籤 learning:last-location 改變。兩個既有群組、兩筆 review、wallet 10、dailyNewWordCap 15 保留；localStorage 與 sessionStorage 保持空白。這不是實體 IndexedDB 檔案逐位元組比較。

只關閉本輪 lv3-u07-after2-audit session，其他 session 未動。兩份 console log 只有 React DevTools 資訊，沒有瀏覽器錯誤。

## 原版與圖片

結束重驗 144 pipeline inputs 的 raw／LF hash 及 byte count 無變更；原 before 804 份、第一輪 after 1,071 份及原索引／報告皆無變更。26 張 active 圖檔 hash 一致，沿用第一輪封存的 HTTP、解碼、DOM 圖句證據，不宣稱重新審看全數圖片。

## 保留未驗事項

- 第一輪被拒的永久 QA 群組操作未重試或繞過。attraction／observation 兩個目標圖片題與縮圖題面仍待驗。
- ReviewFlashcard 未作瀏覽器互動；既有 component tests 與 browser 分開。沒有新增答題、群組、獎勵或 SRS 活動。
- 原來源疑問與 execute 英文圖說缺漏等，依 U07-review.md 及第一輪報告保留。
- 完整專案測試、LV3 發布前整體驗收、正式部署版本、實體手機及離線矩陣不由本報告宣告通過。

## 本機證據

output/playwright/lv3-u07/after2/ 內保存 field／usage／progress verification、boundary end、image carryforward、visual review、六份 state、截圖、console logs 與獨立 seal index。本報告與原第一輪報告各自固定 hash。
