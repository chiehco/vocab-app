# LV3 Unit 24 本機文字交付

基底 `643594db4ab3ca6367f837127e4b9e1ba0f83e19`，單獨新增 U24。原照位於 `C:\Users\USER\Downloads\Mobile Devices\LV3`，p249–258 已逐頁核對；本單元十頁皆為內容頁，無 Notes 頁。p258 音軌 2436–2440，最後編號 40 magnet；同張照片右側可見字母索引，未觀察到 Unit25 標題。沒有 p259 照片，亦未找到本版原目錄／版權／版本證據；本次不裁定全書單元總數、不建立 U25。照片檔名與 SHA-256 收錄在來源 JSON。

43 個獨立詞框（40 個編號頭詞），72 個補充詞、44 個用法，共 159 項。順序、冠詞、大小寫及括號照原書保留。

79 次映射共 79 個既有 officialWordId，只接受完全相同單字或既有明列 wordVariants；沒有新增正式母表詞條、義項或別名。4 個未映射頭詞保留已核原書中文，32 個未映射補充詞維持「教材補充詞；義項待核對。」。

所有教材為 source_checked_text_only／read_only；未採用圖片、完整例句、諺語例句、教材題目或 officialSenseId。已映射補充詞顯示既有字典中文，仍標記 existing_dictionary，未視為原書義項核可。

一般練習 79 詞；守城 83 詞，沿用既有功能詞及純字母拼字排除，待核補充詞不進入守城。

啟動包 words 2645 → 2702，新增既有資料列：`{"words": 57, "senses": 0, "examples": 33, "relations": 0, "morphemes": 14, "notes": 14, "examPriorities": 21, "media": 0}`。所有舊資料列完整且相同。母表 SHA-256 未變：`88fe2590c8b0a70ef48771c722255069a5d517508c9d73bd76a4cf44f991663d`。既有字典例句的啟動包匯入不代表本單元例句已核可。

測試涵蓋原書頭詞／頁序、來源拼字與用途、既有身分、空庫解析、待核線索排除與更新後所有進度表及個人群組名稱／順序保留。

重建：
```text
python scripts/build_text_unit.py --source scripts/sources/LV3Unit24.json --out src/features/direct/curriculumLV3Unit24.json
python scripts/build_sa_pack.py
npm test
npm run lint
npm run build
```

本批僅為本機可審閱交付，未推送、合併或部署。U12 p120 與 U18 p193 缺少可讀原件，分別隔離，不猜字補頁。

固定依賴：U23 `643594db4ab3ca6367f837127e4b9e1ba0f83e19`；U15 原文修正 `bdc7a445d18900cbc58817e2f2145bb2aaaa2139` 的四個檔案 blob 必須一致。p236 ballot 原書裁切義項仍待補源，未沿用為核可。
