# LV3 U05 本機執行期驗收

狀態：完整文字 after 與同一 QA profile 關閉／重開已完成；初次發現的 wage(s) 三態 UI 缺陷經精確修正及窄範圍重驗通過。既有 6 張 starter 圖說缺口仍未修。尚未發布，編譯／完整測試另行驗收。

## 版本與同步

- 文字套用提交：8f830a1e98ecc5cd2922842b45a2762e794b06b2。
- U05 ready manifest hash：f7ad8f7a18f1b52eeb0be70ae233648de464032ed4819ad7f42cc9f6dc84de77。
- 套用紀錄為 56 列、146 欄，6 個產品檔案寫入；備份核對、138 個未變輸入與重跑零寫入已有獨立套用證據。既有暫存 fixture 結果為 9 tests、0 failures/errors；本次瀏覽器驗收未執行編譯或測試。
- 重開保留的 U05 QA profile 時，第一次讀取的 installed meta 仍為 U04 版本。正常啟動後，於 2026-11-07T17:21:35Z 觀察到 installed words/content hash 與現行 HTTP sa-pack 相同。未強制安裝、注入儲存或按更新按鈕；不把初始舊資料窗口描述為即時更新成功。
- 實際 HTTP meta SHA256：442c1793781fc2986ddad42bb056f99590cec823430e09ec0753315185f8176c；sa-pack SHA256：28874ebee1562eae9cc1fc71534d87e470094cad268e2af3f43a209724bf8add。均為 HTTP 200，與套用紀錄吻合。

## 全量覆蓋與資料

- 158 教材卡：112 詞彙、46 文法；92 對應列、90 唯一一般字卡，20 未映射詞仍無虛構正式 ID。
- 逐一回開全部 158 教材、90 一般卡與 318 實際一般卡分頁。ID 無缺漏、無重複，分頁無漏抓；before/after 全量遍歷各 566 張截圖，另保留響應式與導覽截圖。
- 146 個修改欄位的 runtime exact-value 全部相符。實際 starter DB 與 full HTTP 分開驗：words 5779／6090、examples 7436／7871、notes 4111／4290；教材 158。各資料集的 ID、列數及逐列 hash 全部相符，變更範圍外無差異。
- DOM 值出現核對為 125/126；另 20 個 meaningSource 為 runtime metadata，不宣稱各自顯示。值出現只證明該值可見，並非同值來源欄位可各自獨立辨識。
- U05 維持 text_only/read_only、questions 為空，教材沒有新增 authored image/example 欄位。全量 7871 例句的原英中句、答案與填空文字相對 before 完全不變，正式映射不變。

## 圖片與既有圖說缺口

- 33 張實際圖片全部 HTTP 200、可解碼，與實際 resolver 對應一致。
- 只有 confirm（W002185）換成 wordbeast/lv3-reviewed/W002185-confirm-v2-99268c449270.webp；SHA256 為 99268c4492700f1d99c51c8b03143dd1aebf704f45451feb90202a4360f29d2d，1254×1254、57484 bytes。其餘 32 張路徑及原始位元組 hash 不變。
- 27 張可見中英圖說與 before 一致；decade、significant、detect、source、capacity、lengthen 這 6 張在 starter profile 仍沒有圖說，與 before 一致。不能宣稱 33 張圖說全過，也未補翻譯或繞過品質要求。
- 原因：build_sa_pack.py 第 31–33 行建立最初考頻 S/A selected_names；教材加入 selected_word_ids 後，第 102 行媒體仍只依原 selected_names 篩選。這 6 詞的考頻為 B/C/Z，與圖片 A 級不同；full media 有 approved 中文列，但 starter pack 未收錄。
- 靜態渲染條件允許只有中文圖說：wordDisplay.ts 第 5–7 行、illustrationCaptions.ts 第 6–8 行與 StudyIllustration.tsx 第 21–32 行。不宣稱曾建立 full profile 實測。

## 響應式、導覽與保存

- 390×844 桌面響應式模擬，共 10 路線、26 分頁視圖，包含 appointment／engage／engagement／closet 長義、wage(s)、confirm 與教材長文字。
- 保留固定導覽，以正常捲動檢查到底與文字可見性；無水平溢位、遮擋旗標或無法到達底部。這不是實體手機測試。
- 教材 engaged → 下一張 appointment → 上一張 engaged 成功回到相同內容與 URL。
- 完整進度表在 close/reopen 前後完全一致，保存的最後位置還原成功；正常重新導覽只更新 bookmark 時間。整輪非 settings 進度表無變化。
- 此 profile 初始 SRS／獎勵／練習表為空；未注入紀錄，因此不涵蓋真實既有使用者 SRS migration、離線或測驗正確性。
- after 階段獨立擷取的 144 個 pipeline inputs 在本輪驗收結束時零變更。

## 初次 UI 缺陷與證據保留（已窄修重驗）

W002976 字頭仍正確為 wage(s)，runtime verbForms 正確為 wage / waged / waged，但字卡顯示「動詞三態尚未收錄」。meaningRecords.ts 第 40–44 行要求 base 必須等於完整 word，導致 wage 與 wage(s) 不相等；RecordedMeanings.tsx 因而顯示缺資料文案。不能改成假 base wage(s) 以通過。

原始全遍歷、after-first-failure-wage-acceptance-summary.json、wage 字卡 DOM、桌面及 390×844 截圖均保留。若進行精確例外修正，應另外記錄受影響頁與安全邊界重驗，不覆寫第一次失敗。現有瀏覽器已關閉並保留同一 QA profile。

原始本機證據：output/playwright/lv3-u05/ 下的 before/after 批次、runtime、HTTP 原圖位元組、逐產物雜湊、完整進度狀態與重開紀錄。這些是本機驗收附件，不代表已發布或線上可下載。


## wage 精確修正的後續窄驗

修正提交：38da992d7ad5b702eddc3a9fe2492df13075cb45。只重新驗證受影響 wage(s) 與兩個非動詞控制卡，沒有重做或覆寫原本 158／90／318 的完整遍歷。

- 原完整 after 的 DOM 值出現結果為 125/126；本次補驗先前缺少的 verbForms 1/1 通過。20 個 meaningSource 仍是 runtime metadata，不改稱 UI 可見。
- 同一保留 profile 的 wage 字頭仍為 wage(s)。字卡與字義頁的實際三個 dd 值皆為 wage、waged、waged，無缺三態文案；搭配頁不額外虛構三態區塊。
- 390×844 正常捲動檢查全部 3 個 wage tabs，無水平溢位或文字遮擋，均可到達底部；三態在字卡與字義頁可見。
- 關閉並重新開啟同一 profile 後，3 個 wage tabs 再驗一致。關閉／重開前後完整進度表相同，整輪非 settings 表無改變。
- previous（形容詞，4 tabs）與 appointment（名詞，5 tabs）維持無三態，也未新增錯誤的缺三態提示。
- 窄驗時 144 個 pipeline inputs 仍與文字 after 擷取值相同；原 748 個 after 證據的 bytes hash 全部不變，初次失敗 summary、完整 screenshots 與 DOM 未覆寫。
- 新證據獨立保存在 after-wage-fix-*；Chrome 已關閉。實體手機、真實既有 SRS migration、離線與正式站仍不在本次範圍。
