# Issue #60 W0：編譯內容基線（2026-11-27）

基線 main：`41e292bddfd2b7befff53979b4c4bac26e468f74`。本批完成 **W0 的 checked-in 編譯內容盤點子批次**，W0 的母表、原照片、runtime 五種核心練習與逐單元實機驗收對照仍待完成。不是整體 1.0 完成度。

## 交付與重跑

- `scripts/content_inventory.mjs`：只讀取 LV1–LV6 的 curriculum JSON、其明載的 sourceManifest、LV3 U01 的外置 grammarQuestions，以及 LV1 圖對登錄 JSON；不啟動 app、不寫教材或資料庫，不需私人路徑或 npm 套件。
- `content-baseline-20261127.json`：121 個編譯單元與 19 個 LV1 圖對群組的快照，238 個輸入檔附 SHA-256。此處的母表版本與來源照片均未重新認定。
- `scripts/contentInventory.test.ts`：10 項回歸測試，由既有 Vitest CI 自動收集，不改既有 workflow。

```sh
# 在 repository 根目錄核對現存快照；僅讀取，不重寫。
node scripts/content_inventory.mjs --check docs/content-baseline-20261127.json

# 新批次應使用新檔名及其實際基線 SHA；寫入拒絕覆蓋既存證據。
node scripts/content_inventory.mjs --write docs/content-baseline-NEW.json --base-commit <40-character-SHA>

npm test -- scripts/contentInventory.test.ts --maxWorkers=1
```

`baseCommit` 是執行者記錄的基線，不會自動認定來源為最新版；實際讀入內容由 `inputs` 雜湊綁定。雜湊先移除 UTF-8 BOM、將 CRLF/CR 統一為 LF，再計算 SHA-256；`inputHashFormat` 明載規則，Windows 與 Linux 同內容可重跑，不是原始檔案位元組雜湊。快照比對也容許作業系統換行差異。`--check` 比對內容與不存在的來源指標，資料漂移時報錯；快照不作為全 repo 的自動發布門檻。往後教材更新時，舊快照保留為歷史證據，另產新檔即可。

## 實際觀測

以下為跨 Unit 的**教材詞彙列數**，不是不重複單字數；重複收錄會重複計數。無 `officialWordId` 可能是衍生詞、片語或待映射列，須分類審核，不能視為同量程式缺陷，也不能直接對比 #12 的歷史 60 筆。

| LV | 編譯單元 | 詞彙列 | 有 Word ID | 無 Word ID | 有 originalExample | 內包題目列 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LV1 | 6 | 512 | 392 | 120 | 0 | 0 |
| LV2 | 24 | 2,270 | 1,867 | 403 | 0 | 0 |
| LV3 | 24 | 2,747 | 2,141 | 606 | 261 | 93 |
| LV4 | 24 | 2,563 | 2,019 | 544 | 185 | 524 |
| LV5 | 18 | 1,979 | 1,418 | 561 | 0 | 0 |
| LV6 | 25 | 3,040 | 2,136 | 904 | 0 | 0 |
| 合計 | 121 | 13,111 | 9,973 | 3,138 | 446 | 617 |

LV1 另有 19 個圖對群組、726 列圖對；它們與編譯詞彙分開記錄，不能相加當成獨立單字數。圖對列不表示本輪重新批准圖片，也未檢查圖片檔案或所有 resolver。text_only 單元不因沒有 illustration 欄位而被判定缺圖。

115 個單元明載的 sourceManifest 檔案存在；LV3 U01/U02、LV4 U17–U20 的 template 未記錄此欄位，標為 `not_recorded`，**不是宣稱其原始教材不存在**。全書應有單元數未知，未觀測到的單元不補零、不計完成百分比。LV5 只列實際觀測單元，不能沿用舊文件推斷整本已完成。

LV3 U12/U18、LV6 U21 在目前 main 已有編譯檔；其原始 `releaseReview` 仍記錄 `accepted_text_pending_publication`、`requiresSeparateDataRelease: true`。照錄此標記，沒有因為已進 main 就改成已發布。這也說明舊 LV6 整合文件的 U21 缺頁敘述不能直接當目前狀態。

`packagedQuestions` 僅數已宣告的題目陣列；LV3 U01 另外讀取目前實際使用的 grammarQuestions 檔案。不包含 runtime 從例句衍生的拼寫／選擇題、獨立題庫、variant 或 passage transform，因此 0 不代表該單元完全不能練習；617 也不是五種核心題型的總題數。不存在的題目欄位保留 null，明載空陣列才記 0。逐選項空解析只作欄位缺口，非語義審核。

每個單元的英選中、拼寫、句中選字、短文克漏、短文配合題驗收，以及 runtime 目錄可見性、字義正確性、最新母表及實機驗收，一律保留 `unknown`。`review`、`practiceMode`、`releaseReview` 原字串的出現次數只是觀測，不升格 draft 或 machine_verified。

## 協作與驗證邊界

本輪先讀 Issue #60 與留言、#12–15 及 #12 補充說明、開放 PR #59/#55/#52 的檔案與討論，以及 main 的 LV4 發布與 LV5/LV6 整合紀錄。三個 PR 分別為 LiveABC U08、月曆、interact 來源修正，均未併入或修改；不依過期 PR 本文推斷目前 head 已驗收。正式站連線版、母表與照片不在本工具驗收範圍。

本批本機 10 項測試、快照重跑比對、Node 語法檢查及 lint 已通過；lint 有 8 則既存警告，新增檔沒有警告。測試涵蓋詞彙／文法分母、重複圖對、未知與零的區別、待審狀態保留、解析缺欄、來源雜湊、路徑越界、識別衝突、拒絕覆寫、資料漂移、Windows CRLF/BOM 可攜性及現行全量資料的確定性。完整 typecheck、build／CI 最新結果另記於本輪 PR 與 Issue #60，不能以本文件代替其實際結果。未做手機、PWA 更新或實機驗收。

## 下一個最小批次

先補 W0 的 runtime 對照：選 LV3 U12/U18、LV6 U21 三個帶 `requiresSeparateDataRelease` 的既有單元，唯讀核對目前目錄、starter/full 字庫及既有發布證據，明確區分編譯存在、App 可見與資料發布；不在這一步新增映射或批准內容。再從已核且不與協作者重疊的單元選一小批 W1/W2 工作。五種題型及三階段配合題的實作驗收仍另列，不用內包題數替代。
