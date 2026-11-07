# LV3 U06 來源、修正範圍與保留問題

## 目前狀態

已完成本機套用、全卡 after runtime 與限定技術驗收，狀態為 reviewed_locally_with_retained_source_questions。這不是發布或實體手機驗收。

- 文字實際套用提交：e11780b4b33cfb688a3a2e96151536e0fb3936f5。144欄／56列，單次寫入6個檔案；交易20261107T203251310580Z已committed，重跑already_applied、0 writes、無新增receipt。詳見[application](U06-application.json)。
- Ready manifest canonical hash：c59130eba2f8aeae6f0012dbdf1b052f3663dbbdebfcf875d183fddfd0730581；raw byte hash：796c854059f6bade93abe7c66b60613ef13ef3a7082a42875e4ad7f2852b45ea。兩種hash不可混用。
- [Runtime報告](U06-runtime-qa.md)提交f43f3ec96d0abc305b386594726646e76a5dc65f；[技術報告](U06-validation.md)另列最終測試與歷史失敗。本文件補充下述資料儲存及序列化邊界，不改寫原封存證據。
- [Fixture歷程](U06-fixture-validation.md)為原8/9加精確修復後該完整method通過，共9個不同methods有通過證據，另TS parity 1/1；不是單次9/9。後續實際apply與最終123-method測試另行記錄。

## 範圍及精確變更數

教材p53–61，p62為筆記頁、p63為U07邊界。134教材項目含105詞彙、29用法；83映射列連至82個正式單字。22個無正式ID補充詞維持唯讀，其中20筆佔位義項已依原件補足，practically與warning不增造ID。另檢查113例句、36筆記、8個senses。

- curriculum：89欄／25列。
- words：43欄／19列，其中13欄為新增verbForms物件。
- examples：10欄／10列，僅sensePos。
- notes：2欄／2列。
- 合計144欄／56列。原15筆verbForms保留；新增13筆有直接字典證據，squirrel保留英美變體。新verbForms.status=approved，不代表改動原row.status。

原例句中英文、blank、answer、穩定ID、原status、review與practiceMode保留；未改母Excel、SRS或真實使用者學習資料。教材仍text_only/read_only，沒有新增教材圖片、例句或題目。教材義項補足與確定錯誤修正分開，不把同義詞、冷僻義或風格偏好一概判錯。

## 文字裁示與來源

