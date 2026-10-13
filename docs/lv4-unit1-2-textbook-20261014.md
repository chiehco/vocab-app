# LV4 U1–U2 文字教材候選

基底：`03cebe42444eef66e26a7f7d1e8be83979ca32c6`。独立 checkout：`C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`，分支 `draft/lv4-u1-u2-textbook`。本批完成后交父任务独立QA；PR、合併及部署由父任务集中處理。

| 項目 | U1 | U2 |
|---|---:|---:|
| 教材範圍 | p.1–9 | p.11–21 |
| 編號主詞 | 23 | 30 |
| 無編號獨立主詞 | 22 | 16 |
| 主詞合計 | 45 | 46 |
| 補充詞（含印刷註詞） | 56 | 81 |
| 詞彙字卡 | 101 | 127 |
| 用法與搭配 | 32 | 37 |
| 完整群組項目 | 133 | 164 |
| 映射唯一正式 ID | 83 | 102 |
| 無正式 ID 的文字項目 | 17 | 24 |

跨單元共185個既有正式ID；重複的 associate 詞性卡及 measure(s)／measure 教材用途各保留獨立 learningItemId，正式主卡去重。measure(s) 只按照片明列的單複數對回既有 measure，不改印刷字形。其他一律精確拼字，未映射項目保留教材中文閱讀。

啟動包1,995→2,099字，新增104個已有正式 ID 的詞條；全部舊啟動包 words 列逐欄相同，正式 words.json／meta.json 未改。新教材補充詞義、詞性与用法中文均由照片核對後保留，不拿字典其他義項替換。yellow 的膽小義、count 的重要義與 associate 的兩種詞性均保留來源。

來源全文、照片檔名／SHA-256、逐頁轉錄、印刷編號、無編號身分与正式 wordId／officialWord 在 `scripts/sources/LV4Unit1.json`、`LV4Unit2.json`。原件盤點與初稿 Unit 誤標修正見 `lv4-textbook-inventory-20261014.md`。p19用補拍；p10空白Notes目視確認；p22無照片，沿用原件中使用者確認無內容的歷史證據，未憑空補文。

## 未完成內容

這批是 `text_only`／`read_only` 教材：無圖片、圖說、例句、官方senseId或教材題目。可閱讀、建立完整群組，映射詞沿用既有一般字卡／一般練習；單字守城保留既有字形篩選。所有未映射詞義已按本輪照片核對，不標為字典核准，不新增母表。未映射41項詳列来源JSON及本機資料稽核。

U3以後仍需逐頁整理；不是宣布全冊已完成。來源照片、母表、原圖、使用者實際瀏覽器与其他工作樹均唯讀。

## 驗收證據

證據根：`C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence/`。

- Fresh `npm ci` 成功；lockfile未改。
- 80個Vitest檔／462項執行：460項通過，2項舊單元清單斷言失敗；將這兩項限制在既有圖句教材后，两檔9項定向重跑全過。沒有降低正式字卡、圖句或題目檢查。新增本批8項全部通過。
- LV3 Python 14項、LV4 Python 7項全過；lint、typecheck、production build與 `git diff --check` 通過。
- `lv4Unit12Text.test.ts` 以 fake IndexedDB 新安裝实际啟動包，一次 sa-pack fetch 即解析 U1 83／U2 102正式卡。内容refresh逐列保留全部13張非空進度表；非空SRS、35金幣、U17自訂名稱与反向排序保留。這是隔離合成庫的回歸證據，不冒充使用者真實資料。
- `content-audit-u1-u2.json` 驗證全部採用照片雜湊、185映射、舊啟動包內容、母表外正式words／meta及U17–20教材均未變。SRS、13表schema、小鎮金幣程式與基底Git物件一致。
- 隔離Playwright Chrome於本機390px核對U1入口101／32與83一般練習、首卡involve、尾卡addiction p9、完整133項群組／83一般卡及第一張正式involve卡；U2入口127／37與102一般練習、首卡observation p11、尾卡regular p21、完整164項群組／102一般卡。無橫向溢出，console error0。原始snapshot與UI讀取結果存本輪證據。

預設Windows沙箱的Vite暫存rename／Python fixture cleanup曾失敗，未冒充測試結果；改用本任務專用TMP並獲環境執行許可后完成驗收。實體手機、Safari／Firefox、正式站更新與部署尚未驗；發布仍由父任务集中處理。
