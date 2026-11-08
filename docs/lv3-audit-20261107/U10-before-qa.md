# U10 修改前全卡檢查

U10 BEFORE 已完成，基準為 1b52bad86df69e88b1dcbbc121fa50790a7c8ba4。沒有套用 407 欄候選，尚未發布。

## 覆蓋

- 185 張教材卡：132 詞彙、53 文法。93 個一般詞全部開啟，逐一切換 319 個實際頁籤，五種頁籤類型皆覆蓋。桌面全卡／頁籤截圖 597 張，含手機尺寸與回開共 693 張。
- 295 個正式來源列與實際安裝資料完整比對：words 93、examples 133、notes 48、senses 6、media 15。完整 S+A pack 的 8 個資料集合全部列逐一相等，並核對實際安裝 meta 的 wordsHash、contentHash、generatedAt，不只查看同步旗標。
- 28 個一般詞有 active 圖，共 27 張不同圖片。所有一般卡與實際頁籤的 resolver／路徑／圖說／圖片解碼皆核對，HTTP bytes 與本機原圖完全一致。65 個無 active 圖項按規格允許保留；shortly、coarse、competence 缺原英文圖說保留。教材仍 text_only，132 個教材例句占位與37個null-ID補充未改。
- 手機尺寸為桌面瀏覽器390×844模擬，15條動態選定路徑／44個畫面，涵蓋最長文字、五種實際頁籤、null-ID、缺圖說及來源修正重點。正常捲動，固定導航保留，無橫向溢位或抽查文字中心點遮擋；不是實體手機驗收。
- 正常 Back 後重新選字義頁籤、關閉／重開同一保留profile均通過。五份完整狀態對U09最後狀態比對：9個ContentDB stores、14個ProgressDB stores與local/session storage完整保留，只允許正常導航bookmark變更。沒有建立群組、答題、寫入reward/SRS、清除或注入資料。QA session已關閉，原LV1 session仍保留。

## 來源與封存

官方144個input_paths均以一次原始讀取獨立計算raw SHA-256、CRLF轉LF SHA-256與bytes，開始／結束完全一致。9節前序鏈（U01、U02、U04、U05、media migration、U06、U07、U08、U09）及最新U09 checkpoint驗證通過，沒有apply lock或pending receipt。U03不在本輪登錄鏈中。

原13張照片/source JSON不變；U09 BEFORE／AFTER歷史封存及外部文件合計2008項開始與結束重驗均未變。U09永久來源副本未覆寫。完整來源文件另獨立凍結供expectedAfter推導，未由compiler或actual-after回填。

## 首輪檢查更正與限制

首版版本驗證腳本誤用examPriority集合名及morphemeId鍵，修正為實際schema的examPriorities／rowId；原失敗保留。圖說獨立預期首輪ownership／compete兩項取錯captionZh索引鍵，改由來源row.zh重新推導v2，93項重新比對全通過。這些是驗證腳本／期望更正，沒有改產品，也未從實際結果反填預期。

DOM逐字觀察保存3128個來源字串中的1906個可見吻合及1222個未在頁籤找到項；後者包括metadata及非顯示欄，不宣稱每個資料欄均直接可見。完整metadata的295列相等與直接畫面可見性分開記錄。

本輪沒有compile、產品seal、apply、測試／build、commit、push或部署。圖題練習、實體手機、正式PWA與完整離線情境尚未驗證。
