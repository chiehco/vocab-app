# 逐單元全面檢查與修正

基準 main：`29cfc684d7a11b07f09988c478d30358830f1951`；分支：`content/unit-audit-20261105`。

## 實際範圍與順序

依本機App實際textbookUnits建立MASTER-INVENTORY.json：146個單元、19,726個教材項目，其中127個curriculumUnits，另外19個LV1已發布圖片子集。母清單同時列出source-art/LV1的1,736組保留原稿與1,010組未發布原稿。盤點不算目視通過；原稿與已發布、文字單元分開。U16–U21是text_only，其無圖不能直接判成失效圖，也不因設計如此就標語文已檢。

U01原稿38／已發布38；U02原稿38／已發布38；U03原稿46／已發布22／未發布24。此前22張的U03結論只對已發布子集成立。

|檢查來源|U01|U02|U03|
|---|---:|---:|---:|
|已發布單元卡實際開啟並目視|38|38|22|
|額外未發布原稿目視|0|0|24|
|一般卡修改後重開|38|38次／37詞|46詞|
|去重正式例句核對|206|197|185|
|詞性修正|15|11|8|
|draft例句實際核對後reviewed|3|6|2|
|needs_check義項實際核對後reviewed|19|12|10|
|補入一般卡缺圖|0|0|15|
|修正一般卡圖句對應|0|0|3|

## U03本地修復與驗收

24份未發布原稿全數看過原PNG與caption；46個一般詞卡重新開啟，185個原例句、中英翻譯、填空及英英解釋均逐筆核對。15張一般卡確實無圖，已在獨立auditedWordIllustrations登錄精確原稿圖句，另修window的無雪圖配下雪例句、egg的3顆蛋圖配5顆蛋句、bus的等車圖說並列下車句問題。所有原正式例句仍逐字保留在字義頁；原圖片與原稿未刪改。18張版本化WebP原尺寸1254×1254、quality85，18組實際重開路徑與中英圖說全符合，24一般卡81句重開零差異。

沒有將24原稿加入未發布教材單元或lv1ReviewedImages群組，也沒有部署。圖像合格不等於整個多義字通過。13個原draft摘要、cat／grandfather來源疑點、next to詞性分類邊界、未拆義與尚未收錄的動詞三態等均在逐卡ledger保留。

U03另修love動詞、pen撰寫動詞，修banana截斷英英解釋、cute破損中文與缺常用英英義、pen／only漏義；本單元合計24筆明確列修正。累計91筆實際改列已在App IndexedDB唯讀重讀，欄位與完整資料雜湊符合。完整字典安裝前後14張隔離瀏覽器進度表完全相同。

## 未解圖片限制

U02 elephant原尺寸確認兩個多鼻狀灰部件；內建修圖Windows路徑解析失敗：AbsolutePathBuf deserialized without a base path。U02 sun原圖為日光浴，原單元句為日出；父側新圖Library已保存，但正式材料化helper缺os.setxattr，目的地無檔，尚未接入。兩張均未標通過。精確原圖、hash、新圖Library ID、修正草稿見image-repair-drafts.json。舊sunbathing圖保留供sun himself語境，不把另一例句自動標成配圖完成。

## 可回復紀錄與保護

每筆before／after、依據及完整原列見各patches.json與receipts/。unitAudit.testSupport.ts先核對精確新欄位，再逐筆反向還原允許修改；舊歷史payloadHash完全保留，未改欄位仍必須符合原基準。meta的現行wordsHash與contentHash另外由完整檔案重算驗證。圖片測試逐一核對18張資產hash、正式ID、精確圖說及錯誤ID拒配，並斷言未發布單元清單仍726／U03 22。

驗收原始檔與截圖保存在output/及output/playwright/unit-audit/；單張完整UI證據路徑在ledger。相關4檔17測試曾通過；最後18圖的精確補測、lint與最終build狀態見validation/。最初全套5秒逾時、30秒全套中斷原始證據保留，未宣稱完整suite通過。

## 上一 checkpoint 位置

U03的原始下一卡為U04-01；最新位置見下列U04 checkpoint。

## LV1 Unit 04 checkpoint

