# LV5 U15-16 文字教材候選

從現行main的獨立LV5分支接續。本批base `0bbb8af6fcf97b704c407ae46ccfca2d82518bbb`；沒有帶入未合併LV4單元鏈。既有LV3和LV4 U17–U20逐一保留Git物件。

|單元|正文|編號／無編號主詞|相關詞次|詞彙／用法|完整群組／正式ID去重|未映射詞次|
|---|---|---:|---:|---:|---:|---:|
|U15|p132–141|36／7|71|114／57|171／73|40|
|U16|p142–151|39／4|65|108／62|170／75|33|

starter 2712→2826字，新增114個既有正式詞；原有words、senses、examples、relations、morphemes、notes、examPriorities、media的全部列逐欄保留。正式字庫／meta、母表、SRS、進度schema與獎勵、lock及PWA產品設定未改。

來源只採逐頁完整照片核實的主詞、無編號独立詞框、相關詞、星號註詞、印刷用法與中文。所有正式映射為既有exact唯一且安全的wordId，未映射仍可讀pending；不建立wordId／senseId。此包為text_only／read_only，無採用圖片、例句、圖說或教材題。一般正式卡練習／守城沿用既有資料和規則。

使用可重用build_text_unit產生器保留教材補充詞的印刷POS／中文、用法說明、revision與穩定ID；第一批只帶入必要的generic產生器能力及LV5 starter範圍，不帶LV4文字候選資料。每批只生成當批來源／包及重新計算整合後啟動包。

工程與隔離新安裝／正常舊資料更新／答題／守城／離線的exact SHA最終證據由交接檔記錄；本文件不預先宣稱尚未完成的驗收。

證據根：`C:\Users\USER\Documents\Codex\2026-10-14\task-4\lv5-evidence`。本批來源與保護物件audit：`batch8-content-audit.json`；工程log、fresh QA及正常PWA更新13表逐欄比對均由`batch8-handoff.json`彙整。未自行建立PR、合併或部署；p18/156/180/196和裁切的Unit24起頁碼仍依全冊界頁表隔離pending。
