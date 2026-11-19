# interact 字庫品質修正：來源待取得

本批基於 main `25592eab53d37e394da9cd7f3b5ea1a3d9aee402`，獨立於 PR #51。
**尚未取得可確認的最新母表，因此沒有修改或發布正式 JSON，也沒有宣稱正式站已修復。**

## 最新來源的定位結果

- `package.json` 的 `import-data` 指向：
  `C:/Users/USER/OneDrive/文件/萬詞譜/outputs/master_integrate_20260904/萬詞譜母表_SA義項清理整合_20260904.xlsx`。
- 正式 `public/data/v1/meta.json` 的 `sourceFile` 同名，`generatedAt` 是 `2026-10-26T06:21:08Z`。檔名中的 9 月日期不代表內容只更新到 9 月。
- `docs/all-recorded-meanings-20261026.md` 與 `scripts/apply_house_meanings.py` 記錄 10 月 26 日曾從 canonical workbook 選取 house 資料，保留其他公開資料。meta 的 `houseSourceSha256` 為 `98fa208835caf7184acc95f26dcff56ace23ba281ff8d4b9b8c37e18e407be14`。這是當次 house 來源的雜湊，不能直接證明現在磁碟上仍是相同版本。
- Drive 搜尋「母表」「SA義項清理」「vocab_app_source」及相關檔名／較新修改日期，未取得上述現行母表。Library 的檔名搜尋也未取得可用的該母表。可存取的範圍中找不到，不代表檔案不存在。
- 使用者提供的 [8 月候選檔](https://docs.google.com/spreadsheets/d/1NGWyEsnhObCDQl7WGvkdXPI5v9DPDVwq/edit) 實際為 XLSX，provider 修改時間 `2026-08-25T04:15:57.738Z`，下載位元組 SHA-256：`7e71f8fdf2151409a114a92dad9f83539dcfb35c1e7db9f1fa3b8b5ca77e423f`。本批唯讀對照，不修改，不將它當成最新版。

## 對應關係與錯誤位置

| 層級 | 身分／欄位 | 查核結果 |
|---|---|---|
| 正式詞條及 S+A 啟動包 | `W003558` / `interact` / `pos=v.` / `status=draft` | `meaningZh=互相影響；交互作用；幕間劇；幕間休息`，兩包的完整詞條相同 |
| 正式義項 | `senses.json` / `wordId=W003558` 或 `word=interact` | 0 列，沒有可移動或重編的 Sense ID |
| 已核教材 | `LI-LV4U20-interact` / `officialWordId=W003558` | `sensePos=v.`、`targetMeaningZh=互動`、`officialSenseId=null`；教材義維持原樣，不自造 Sense ID |
| 已核補充說明 | `NX40863c1d` / `interact` | `approved` 的「interact with + 人／事物」，既有說明是「與……互動」，保留 |
| 8 月候選主表 | `input_words_單字主表`，`word_id=W003558`、`word=interact` | 當時第 3560 列、E 欄 `meaning_zh` 已含同樣四段；`pos=v.`、`status=draft` |
| 8 月候選義項表 | `input_senses_義項表` | 以 Word ID 及 headword 交叉查核均為 0 列 |
| 匯入流程 | `parse_words` / `parse_senses` | 主表第 5 欄直接成為 `meaningZh`；義項另行讀取，沒有合併回摘要的程式 |

因此這是**至少在 8 月候選來源中已存在的主表摘要錯置**，不是本次題目解析或目前匯入器把義項拼錯。尚無足夠資料判定當初哪個字典或整理步驟引入幕間義，也未實讀最新版母表的那一列。

[Oxford interact](https://www.oxfordlearnersdictionaries.com/definition/english/interact) 列動詞的與人交流及事物互相影響用法，搭配 with。這支持保留動詞摘要，並與既有教材「互動」相容；本批不宣稱已窮盡歷史辭典中的同形字或全部字義。

## 可直接套用的最小修正

先確認現行母表，依 **欄名與身分** 定位，不能以舊檔 E3560 直接定位新檔。

| 目標 | 原值 | 修正後 |
|---|---|---|
| `input_words_單字主表` → `word_id=W003558` 且 `word=interact` → `meaning_zh` | 互相影響；交互作用；幕間劇；幕間休息 | 互相影響；交互作用 |

只刪兩段錯置內容。`word_id`、`word`、`pos`、`status`、英文解釋、來源註記及其他欄位都不改；不新增義項，不將 `draft` 升為 `reviewed` 或 `approved`。義項表預期不變。若最新版已有新義項、詞性／審核狀態不同或摘要已被改過，停止套用並重新對讀，不能覆蓋較新的人工判斷。

附帶發現既有 `usage_pattern=interact + N; interact to V` 與 `usage_pattern_zh=與某人互動；互動去做……` 也需要另行審閱，with 搭配已有核定教材與 note 可用。本批遵守最小摘要修正範圍，不順便修改搭配或批准新義項。

機器可讀修正與固定公開基底指紋：`scripts/corrections/interact-summary-20261031.json`。

## 來源先改，再產生候選公開資料

`scripts/stage_interact_correction.py` 只讀母表，不改 Excel、不寫入現行 public，也不會認定任意提供的檔案是最新版。

1. 確認上述 canonical path 的現存檔案及最新修改，計算其 SHA-256（例如 PowerShell `Get-FileHash -Algorithm SHA256`）。
2. 先檢查來源，工具會回報實際列號與欄號：

   ```bash
   python scripts/stage_interact_correction.py --source "<已確認最新母表.xlsx>" --expected-source-sha256 <目前SHA256>
   ```

3. 備份最新母表後，只在 Excel 修正上述 `meaning_zh` 一格。儲存並重新計算 SHA-256，不能沿用修正前的雜湊。
4. 從**已修正的來源**產生隔離候選：

   ```bash
   python scripts/stage_interact_correction.py --source "<已確認且修正的最新母表.xlsx>" --expected-source-sha256 <修正後SHA256> --out "<不存在的隔離候選目錄>"
   ```

工具驗證來源完整 interact 詞條只改一欄、義項集合與狀態不變、現行公開資料符合本批固定基底。通過才複製公開資料到候選目錄，替換那一欄並重算 words/content hash、S+A 啟動包；保留 house 來源等原 meta 欄位。任何來源狀態、Word ID、義項、公開基底漂移均停止，需重新審核。它不做完整母表重匯，避免把其他尚未核准的差異一併帶入。

`import_data.py` 另加入精確的已知錯誤檢查：interact 摘要含「幕間劇」或「幕間休息」時，在任何資料輸出前報錯，要求先修正來源，不靜默清洗。這只防止舊來源重建時恢復錯誤，**不會改掉已發布包內的舊錯義**。

候選審閱後才可另行決定採用、合併或發布；本批未執行這些動作。確認來源並完成正式採用後，應更新或移除固定舊基底的交接測試／manifest，避免把本批來源待核狀態永久化。

## 驗證範圍

Python 測試以合成 worksheet／候選資料驗證：舊錯義被拒絕、保留四種人工狀態、不處理其他字、依鍵定位、不接受重複或衝突身分、不接受新增義項或升級狀態、舊公開基底失效時中止、拒絕寫 live data，以及隔離產物只變 interact 摘要與必要 hash／starter。全部原義項、其他字和已核資料逐筆不變。

前端測試將同一欄修正套用於記憶體中的完整包與 S+A 包，實際 render 共用字卡元件，確認既有教材「互動」與剩餘摘要同時可見、沒有幕間義；逐一核對 interact 選項顯示，並保護題目與逐項解析原資料不變。這是**修正套用後的候選驗收**，不是目前正式 JSON 已正確的證明。

本次測試結果另見 PR 說明。沒有改 PR #51 的五題、20 段解析、使用者學習進度或其他待核資料。
