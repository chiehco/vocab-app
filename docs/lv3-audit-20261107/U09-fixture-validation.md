# U09 本機套用與交易驗證

U09 已完成本機資料套用，技術回歸與瀏覽器 AFTER 仍待驗收，尚未發布。開始檢查點為 `258adf0977e1c9a7514a2a8308bd83300c28b02c`。

## 套用結果

- 394 個欄位、183 個完整列、4 個來源完整文件，與套用前獨立計算的 expected-after 完全一致。另直接重讀實際文件、列、欄位並計算 Node JSON.stringify SHA-256，全部吻合；沒有使用 compiler 或 actual-after 回填預期。
- 範圍為教材 274 欄／127 列、一般詞條 87 欄／34 列、例句 29 欄／18 列、筆記 4 欄／4 列。
- 單次交易實際寫入 words.json、examples.json、notes.json、curriculumLV3Unit9.json、meta.json、sa-pack.json，共 6 檔。其餘 138 個輸入的原始位元、LF 雜湊與長度完全不變。
- 原教材來源、照片、候選、獨立預期、既有來源審閱紀錄、精確 guards、圖片證據及資產保持不變。完整文件比對保護所有未修改欄位、原列及欄位存在性；27 個 null official IDs、read_only、原有狀態及有依據的舊義未被批次提升或刪除。

## 套用前必要檢查

1. 官方 compiler 產出 394 欄／183 列候選，獨立比對通過；實際不需 before-format fixtures。
2. 登錄 prepared 後，官方 seal 僅於暫存位置建置，另存新的 `U09-sealed-capture.json`。正式 BEFORE 805 個產物及 `U09-before-capture.json` 未改。
3. 官方 dry-run 為零寫入，範圍精確為 6 檔。
4. 原有 9 個完整交易驗證方法一次全跑通過，0 失敗、0 錯誤、0 跳過，耗時 1515.294 秒。各方法使用獨立保留的 TEMP，沒有縮小測試或修改 timeout。
5. 方法涵蓋：seal／dry-run、不重複寫檔、冪等、第二次 replace 故障完整回滾、非修改列漂移、輸入內容與集合漂移、pending receipt 拒絕、U01 歷史反投影與 137 原始 guards、after checkpoint 未知 bytes，以及修改檔 raw 漂移拒絕。
6. 實際 5 份 TEMP receipt 與 30 份 raw backup 全部核對，不將 9 個方法誤稱為 9 份 receipt。故障及 pending 測試狀態保留在各自 TEMP，不影響產品交易。
7. Python／TypeScript parity 為 1 檔 1 測試通過：4 個完整來源文件正反向一致，6 檔 LF 正規化文字精確反向一致。這是 LF 歷史重建；原始位元回滾另由 raw backup 證據證明。
8. 全部 8 個前序 checkpoint 驗證通過：U01、U02、U04、U05、starter-media 遷移、U06、U07、U08，共 1152 個 LF 雜湊。U01 原 137 guards 保留。

## 交易與 starter 保留

產品 receipt：`output/lv3-audit-20261107/transactions/20261108T061857181350Z/transaction.json`，狀態 committed。6 份產品原始備份的 raw／LF 雜湊吻合原 BEFORE，寫入後雜湊吻合 sealed manifest。

Starter 中全部 120 個相關欄位都已覆蓋：34 個 words、18 個 examples、4 個 notes，共 56 列，沒有缺席提案。所有非 meta 資料集合與獨立預期逐一相等，ID 順序及計數保持，1128 筆 media 不變。

第二次官方 apply 僅驗證冪等，結果 already_applied、0 寫入、0 新 receipt。之後才將 U09 chain 狀態標為 committed；8 個既有節點不變。直接回投 U08 的 144 個 LF 輸入全部吻合原 U09 BEFORE。這是具備備份及回滾紀錄的多檔交易，不宣稱作業系統提供六檔同時原子替換。

## 來源與版本

`source-manifest-revision-v2.json` 是 U09 永久不可變來源證據副本，34938 bytes，SHA-256 `60ef9ccdeaa259865e67531cc3a4635ea7032445f7fc21d3850b8d453614782e`。後續單元不得同名覆寫。

公開 U09 manifest 的 60 個 evidenceTextRef／22 個唯一 JSON pointers 可由同層來源副本解析，sourceId 與 URL 均吻合。France 官方來源已逐欄內嵌，原版例句、答案與狀態仍由完整 beforeRow 保留。歷史 v2 的 69 個 references 不冒充目前 v3 數量。

- Ready manifest Node SHA-256：`27e20dcde2fbae896fc65ab21ab143ff4edc4e391ad63de6496fa76556136bcc`。
- Scope Node SHA-256：`cab3f42c23f67172d05346aefd4238f92798b8a29bb6b47883240f77326525a7`。
- Pack generatedAt：`2026-11-08T05:32:49Z`。
- Pack wordsHash：`sa:787d7a3c21914e817181c97eb75dca9222a2ec33155f9fff7604d786110ad39a`。
- Pack contentHash：`sa:d33e98b1567c9f81a570ec3f423152f1ae45af92ac3261fa58c43b7e59cb0ce2`。

公開來源摘要見 [U09-source-review.md](U09-source-review.md)；本文件及 `U09-application.json` 記錄套用結果，原來源階段快照完整保留於本機。

## 證據與待驗範圍

完整證據位於 `output/lv3-audit-20261107/u09-integration/`：compiler-independent-verification.json、full-result.json、parity-process.json、independent-after-and-journal-proof.json、all-ancestor-projection-proof.json、observed-fixture-hashes.json、observed-main-hashes.json、main-postapply-verification.json、main-idempotence.json、main-parent-projection.json、final-integrity.json 與 final-index.json。所有 TEMP、receipt、備份與執行輸出均保留。

本階段未執行套用後技術回歸、瀏覽器 AFTER、實體手機、正式 PWA、離線或部署驗收；未操作使用者的群組、作答、獎勵、SRS 或資料庫。未 commit、push、deploy。U09 ledger 僅更新為 applied_awaiting_after_qa。