koala的「袋熊」改為無尾熊；補本課或既有動詞詞性所需義項；修正誤導通用搭配及例句詞性。definitive的名詞「限定詞」有[Collins](https://www.collinsdictionary.com/dictionary/english/definitive)明確證據，保留並補詞性。reason本課只補原頁「推斷」，一般字庫的較廣動詞義另據字典。

Donkey原英文把民主黨驢象徵記為Nast於1874年引入。[Smithsonian Libraries](https://www.sil.si.edu/ondisplay/caricatures/bio_nast.htm)區分donkey 1870與elephant 1874；[Ohio State漫畫館藏](https://library.osu.edu/thomas-nast/a-live-jackass-kicking-a-dead-lion)說明驢象徵早於Nast。因此刪錯誤引入細節，保留民主黨象徵與動物義，不只替換年份或推測誤錄來源。

Envision三態初由[Oxford](https://www.oxfordlearnersdictionaries.com/definition/english/envision)核證，其後獨立讀取[Collins](https://www.collinsdictionary.com/dictionary/english/envision)明示過去式及過去分詞均為envisioned，才將sourceRef改為Collins；Oxford證據與各版archive仍保留，不冒稱原來即使用Collins。

## p56歷史來源勘誤仍保留

原頁星號實際印有「be not cut out for sth」。既有錄入漏for，來源備註又誤稱原書省略for。這是錄入錯誤，不是原書錯誤。執行時G015已恢復for；歷史source usage與source note兩筆未修改，仍獨立列勘誤，不能把保留視為認可錯誤說法。

原照片SHA256：5708b6a8ae64904b56e5912d6771122ec2aa1e273d1a358ea1b59c352b8ff900。

## 圖片及原圖說

24張可達一般卡圖片均HTTP200且成功解碼，URL與實際resolver一致。僅puppet換新圖，SHA256為8a3480a548f04c0a5fd4f89606eddab205f4656e3b3d1eaeae5ce550e9ea2bca（653992 bytes，1254×1254）；另23張原路徑與hash保留。一般卡、實際看圖quiz、重開均核對新puppet。圖片整合與六檔文字交易分開，不混入144欄計數。

24組原圖說保留；profit、constant、warn缺原英文圖說仍未補造，中文保留。koala沒有圖片；miss現圖可表一般思念義，不硬套為本課圖。教材沒有渲染圖片，不把一般圖注入教材。

## Runtime覆蓋與資料邊界

全數回開134教材、82一般卡及282個分頁，無缺漏或重複ID；保存574截圖。144個變更值均符合manifest，其中124個有DOM文字對應，20個meaningSource屬metadata。共享文字可能對應多個來源欄，不稱每欄各有獨立視覺元素。

134個curriculum資料來自瀏覽器import的JSON learningItems，不是ContentDB資料表。words、examples、notes才是starter安裝表；完整來源另經HTTP比對。這些驗證只涵蓋保留的隔離starter QA profile，不代表實測full-pack installed profile。

首次及早期中間快照仍是舊內容，保留為歷史，不列成功更新證據。之後正常背景同步安裝新資料，並以confirmed-source快照及精確比對確認；未點更新按鈕、未攔截或強制安裝，不能稱首次手動更新成功。

原confirm資料列與唯讀快照的JSON序列化一致，不是IndexedDB實體檔bytes一致。內容更新、全卡導航及responsive階段保留原非settings進度，正常導航設定另外列出。透過畫面建立U06 puppet QA群組並正常答對一題，新增quiz-image紀錄與+5獎勵，wallet5→10；schedulingApplied=false、dailyNewWordCap=15。這是明列的刻意QA增量，不稱全程總進度完全無變。重開後無重複reward，confirmed ContentDB保持不變。

390×844檢查13路徑／33視圖，另實際puppet quiz正常捲動；未見水平溢出或抽查文字遮擋。這是桌面responsive檢查，不是實體手機測試。

## 最終限定技術驗收及失敗歷史

- 同28檔Vitest最終368/368，145.12秒，無skip，timeout仍5000ms。
- Python單次8 modules共123/123 unittest methods，404.349秒；wage method內含31subcases，不加算成額外methods或混計總數。
- 最終forced全專案tsc、lint、build皆exit0。Lint有419 warnings，五份改動測試檔無warning；不宣稱整專案零警告。
- source與dist sa-pack同為f92450744cde5a7a9475130593da3f17296a519052004cfba8258cbfefbefb25，dist puppet與source一致。
- 保留首次28檔352/355、三caller精確修復後20/20、第二輪356/357及單項5.623秒timeout。unchanged單檔6/6是在同5000ms邊界下窄驗，不能取代最終全選集。
- 最後將11個獨立檔案hash驗證拆成具名cases；不改timeout、cache或coverage，才得到同28檔368/368。未再改產品或重套交易，未跑全專案完整測試suite。

144 raw/LF inputs穩定，committed manifest／scope／receipt不變，719 before及795 after檔案連同兩index全hash驗證。六份交易after hash與原備份留在application，不以後續文件狀態覆寫歷史checkpoint。

## 待核及不宣稱的範圍

- owl、visual、drastic、leopard、headquarters、visible特殊義保留待精查，不因罕見而刪。
- 36筆正式notes僅sneaker直接位於本課p55；其餘35筆的原頁來源未在本課核證。
- 29筆可選用法解說與auto可選cleanup未採用，不混成必修錯誤。
- p56兩筆source勘誤、3筆原英文圖說缺漏仍公開保留。
- 未驗full-pack installed、實體手機、offline matrix、SRS scheduling、arena或forced daily selection；一個正常看圖quiz不代表所有練習模式皆通過。
- LV3批次尚未發布，未做正式站版本驗收。收尾只更新review、application與ledger的U06，不改原證據、候選、產品或chain，U07不動。
