# 常春藤 LV4 U18/U20 四詞正式映射

原本四詞已出現在教材字卡與練習，卻沒有正式詞 ID，因此新安裝的起始包、一般字卡和教材群組無法解析它們。本批增加四筆正式詞、義項和原批准例句，完成 U18/U20 的教材映射。

| 正式 ID | 詞／詞性 | 教材目標義項 | 教材來源 | 原圖句批准紀錄 |
| --- | --- | --- | --- | --- |
| W006087 | preferable / adj. | 更合意的；更合用的 | LV4 U18 p.195 | 18-02 |
| W006088 | brutality / n. | 殘酷；殘暴行為 | LV4 U18 p.197 | 18-37 |
| W006089 | cubic / adj. | 立方體的 | LV4 U20 p.215 | 20-01b |
| W006090 | interactive / adj. | 互動的 | LV4 U20 p.216 | 20-04c |

U18 的批准來源為「OK 全數通過 可以準備推送」，U20 為「好，全數通過」。來源在萬詞譜 `work/lv4_unit18_20260916` 與 `work/lv4_unit20_20260917` 的 `approval.json`、`unitN-review.json` 及 `unitN.json`。逐項原內容、來源檔與原圖／發布 WebP hash 保存在 `scripts/data/lv4_u18_u20_approved_additions.json` 與 `src/features/vocabulary/lv4MappedReview.json`。

preferable 沿用使用者中文翻譯的例句，保留 `translated_from_user_chinese`。另外三詞保留 `authored_in_this_task`。所有例句、翻譯、圖說、圖片、教材入口、learningItemId、questionId 與 template revision 均沿用原批准內容。只有這四詞的 lexemeRef、officialWordId、officialSenseId 改為正式 ID；一般字卡使用既有批准圖句登錄機制。

U18 的 47 個教材詞映射為 46 張主卡（statistic / statistics 原共用主卡），U20 的 46 個教材詞映射為 46 張主卡。完整詞庫由 6,086 增至 6,090 詞；起始包由 1,530 增至 1,534 詞。考試優先級保持原資料。

## 母表安全流程

唯一正式母表為 `outputs/master_integrate_20260904/萬詞譜母表_SA義項清理整合_20260904.xlsx`。先在隔離目錄產製，通過整體差異驗收，再建立獨占備份及安全替換。

2026-10-09 已完成備份與正式母表安全寫回，正式母表 hash 與四詞副本一致。

- 前版 SHA-256：`76737ac427b80322a40b72abb50980717f656ea980c61474f28d7d520488aecb`
- 四詞副本 SHA-256：`88fe2590c8b0a70ef48771c722255069a5d517508c9d73bd76a4cf44f991663d`
- 備份檔名：`萬詞譜母表_SA義項清理整合_20260904_before_lv4_u18_u20_4words_20261009.xlsx`
- 只追加 `input_words_單字主表`、`input_senses_義項表`、`input_examples_例句表` 各四列。64 個工作表、829 個公式、既有儲存格與其他 ZIP 成員均保留原位元組。

`scripts/apply_lv4_unit_mappings.py` 拒絕來源變更、ID／主詞衝突、重複套用及未批准內容；隔離產製成功後才替換 App 檔案。`scripts/verify_lv4_unit_mappings.py` 比對 main `ba22d7349f5441ac30d99b0af979d3e0ad8b015f` 的完整差異。`--publish-master` 要求已通過的 scope audit、未變動的 App hash 和母表來源 hash，先驗證備份再替換正式母表。

## 驗收

- Python 21 項交易／回滾／備份／來源變更與重複新增測試通過。
- lint、typecheck、67 個測試檔共 323 項測試、正式 build 通過。重型檢查依序執行，測試單 worker；726 張 LV1 圖卡 hash 檢查使用 15 秒測試逾時。
- 共用單元資料與 runtime 驗證通過。驗收使用隔離 source adapter，只把四詞 ID 更新到副本的教材與 review records；原批准、圖句 hash 和來源檔案不改動，adapter-receipt 記錄差異。
- 正式 build 更新測試：已部署基準版先以 UI 完成一題，再更新 1,530 → 1,534 詞；十個進度表逐筆相同，複習排程、字級設定、首答紀錄與第二題續答位置保留。這是隔離瀏覽器的測試進度。
- 空白瀏覽器安裝後，U18 47 詞／46 ID 與 U20 46 詞／46 ID 全部可解析，十個進度表皆為空；四詞的正式詞、義項與原例句均已安裝。兩單元桌面／390px 手機尺寸教材和一般字卡核對、79 張 WebP hash 與解碼均通過。
- statistic / statistics 共用圖片與 W003918，但各自教材圖說不同；一般 statistic(s) 卡保留 statistic 的批准圖說。共用瀏覽器檢查器只在本機輸出副本修正這個檢查條件，沒有改 App 或來源圖句。
- 本機收據在 `output/lv4-mappings-20261009`，包含 `scope-audit.json`、`fresh-result.json`、`progress-after-result.json`、兩單元 `report.json`／`runtime-result.json`／`browser-result.json` 與截圖。此 draft 未合併、未部署；實體手機驗收留待發布階段。

本批僅四詞。LV3 U1/U2 的 43 詞提案、LV4 U17/U19 的 10 詞提案及 wizard/witch 裁決仍保留待處理；圖片審核、房屋與 LifeRPG 均不在本次變更範圍。
