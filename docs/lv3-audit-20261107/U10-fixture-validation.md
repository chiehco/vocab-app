# U10 本機套用與交易驗證

U10 已完成本機資料交易；技術回歸與瀏覽器 AFTER 待驗，尚未發布。

## 結果

- 407 欄、166 完整列、3 完整來源文件，實際內容與來源階段獨立 expected-after 完全一致。另逐欄、逐列、逐文件直接重讀計算 Node JSON.stringify SHA-256，全部吻合，沒有用 compiler 或套用結果回填預期。
- 教材 324 欄／129 列、words 61 欄／26 列、examples 22 欄／11 列；notes 未修改。13 個原本無 verbForms 的詞條新增經審核三態。
- 單次交易精確寫入 words.json、examples.json、curriculumLV3Unit10.json、meta.json、sa-pack.json 五檔。139 個其他輸入的 raw、LF 與長度皆不變。
- 37 個教材補充詞 null officialWordId 與其列身份保持。原來源、例句、狀態及所有未修改欄位由完整文件比對保護；沒有圖片變更。

## Compiler 輸入與獨立預期

第一輪原始 merged proposal 含額外審閱 metadata，官方 compiler 正常拒絕，未產生 candidate 或寫入產品。錯誤紀錄保留。

另建 compiler-input-v1.json，根物件只含 unit/proposals；每筆精確保留官方 11 欄與完整 beforeRow，來源順序、reason、originFindingIds、值與欄位存在性皆不變。407 筆移除的純審閱 metadata 逐筆另存。原 merged、獨立 expected、來源 v2 與 BEFORE 全部未改，compiler 本身未放寬。

- 原候選 raw SHA-256：74648d62c6fb06ff32dabbcc15dc66c4a798eb06642c21e376e675ee24565aac。
- 衍生 compiler 輸入 raw SHA-256：a2dc3b10ecfd44a3949309f392e1959c47a1bfed335855317d94cedd4d5a0adb。
- 衍生 compiler 輸入 Node SHA-256：97bee431d630d03a5ec430b7428594ff674523e080b680e102cce89504e28b0e。

manifest 綁定衍生輸入；獨立比對保留原→衍生→compiler 的完整值、來源及 beforeRow 對等鏈。來源全部 inline，沒有 evidenceTextRef，未重用或覆寫 U09 的 source-manifest-revision-v2.json。

## 交易與歷史驗證

1. 原 918 份 BEFORE 產物及原 before-capture 文件保持；新 seal 另存 U10-sealed-capture.json。官方 dry-run 精確五檔、0 寫入。
2. 九個完整交易方法一次通過，0 失敗、0 錯誤、0 跳過，耗時 1801.114 秒。各自 OS TEMP、原始輸出、錯誤狀態與備份保留，沒有縮小測試或修改 timeout。
3. 涵蓋 seal/dry-run、單檔單次替換、冪等、第二次 replace 故障完整回滾、非修改列漂移、輸入內容／集合漂移、exact-after pending receipt 拒絕、未知 after bytes 與修改檔 raw 漂移。
4. 五份實際 TEMP receipts 與 25 份 raw backups 全核對；九方法不誤稱九 receipts。故障與 pending 狀態僅留在各自 TEMP。
5. Python／TypeScript parity 通過：3 完整來源文件正反向、5 檔 LF 正規化 published text 精確逆向。原始位元回滾另由 raw backups 證明。
6. 全部九個 ancestor（U01、U02、U04、U05、starter-media migration、U06、U07、U08、U09）各144 LF，共1,296雜湊吻合；U01 原137 guards 保留。U09 persuasive 及共用 consumer 經嚴格反投影，未重寫歷史期望。

產品 receipt：`output/lv3-audit-20261107/transactions/20261108T085543809128Z/transaction.json`，狀態 committed；5份原始備份 raw/LF/bytes 全吻合 BEFORE。官方第二次 apply 回傳 already_applied、0 寫入、0 新 receipt。之後才將 U10 chain 標記 committed，僅更新 U10 ledger。直接回投 U09 的144 LF 全吻合原 U10 BEFORE。

這是具備備份及回滾紀錄的多檔交易，不宣稱作業系統提供五檔同時原子替換。

## Starter

依實際交集逐列套用獨立提案，再比較所有非meta集合。實測 words 26列／61欄與 examples 11列／22欄全部存在；沒有缺席提案。notes 及所有其他集合、ID 順序／計數、1128筆media 保持不變。

## 證據與未驗界線

完整證據位於 output/lv3-audit-20261107/u10-integration/，包含首輪 compiler 錯誤、adapter證據、完整九方法、parity、各 ancestor、observed-fixture-hashes.json、observed-main-hashes.json、raw backups、冪等及直接 U09 回投；final-index-v1.json 為本階段完整索引。

尚未執行本輪技術回歸、瀏覽器 AFTER、實體手機、正式 PWA、離線或部署驗收；未操作群組、作答、獎勵、SRS 或資料庫。未 commit、push、deploy。狀態為 applied_awaiting_after_qa。