完整原稿36張，已發布子集5張，36張原稿與19張既有一般卡圖片均已實際目視。修正後重新開啟36張一般卡及5張單元卡，198原例句／英中翻譯、英英解釋及填空均零差異。17張實際缺圖已補，else水果選擇圖配會議遲到句、red紅色畫筆角色配派對紅洋裝句兩組已修成原稿的完整圖句；19組新資產路徑與中英圖說重開全符合。原圖與原例句保留，31未發布教材原稿維持未發布。

38筆實際列修正：6筆明確詞性錯置、7筆draft與5筆needs_check例句、9筆needs_check與1筆draft義項、for整詞needs_check，以及9筆字義欄位修復。for含兩個for的例句填空是第一個for lunch，保留prep.；clock襪側繡花真義保留，沒有因罕見刪除。television原稿NOID使用既有W000863映射，移除非本詞電視義的轉移向量混入，完整舊列可還原；未虛構編號。累計129改列已在完整字典唯讀重讀符合，14進度表仍完全相同。

測試原4檔16過1失敗已定位為目視證據描述字串格式；統一真實紀錄格式並保留原actually viewed original斷言後針對性重跑，結果見validation/u04-art-final-test.txt，原失敗證據保留。其他3檔15項已通過；lint與build通過。未宣稱完整suite通過。

可回復的前一提交：a0102dde197b6baabc26a23666736464d05f0f25（U01–U03，71檔）。U04完整before/after、逐卡目視與重開證據在LV1-U04-patches.json、receipts/、LV1-U04-original-image-review.json與LV1-U04-ledger.json。sun與elephant舊限制保持未完成。

下一張：LV1-U05-01 give；完整原稿32張、已發布子集13張。其他未檢卡仍not_checked。

## U02 sunrise follow-up

U02-32 sunrise replacement verified by exact SHA-256, 1254×1254 dimensions and actual compressed pixels; both the unit card and general card were reopened and visually checked. The original sunrise sentence and all six dictionary examples are unchanged. The old sunbathing image is retained; the other sun-himself example is not automatically marked as paired. U02 now has 37 consistent image/caption pairs and one remaining elephant anatomy repair blocked by the image-edit input limitation. See LV1-U02-sunrise-review.json for exact before/after paths, hashes, approval history and UI evidence.

## LV1 Unit 05 checkpoint

完整原稿32組、已發布13組；32張原始圖片與27張既有一般卡圖片已逐張實際目視，13張單元卡實際開啟，30個有正式ID的一般詞卡修改後重新開啟，171筆例句／翻譯／填空核對零差異。3張一般卡缺圖（worker、sorry、tell）已補，eat的吃飯圖配腐蝕例句已修為原稿的上學途中早餐圖句，原腐蝕例句保留。4張最終重開截圖均已目視。19份未發布教材原稿仍未發布；useless與coworker沒有正式字庫ID，分開記錄，未造號。

122筆列修改：4個明確單一詞性錯誤（live concert、keep still、feel well、a cold drink），另74個複合標記精準化及78筆用法提示、10筆draft例句與23筆needs_check義項核對後更新、11筆文字定義修復。所有原例句保持原意與原字串，詞頭多詞性不縮減；greats及real find名詞義均有詞典支持，保留。even既有考題來源聲稱未核實，該義項draft保留。

30張一般卡重開後圖片皆可顯示；累計251改列與內容hash從實際IndexedDB讀回全相符。第一次載入檢查因頁面導覽中斷，未推定成功；先核對實際保存內容，再作穩定的冪等檢查，14進度表完全不變。相關5檔21測試、lint、build通過；未宣稱全套suite通過。

前次對外checkpoint：47958136d6df58dfbe9435ce5e666a1c98caa15d，已核實遠端獨立分支同SHA，含U01–U04與sun修復。U05實際before/after與重開證據見本單元ledger、patches、receipt及validation。下一張：LV1-U06-01 most，完整原稿51組、已發布子集23組。

全App的19,726為教材項目盤點：13,101個vocabulary項目、5,899個grammar項目、726組已發布LV1圖句。它不是已核實字卡總數，亦不代表均已檢查；未檢項目仍not_checked。
