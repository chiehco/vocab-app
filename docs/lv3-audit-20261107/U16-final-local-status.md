# U16 本機檢查與續接紀錄

## 結論

本機內容接入、瀏覽器 AFTER 與現成建置驗證已完成；**完整 TypeScript 測試仍有 10 個原 5000ms 逾時，因此整體技術關卡未通過**。未發布正式站，未在使用者實體手機驗收。

原產品基底：6556342cdbc3d9e10c2b4df86845a285b8c82d08。

## 本機成果

- 文字：454 欄、191 列，依獨立來源與完整 expected documents 接入；原歷史交易保留。
- 圖片：32 張，31 張補圖、1 張修圖，指定例句對應，不擴稱其他例句已補。
- AFTER：192 教材卡、95 一般卡、322 分頁的結構化來源核對及指定像素審閱完成。
- 響應式：101 路徑、259 畫面、538 垂直捲動檢查；29 語素列在 390／1280 兩寬共 58 次水平檢查。
- 32 新圖的精確下載雜湊、實際重開、離線重新載入完成。
- 正常更新與實際重開各自保留全部 14 個進度表；整輪瀏覽前後 13 表完全相同，settings 僅 learning:last-location 正常更新。9 內容表與 local/sessionStorage 保持一致。

AFTER 封存檔：output/playwright/lv3-u16-after-candidate-v1/after-verification-seal-v1.json，SHA256 8fcc1c10a3afde36a2a7bfb1aafe70052f36c9e4e392a7ae3b1e56fcb7b14e28。19 份引用證據已獨立核對。

## 技術結果，原失敗不覆寫

- execution-v1：原 20 個失敗保留。
- execution-v2：239 完整 TS 檔；5633 項＝5619 通過、10 逾時失敗、4 原有跳過。新增 17 項全部通過，未移除任何原測試，也未放寬逾時或 skip。
- Python：16 模組、2957 項明確沿用原成功證據，不是重跑；25 份證據與原資料保護已核。
- typecheck、18 個變更檔 lint、build 通過。不是宣稱全庫 lint 通過。
- 原 verify-build 因一個已修測試檔仍被舊 overlay 雜湊綁定而失敗，原證據保留。
- v7 僅修正該測試檔契約，其他 40 個 overlay 項目不變；verify-only 對現成 v2 建置 exit 0，六份完整來源、11 份公開資料副本、完整編譯教材及 32 圖通過。沒有重跑測試或建置，**不能用 v7 消除 10 個逾時失敗**。
- 最後 5154 個輸入 pin 逐檔一致。v1/v2 建置各 2467 檔，路徑、實際 SHA256 與大小完全相同；AFTER 驗證的 v1 建置與 v7 驗證的 v2 建置內容相同。

v7 獨立結果：output/lv3-audit-20261107/u16-independent-guards/verify-build-execution-v7-independent-acceptance-v1.json，SHA256 231fb662213012db1a8ed94ce588551ffdf559ecfd9044c1dd14766697200af6。

## 此輪測試／helper 五檔變更

- src/db/unitAudit.testSupport.test.ts
- src/features/direct/lv3Audit.testSupport.ts
- src/features/direct/lv3Unit11Text.test.ts
- src/features/direct/lv3Unit910Text.test.ts
- src/features/vocabulary/lv3U16ExampleImages.test.tsx

修正包含 caption escape、完整歷史 checkpoint 與 clone 前嚴格比較、私有自有陣列減少重複 clone、單次操作內 checkpoint 重用及不可變性反例。不能把 helper 改善描述成產品字卡內容新增修改。

## 尚未完成及保留事項

- 34 一般卡仍無主圖／有來源缺口；61 張現有實圖通過本次畫面檢查。
- 134 教材卡例句待核；G034、G042 兩項文法占位保留。
- gap NX131fe950 的 six-year gap between buildings 與母表原文一致，但建造年代語境未確認。保留原句與既有狀態，稽核紀錄仍待確認，不改成物理距離。
- gangster 相關詞顯示字面 *n.* 格式問題已記錄。
- youngster 用法、championship 補錦標賽、significant 補顯著的及 interrupt 詞性／定義補件均為 U17 候選，尚未套用；不改寫 U16 原 454 欄歷史。elderly 不修改，significant 的有效的保留待逐義查證。

## 續接

下一張：**LI-LV3U17-V001 knit，教材 p175**，尚未正式處理。U17 準備包位於 output/lv3-audit-20261107/u17-preparation-v2/README.md；另見 carry-forward-checklist.json 及 interrupt 專屬補件。

先保存本機 checkpoint 與上述未通過的技術關卡，再按父任務決定接續。U17 開始正式交易前須重新擷取目前來源與完整 before rows、獨立審核提案及建立新的 expected documents；不得以舊準備包 hash 代替新基底驗證。沒有發布或實機驗收承諾。
