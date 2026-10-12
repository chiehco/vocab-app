# LV3 U5–U6 純文字教材：隔離草稿

狀態：教材來源與文字草稿已整理；362 項測試、21 項資料交易測試、lint、typecheck、build 與本機新安裝瀏覽器驗收通過。未 push、未開第二張 PR、未合併、未部署。本批以 PR25 的 `515c1aa70d6d95059993da7a5745072e22c219df` 為基底。PR25 已單獨合併，正式 main `01ae970b9203899f60396a47592400ff45f10a8b` 的 tree 與該基底相同；本草稿仍由父任務審閱後安排。

## 可交付範圍

沿用已授權的 text-first 方式與 U4 共用模型，保留教材順序、教材中文義項、頁碼、編號、明示相關詞與用法。既有字庫 headword 或既有 `wordVariants` 精確吻合才沿用 ID。新增教材單元兩個，不把既有單元補詞算成新增。

| 單元 | 原件頁碼 | 編號主詞 | 獨立未編號詞 | 相關／延伸／星號詞 | 用法／形式 | 已映射詞項 | 獨立正式 ID | 未映射詞項 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| LV3 U5 | 43–52，53 為 U6 邊界 | 36 | 9 | 67 | 46 | 92 / 112 | 90 | 20 |
| LV3 U6 | 53–62，63 為 U7 邊界 | 27 | 18 | 60 | 29 | 83 / 105 | 82 | 22 |

U5 的 45 個主詞皆已有正式 ID。U6 的 practically、warning 無正式 ID，保留書頁義項與 read-only 字卡。未映射的相關詞顯示「教材補充詞；義項待核對。」，不建立一般字卡。相關詞已映射者用既有字典義項，來源標為 `existing_dictionary`，未宣稱其每一義項獲本批人工批准。

一般單字練習分別有 90、82 詞，取已存在的字庫記錄。教材詞彙＋用法群組分別 158、134 項，保留未映射教材項。教材題目、原創例句、圖片、圖說與 sense ID 皆未加入。

## 原件與證據

逐頁目視原件位於 `C:/Users/USER/Downloads/Mobile Devices/LV3/`。照片檔名、頁碼、Level 3／Unit 邊界與 SHA256 綁在 `scripts/sources/LV3Unit5.json`、`LV3Unit6.json`。U5 p.52、U6 p.62 為空白筆記頁；U6 p.61 不是空白。

舊擷取供查漏，沒有當成已批准資料：

- `書頁快抽_LV3_p043-047_Terra初稿.md`
- `書頁快抽_LV3_p048-052_Terra初稿.md`
- `書頁快抽_LV3_p053-058_Terra初稿.md`
- `書頁快抽_LV3_p059-063_Terra初稿.md`
- `work/LV1-LV3_Unit單字例句_MD_20260919/LV3/LV3_Unit_05_單字與例句.md`、`LV3_Unit_06_單字與例句.md`

上述舊擷取與 MD 中的例句、關係方向推論、AI 審圖觀察皆不視作新批准。文字交付授權沿用本對話；圖片／圖句沒有本批採用批准。本批可在不等全級審圖下交付文字教材，完整圖句教材仍待審閱。

## 目視修正與保留

- U5 是 45 個獨立詞條，old-fashioned 與 democrat 是 inline 延伸／衍字，相關詞單列；不沿用舊 MD 47 個主詞的分類。apart、democracy、scientific、salary、engagement、enable、glory、napkin、closet 依印刷位置穿插。
- 補回明示 score、replenish、portion sth out、lift、sweetheart、dress。appeal 的詞性為 `vi./n.`，desert／dessert 保留原書「似」標記，不擅建 confuse 規則。
- U6 補回 dirt。p.60 依序為 koala、donkey、ox；p.61 依序 leopard、dolphin、penguin、owl、parrot、pigeon，不沿用舊擷取的亂序及空白誤記。
- U6 missing 下原件沒有 absent；lost 在 p.54 是「似」，不是「反」。automobile 的書頁別稱為 auto，沒有 `= car`。exchange 下 change 是「衍」，不是「似」。
- roast 保留 adj.；parrot 保留 vt.；practically 頭欄「實際地」，explicit almost 註記另存。be not cut out sth 原書缺少 for，保留印刷形式並註記，未自行更正。
- spilled/spilt、handkerchiefs、oxen 保留形式用法；不推導新的詞形 alias。running examples、諺語句及從例句推得的片語不採用。沒有新衍生方向、反義方向或 sense 規則。

