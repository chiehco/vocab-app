# LV3 Unit 22 本機文字交付

基底 `6a2e88a134b4994fc8a34db300ed98d66edd1484`，單獨新增 U22。原照位於 `C:\Users\USER\Downloads\Mobile Devices\LV3`，p229–238 已逐頁核對；下一單元界線 p239 為 U23 microphone。Notes 頁：None。照片檔名與 SHA-256 收錄在來源 JSON。

41 個獨立詞框（34 個編號頭詞），71 個補充詞、48 個用法，共 160 項。順序、冠詞、大小寫及括號照原書保留。

89 次映射共 88 個既有 officialWordId，只接受完全相同單字或既有明列 wordVariants；沒有新增正式母表詞條、義項或別名。1 個未映射頭詞保留已核原書中文，22 個未映射補充詞維持「教材補充詞；義項待核對。」。

所有教材為 source_checked_text_only／read_only；未採用圖片、完整例句、諺語例句、教材題目或 officialSenseId。已映射補充詞顯示既有字典中文，仍標記 existing_dictionary，未視為原書義項核可。

一般練習 88 詞；守城 90 詞，沿用既有功能詞及純字母拼字排除，待核補充詞不進入守城。

啟動包 words 2523 → 2587，新增既有資料列：`{"words": 64, "senses": 0, "examples": 58, "relations": 0, "morphemes": 27, "notes": 35, "examPriorities": 30, "media": 0}`。所有舊資料列完整且相同。母表 SHA-256 未變：`88fe2590c8b0a70ef48771c722255069a5d517508c9d73bd76a4cf44f991663d`。既有字典例句的啟動包匯入不代表本單元例句已核可。

測試涵蓋原書頭詞／頁序、來源拼字與用途、既有身分、空庫解析、待核線索排除與更新後所有進度表及個人群組名稱／順序保留。

重建：
```text
python scripts/build_text_unit.py --source scripts/sources/LV3Unit22.json --out src/features/direct/curriculumLV3Unit22.json
python scripts/build_sa_pack.py
npm test
npm run lint
npm run build
```

本批僅為本機可審閱交付，未推送、合併或部署。U12 p120 與 U18 p193 缺少可讀原件，分別隔離，不猜字補頁。

來源限制：p236 的 ballot 義項部分裁切；本批只保留可見英文拼字與星號，未採用被裁切的原書中文或完整例句。已映射時顯示既有字典中文，仍為 existing_dictionary，不代表原書義項核可。

原書明列的 dinner、nonsense、marvellous 均保留為補充拼字；gasoline／gas 使用既有同一身分 W002358。未新增別名。
