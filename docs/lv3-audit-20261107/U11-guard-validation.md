# U11 精確資料契約驗證

2026-11-08。狀態：主工作樹已接入精確 guard 與測試，U11 產品資料尚未套用，未發布。

## 接入範圍

只接入經隔離驗證的十份程式／測試檔，四個既有檔先保存原始位元備份，六個新增檔先確認不存在。各檔與固定 v4 候選 SHA-256 完全相同。

四個例外均限定 LV3-U11，綁定完整 before 列、全部 after 欄位、reason、evidence、fieldEvidence 及來源記錄：

- LI-LV3U11-G001：forever and a day 的 pattern 與 explanationZh。
- LI-LV3U11-G050：兩種 impress 搭配的 pattern 與 explanationZh 辨析。
- EXa746dcc7：只將中文「百慕達三角洲」改為「百慕達三角地帶」，保留據報導語氣與原英文、blank、answer。
- W004264（debut）：僅此完整詞條修訂可使用 Dictionary.com 的 debuted 直接證據作三態來源。刪除或變更任一契約部分均拒絕，不能刪去 verbForms 後退回一般修改。

原有 guards、U09 constants、一般欄位與 Collins 來源限制保留。JSON 比較區分 boolean／number／null，保留陣列順序，忽略物件鍵順序；107 與 107.0 視為相同數值。U11 fieldEvidence 必須為物件。

## 驗證結果

- 固定候選 Python 1,055 tests、TypeScript 1,046 tests 全過，零失敗、錯誤或跳過。包含同源 fresh-scope／hash 的 252 個 U11 內容與型別案例，以及 170 個 debut 案例。
- 原 33 個小型 fixture 方法與 assertions 保留，新增六個 U11 精確六檔測試，共 39 個。U10 精確五檔限制不變；原九個完整 TEMP 方法未修改，本階段未執行。
- 隔離官方 compiler 的 497 欄、213 完整列與六份完整來源文件，均吻合獨立 expected-v4。其中四份有修改，senses／media 兩份唯讀。六份完整 before 文件、四個精確例外的語義與序列化位元亦吻合；四份修改文件 forward／inverse 通過。
- 首次 compiler 檢查因將 raw digest 傳入既有 LF-normalized capture 欄位而拒絕，未產生 manifest，失敗證據保留。修正版逐一驗證原封存 144 個輸入的 raw SHA、LF SHA 與 byte length，再僅投影原 lfSha256；未改 compiler 或產品檔換行。原始位元復原與 LF 歷史投影分開記錄。
- 主檔接入後重核程式與依賴身份，沿用上述固定候選完整測試結果，不重跑相同輸入。另完成主檔 import／AST 與 39 個 fixture 路徑 smoke，全部通過。產品、chain、ledger 與 144 個輸入保持不變。

## 待完成與限制

尚未在主工作樹登錄或 seal U11 manifest／chain，未執行九個完整 TEMP 方法、十個 ancestor 的 144-domain 投影、六檔原始備份交易與零寫入重複套用驗證，未套用產品或完成 AFTER 驗收。meta／sa-pack 的後續派生仍未進行。

U56／puppet 原 5,000ms timeout 與全專案 lint 仍是發布阻礙。本報告不代表完整技術 gate 通過；未進行本階段 build、typecheck、browser、commit、push 或部署。

證據索引：`output/lv3-audit-20261107/u11-integration/main-guard-registration/final-index.json`。固定候選、完整測試、首次失敗與修正後 compiler 證據均保留於同一 integration 目錄，未覆寫歷史證據。
