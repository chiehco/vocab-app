# LV3 Unit 16 本機文字交付

本批基底為 U15 本機提交 `bce2b38c031543ee792038627107e3b15700c2cb`，單獨新增 U16；前批 exact commits 與 checkout 保持固定供 QA 驗收。

## 原件與範圍

原照位於 `C:\Users\USER\Downloads\Mobile Devices\LV3`。U16 為 p163–174：p163–173 十一頁內容，p174 為空白 Notes；首詞 amaze，末編號主詞為 p173 hunger（30）。p175 為 U17 knit 界線。13 張照片皆可完整解碼並已逐頁視讀，檔名與 SHA-256 收錄於 `scripts/sources/LV3Unit16.json`。

30 個編號主詞加 15 個未編號獨立詞框，共 45 主詞；另有 89 補充詞、58 用法，共 134 詞彙、58 用法、192 學習項目。主詞依原書順序，補充詞與用法保留頁碼與原書標記，未以每單元固定數量推算內容。

## 映射及待核項目

96 次映射共用 95 個既有 officialWordId；surprise 在 p163 兩處印刷出現，保留出現位置並共用字卡身分。只接受完全相同單字或既有明列 wordVariants，沒有增加正式母表詞條、義項或別名。

amazed、amazing、charming、meaningless、living 五個未映射獨立詞保留已核原書中文。33 個未映射補充詞維持「教材補充詞；義項待核對。」；包括原書冠詞／大小寫保留的 the Statue of Liberty、a tearjerker、a blockbuster、Siamese twins、X-ray。沒有改拼字以取得映射。

教材全部為 `source_checked_text_only`／`read_only`，沒有採用圖片、原書完整例句（含諺語例句）、教材題目或 officialSenseId。已映射補充詞使用既有字典中文，標記 `meaningSource: existing_dictionary`，不將字典主要義當作原書義項已核可。

95 個字卡身分可解析；一般練習沿用功能詞排除，共 94 詞；圍城排除待核補充詞並保留五個已核未映射獨立詞，共 100 個拼字。

## 啟動包與保留驗證

words 從 2261 增至 2324，新增 63 個既有單字、64 筆既有字典例句、3 筆關聯、40 筆詞素、16 筆筆記及 32 筆考試優先序。senses 與 media 未增加；所有先前啟動包資料列完整且相同。沒有新增本單元例句核可。

正式母表未修改，SHA-256 仍為 `88fe2590c8b0a70ef48771c722255069a5d517508c9d73bd76a4cf44f991663d`。

`lv3Unit16Text.test.ts` 驗證原書 45 主詞順序、1–30 編號、十一頁內容／Notes／下一單元界線、原補充詞拼字／用法頁碼、38 未映射項目、空庫解析全部 95 個身分、圍城線索排除，以及內容更新後所有進度表與個人群組名稱／順序保留。

## 重建

```text
python scripts/build_text_unit.py --source scripts/sources/LV3Unit16.json --out src/features/direct/curriculumLV3Unit16.json
python scripts/build_sa_pack.py
npm test
npm run lint
npm run build
```

本批為本機可審閱成果，尚未推送、合併、部署或上線。p120 與 p193 壞圖持續另列來源阻礙；完整單元照常製作，不猜字補頁。
