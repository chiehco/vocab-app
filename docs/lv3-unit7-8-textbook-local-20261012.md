# LV3 U7–U8 純文字教材：本機可審閱草稿

本批以正式 main `68ef21a76780c3e27264f18ad4fb1155884650f9` 為基底，保留 PR26 已發布的 U5–U6。來源與 runtime 草稿在獨立 `draft/lv3-u7-u8-textbook` 分支；沒有 push、PR、合併或部署。正式入口仍為 28；本機候選增加 U7–U8 後為 30。

## 範圍與缺口

| 單元 | 原件／邊界 | 編號／獨立未編號 | 詞項／相關詞／用法 | 映射詞項／獨立 ID | 未映射 |
|---|---|---|---|---|---|
| U7 | p63–72；p73 開始 U8 | 31＋14＝45 | 100／55／53 | 85／84 | 15，全為相關詞 |
| U8 | p73–82；p83 開始 U9 | 36＋9＝45 | 98／53／49 | 82／81 | 16，含主詞 advertiser、consciousness |

共 198 詞項（90 個獨立頭欄出現、108 相關詞）、102 用法、300 教材項目。167 個詞項出現使用 165 個既有正式 ID；31 未映射項保留只讀教材補充，不新增母表或一般字卡。主詞使用書頁中文義項；已映射相關詞用既有字典義項並標明來源。圖片、圖說、原創／教材例句、教材題目、sense ID 均未採用。

U7 未映射：trendy、charming、appealing、copilot、enslave、necessarily、insensible、sufficiency、insufficient、crisp、apricot、widely、weakness、handbag、observant。

U8 未映射：advertiser、consciousness、vehement、blackout、water buffalo、advertising、the Statue of Liberty、inconspicuous、abreast、awareness、a pep talk、odorless、movie theater、biofuel、EQ、elemental。

## 逐頁來源核對

全部 p63–82 及 p83 邊界原件已目視，沒有缺頁或空白教材頁。來源照片在 `C:/Users/USER/Downloads/Mobile Devices/LV3`，各頁檔名、SHA256、printed level/unit、主詞順序、頁碼／編號、正式 actual headword／wordVariants 與缺口在 `scripts/sources/LV3Unit7.json`、`LV3Unit8.json`。

舊 `書頁快抽` 及 `LV3_Unit_07/08_單字與例句.md` 僅作查漏，並非已批准教材。沒有更改原件、舊擷取、圖片或採用狀態；沒有使用 AI 代補內容。

- U7 舊 MD 漏 historian、vacant、onion、spinach；trendy、reminder、copilot、slavery、advice、advisory、summarize、sufficiency 等實為 inline 補充。p72 是相關詞續頁＋31 steal，不是空白書寫頁；necessary／necessarily 在 p68、senior 在 p71。
- U8 舊 MD 只有 28 標題且缺大量編號主詞；實際尾頁 p82 含 33 emotional、34 lick、35 nest、36 element。cow、advertising、suspicious、abreast、awareness、conscience、increase、elemental／elementary 等保留 inline 身分，沒有推定新衍生／反義規則。
- U8 p76 的 suspect 有兩個獨立詞條框：`vt. 懷疑；猜想` 與 `n./adj. 嫌疑犯；可疑的`。兩項保留不同 learningItemId、書頁位置及義項，沿用同一既有 wordId；未建立新 sense。產製器只補一個必要的詞條出現佇列，避免同拼字把前項蓋掉。U4 重新產製結果相同。
- 原書 crop 三態第二態印成 `copped`，原樣保留並明示「第二態印刷拼寫待裁決」。不擅自改成 cropped，不將形式映射至新 ID；如需修正交父任務決定。`drive a plane` 也保留原書「不可說」註記。
- 只收明示片語、用法／形式、星號補充；running examples、祈禱句、諺語全文及從例句推導的片語不採用。

## 既有資料與基底

adviser／advisor 精確沿用正式 `adviser/advisor` 的既有 wordVariants（W002017）；scale 沿用 `scale(s)` 既有 wordVariants（W002763）。不做模糊比對、詞根推 ID 或新增 alias。

啟動包由正式 1,747 變為 1,869：新增預載 122 個既有 ID、移除 0，原有詞條記錄逐筆相等。U4／U5／U6 runtime pack 逐筆相等；沒有把既有單元變更當新增交付。整理到 PR26 merge commit 的清單衝突只合併已存在的登錄／測試範圍並用既有腳本重建啟動包。

## 驗證與界線

新基底完整測試 73 檔、374 項及 21 項合成資料交易測試通過。測試覆蓋新安裝全部映射、完整群組、明示變體、二個 suspect 不被覆蓋、未映射保留、沒有待審圖句／題目採用，以及非空 SRS／個人群組／設定等 progress 表在內容更新後逐筆保留。

lint／typecheck 通過。直接 worktree 建置停在掃描階段，由本次代理停止；同一已保存提交經 Git archive 解出的普通 Git 目錄複本，在原 production 設定及 RAYON_NUM_THREADS=1 下建置成功（4.52 秒、PWA 262 precache entries）。沒有修改產品 Vite／CSS 設定，不能將環境差異宣稱為已定位的程式缺陷。

本機 fresh install UI 已核對兩單元各 45 個主詞出現順序、100／98 詞彙選項與 53／49 用法、U8 兩個 suspect 各自詞性與義項、未映射主詞／相關詞的只讀標示、完整 153／147 項群組、84／81 張映射字卡、一般練習啟動及 1,869 啟動包內全部 165 個正式 ID。一般練習既有規則排除功能詞，因此 U7 為 84 字、U8 為 77 字；U8 排除 above、below、beneath、onto，仍保留課本閱讀與群組的 81 張字卡。上次 UI QA 將映射字卡數當作可出題數而逾時，修正的是 QA 預期，不是產品規則或教材。

390px 視窗下單元入口、字卡、群組與練習無橫向溢出；兩單元第一張字卡在網路離線模擬下重載成功，瀏覽器錯誤 0。UI JSON、截圖與 `quiz-scope-audit.json` 保存於本次任務資料目錄。

新安裝、合成舊庫更新、實際正常更新與實體手機分開記錄；沒有清網站資料、移除 service worker 或注入 DB。U7–U8 正式更新與實體手機尚未驗，因其未部署。此基底尚未包含獨立守城修補 PR27；提交新單元 PR 前須等該修補正式合併後更新基底及核對守城題庫。

本次工作開始 2026-10-12 01:27:40 UTC；01:40:09–01:52:20 UTC 插入 PR26 合併／正式發布驗收。本單元耗時另扣除該發布中斷，詳本次任務 `lv3-u7-u8-sources/timing.json` 及最後 handoff。
