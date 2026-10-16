# LV3 Unit 15 本機文字交付

本批基底為 U14 本機提交 `f2e86ad2d781e97f5abc96e932425c94f2bfc651`，單獨新增 U15；前批 exact commits 與 checkout 保持固定供 QA 驗收。

## 原件與範圍

原照位於 `C:\Users\USER\Downloads\Mobile Devices\LV3`。U15 為 p153–162，十頁均有內容；首詞 dislike，末編號主詞為 p162 geography（33）。p163 為 U16 amaze 界線。11 張照片皆可完整解碼並已逐頁視讀，檔名與 SHA-256 收錄於 `scripts/sources/LV3Unit15.json`。

33 個編號主詞加 12 個未編號獨立詞框，共 45 主詞；另有 77 補充詞、46 用法，共 122 詞彙、46 用法、168 學習項目。主詞依原書順序，補充詞與用法保留頁碼與原書標記。

## 映射及待核項目

89 次映射共用 88 個既有 officialWordId；wonder 在兩處印刷出現，保留兩個出現位置並共用字卡身分。只接受完全相同單字或既有明列 wordVariants，沒有增加正式母表詞條、義項或別名。

forehead、bartender 兩個未映射獨立詞保留已核原書中文。31 個未映射補充詞維持「教材補充詞；義項待核對。」；包括冠詞保留的手機片語、a lawn mower，以及 poverty-stricken 的連字號。沒有改拼字以取得映射。

教材全部為 `source_checked_text_only`／`read_only`，沒有採用圖片、原書完整例句（含諺語例句）、教材題目或 officialSenseId。已映射補充詞使用既有字典中文，標記 `meaningSource: existing_dictionary`，不將字典主要義當作原書義項已核可。

88 個字卡身分可解析；一般練習沿用功能詞排除，共 87 詞；圍城排除待核補充詞並保留兩個已核未映射獨立詞，共 90 個拼字。

## 啟動包與保留驗證

words 從 2194 增至 2261，新增 67 個既有單字、50 筆既有字典例句、1 筆關聯、32 筆詞素、27 筆筆記及 36 筆考試優先序。senses 與 media 未增加；所有先前啟動包資料列完整且相同。沒有新增本單元例句核可。

正式母表未修改，SHA-256 仍為 `88fe2590c8b0a70ef48771c722255069a5d517508c9d73bd76a4cf44f991663d`。

`lv3Unit15Text.test.ts` 驗證原書 45 主詞順序、1–33 編號、十頁內容與下一單元界線、原補充詞拼字／用法頁碼、33 未映射項目、空庫解析全部 88 個身分、圍城線索排除，以及內容更新後所有進度表與個人群組名稱／順序保留。

## 重建

```text
python scripts/build_text_unit.py --source scripts/sources/LV3Unit15.json --out src/features/direct/curriculumLV3Unit15.json
python scripts/build_sa_pack.py
npm test
npm run lint
npm run build
```

本批為本機可審閱成果，尚未推送、合併、部署或上線。p120 與 p193 壞圖持續另列來源阻礙；完整單元照常製作，不猜字補頁。

## 原件修補

從本單元原提交 `bce2b38c031543ee792038627107e3b15700c2cb` 單獨修復：p159 相關詞與用法皆恢復 `a lawn mower`；p162 grass、geographic／geographical 的印刷標記恢復「衍」（geographical 保留 `= geographic`）。p161 data 維持「衍」。只同步來源、產製結果及定向測試，學習項目 ID、順序、正式身分及啟動包保持相同。U16 及其後批次需納入此修補。
