# LV3 U1/U2 批准交集接入（2026-10-08）

從正式版 `16c10642539e7a861bd45cf275f9761241fdfa93` 接續，只套用使用者明確批准的五項交集。

| 項目 | 本批結果 |
| --- | --- |
| probability | U1 probable 的既有烏雲野餐圖，配 probability 原單元中英句；無正式 ID，仍只作教材卡。 |
| determine | 保留「確定」義與土壤檢測原句；跑者圖另作「決定／決心」候選，不綁本次義項。 |
| perform | 保留「執行」義與安全檢查原句；樂團圖過去式配句記為「表演」候選，不綁本次義項。 |
| slender | 使用既有 `wordbeast/s/W002812.webp` 舞者圖與原單元句；同步一般字卡與看圖提示。 |
| limousine/limo | 母表新增主詞 `W006085`、共用義項 `W006085-1`；兩個教材入口共用一主卡，保留兩份原例句、learningItemId 與題目 ID。 |

核准圖句的原圖／網頁圖／文字 SHA256 與裁示來源記於 `src/features/vocabulary/lv3ApprovedReview.json`。probability 只做 lossless WebP 格式轉換，1254 × 1254 原圖與輸出 RGBA 像素相同；slender 原圖位元組未變。

正式 words 6084 → 6085，senses 765 → 766；啟動包 1528 → 1529 張。U1 有 99 個已映射教材入口、98 張獨立一般卡（兩個禮車入口共用一張）；U2 的 116 張一般卡不變。其餘 examples、media、relations、morphemes、notes、exam_priority、hooks 均未修改。SRS、學習紀錄及既有題目 ID 不變。

## 母表保護與範圍

唯一來源仍為 `萬詞譜母表_SA義項清理整合_20260904.xlsx`。依本批明確授權修改，先備份為同資料夾的 `萬詞譜母表_SA義項清理整合_20260904_before_lv3_approved_20261008.xlsx`。舊 SHA256 `390975586df29cab5a080931e180505b60fec5c95991b2af442a83d0ce5e7a2a`，新 SHA256 `0af6602355b3ef31cbb54cbd43fe412566c7582326e47684d2f71caa22af4bdb`。

只在主詞表第 6087 列與義項表第 767 列追加資料；ZIP 成員只改兩張工作表 XML。64 張工作表、829 個公式、所有既有儲存格和其他 ZIP 成員均保留。既有 InputWordsTable 範圍 A1:O200 是歷史範本範圍，原 6084 詞已在表格外；本批保留該 metadata，不擴大修改。

`scripts/apply_lv3_approved_review.py` 在隔離目錄完成母表追加、圖句核對、圖片轉換、完整資料與離線包生成，再替換 App 檔案及 `--out` 產物。提交前重查來源及目標，替換出錯會回復已替換檔案；後段驗證失敗不留下半套資料，修正輸入後可直接重試。`--out` 須為 repo/output 下的獨立目錄。

`scripts/verify_lv3_approved_review.py` 比對完整兩單元及正式資料 delta。只有取得 scope audit pass 後才可用 `--publish-only --publish-master`，寫回前再次檢查母表雜湊。發布資料 contentHash 固定按 Git LF 格式計算，避免 Windows checkout 換行造成不同雜湊。

既有 `verify_unit.py` 使用完整批准 LV4 包契約；本批 LV3 部分批准保留舊 schema，以專用 scope audit 全量核對，沒有捏造整單元批准或字表檢核。

## 本機驗收

- lint、typecheck、build 及完整 318 個 App 測試通過。
- 8 個 Python 套用器回歸測試通過並納入 CI：後段核准項目／圖片／雜湊缺漏、雜湊／例句不符、離線包生成失敗後重試、替換途中失敗回復，以及成功路徑。失敗時比較所有檔案路徑及 SHA256，包含既有暫存母表與收據。
- 正式備份母表在隔離副本重跑成功：九項 App 輸出與 PR 相同（僅 generatedAt 可不同），產生的母表 SHA256 與正式母表相同；正式母表、備份、核准紀錄、原圖和目前 App 資料的 SHA256 均未變。本次核對未見半套用資料。
- scope audit 通過：只有 probability、slender、limousine、limo 四個教材項目資料改動，兩張新批准配對，1 個新主詞、1 個新義項。
- 隔離瀏覽器新安裝通過教材兩張圖卡、一般 slender 卡、兩份禮車教材原句，以及兩種拼字各只找到一張共用卡。
- 390 × 844 手機尺寸及桌面截圖已核對；正常重新整理保留一張卡的已存列表；兩張變動圖片可離線重開。未驗實體手機。

nostalgic、wizard/witch、其餘 93 張圖及 164 詞盤點建議仍待使用者裁示；本批未修改或批准。原 325 圖目視盤點、43 詞來源義項草稿及六頁審閱 PDF 保留原始證據。PR #21 已解除 draft；本次 review 修正不合併、不部署。