## 精確既有變體

| 書頁拼字 | 正式 actual headword | 既有 ID | 證據 |
|---|---|---|---|
| wage | wage(s) | W002976 | 正式 wordVariants 已有 wage |
| gas | gasoline/gas | W002358 | 正式 wordVariants 已有 gas |
| automobile / auto | automobile/auto | W002051 | 正式 wordVariants 分別已有兩詞 |
| sneaker | sneaker(s) | W005836 | 正式 wordVariants 已有 sneaker |

未模糊比對、不從字根推 ID、不批次增加 alias。字庫只加到啟動包，母表及完整正式字庫資料沒有改動。

## 缺口

U5 未映射 20 項：old-fashioned、consolidate、tyranny、neighboring、crafty、signify、insignificant、replenish、engaged、incapable、unable、inability、glorify、appealing、detection、detector、confirmation、verify、winner、sweetheart。

U6 未映射 22 項：practically、warning、roasted、knuckle、unreasonable、lost、duster、HQ、invisible、exchangeable、impractical、constancy、impassioned、HDTV、high definition television、affordable、educator、airliner、koala bear、cheetah、jaguar、porpoise。

保留原件文字，但停止該筆一般字卡／sense 接入。完整批准圖句與教材題目尚缺；be not cut out sth 的印刷疑點若需改寫，交父任務裁決。沒有以 AI 補教材、補例句或替代審圖。

## 實作與基底

只有兩份 source、兩份 runtime pack、model 的兩個登錄、必要測試與啟動包更新。修正 `build_text_unit.py` 的相對 CLI 路徑解析，使同一產製指令可重用於後續單元。既有 U4 runtime、批准採用資料、SRS、progress schema、正式主詞資料均保持。

啟動包由 1,617 變為 1,747 個既有字庫 ID：新增 130、移除 0，原有詞條記錄逐筆相等；完整 data/v1 除 sa-pack.json 以外逐檔相等。54 個受保護外部母表／原件／圖審檔案雜湊與前批證據一致。

本草稿沒有進入 PR25，也未更動 PR25 的內容、分支或遠端。PR25 按另外收到的使用者批准完成合併部署後，正式已上線單元入口為 26；U5–U6 只在本機草稿。若本草稿將來通過並發布，入口才會增加為 28。

## 驗證

自動化 fresh install 與內容更新測試涵蓋兩個新單元的全部映射、去重群組、未映射項、原有 progress 表及個人群組保留。72 個測試檔、362 項測試及 21 項合成資料交易測試全部通過；lint、typecheck、diff whitespace 檢查通過。

本機 build 使用原始 production 配置，`RAYON_NUM_THREADS=1` 後成功（5.08 秒，PWA 262 precache entries）。未改 Vite 產品配置。第一次原生多執行緒掃描卡住並由本次代理停止；本機開發伺服器那次載入失敗不計驗收通過。

成功 build 的 `dist` 由獨立 `127.0.0.1:4186` origin、全新測試瀏覽器驗證：兩單元入口、各 45 個主詞完整 option 順序、詞項／用法首尾、wage、appeal、dirt、automobile、practically、warning、parrot 與未映射補充詞、158／134 項完整群組、90／82 可解析詞與一般辨義練習。公開本機 starter 1,747 筆包含全部映射。390×844 視窗無橫向溢出、無待審圖片，瀏覽器無錯誤。

證據位於本工作目錄 `output/playwright/u5-u6-browser-result.json`、抽查截圖及本次任務 `lv3-u5-u6-prep/source-audit.json`、`integrity-checks.json`。原件 SHA、來源拼字、正式 actual headword、既有 wordVariants 與每筆缺口可由 source manifests 追溯。

U5–U6 正式更新與實體手機未驗；它們尚未部署。自動化內容更新測試是合成舊庫，沒有假稱為使用者原裝置或正式 U5–U6 更新。正式 U4 的 normal-update / fresh-install / offline 證據另在 `lv3-u4-review/release-handoff-20261012.json`。
