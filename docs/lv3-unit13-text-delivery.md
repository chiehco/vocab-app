# LV3 Unit 13 本機文字交付

本批從 U11 本機可審閱 commit `5bb84de3934212a96dc617f7636e9e763d4f5195` 延伸，單獨新增 U13。U11 checkout 保持原提交，供獨立 QA 同時驗收；U12 尚未接入。

## 原件與逐頁範圍

原照位於 `C:\Users\USER\Downloads\Mobile Devices\LV3`。實際 U13 為 p131–142，首詞 cast，末編號主詞為 p142 的 bookcase（33）。p143 為 U14 swear，作為下一單元界線。13 張原照與界線照片皆可完整解碼且已逐頁視讀，檔名與 SHA-256 收錄於 `scripts/sources/LV3Unit13.json`。

舊 MD 記為 p129–138，與原書不符；未以舊 MD 的範圍或例句作核可依據。

33 個編號主詞加 12 個未編號獨立詞框，共 45 主詞；另有 67 補充詞與 73 用法標記。教材共 112 詞彙、73 用法、185 學習項目。主詞照原書順序保留，補充詞／用法保留原頁碼與標記。

## 映射與待核內容

93 次映射共用 89 個既有 officialWordId。mankind／humankind 與 bridegroom／groom 依既有明列 wordVariants 共用身分；yell 與 bucket 在原書不同位置再出現，保留每個印刷出現位置。沒有新增正式字典詞條、義項或別名。

2 個未映射獨立主詞 pail、adventurous 保留已核原書中文。17 個未映射補充詞維持「教材補充詞；義項待核對。」；包含原拼字 risk-taking，以及原片語 jet lag、human being、designer purse，未改寫為另一詞形。

所有教材項目均為 `source_checked_text_only`／`read_only`。沒有採用圖片、原書完整例句（含 p137、p139 的諺語例句）、例句題目或 officialSenseId。補充詞若已映射，其中文來自既有字典，並標示 `meaningSource: existing_dictionary`；不把字典主要義當作原書補充詞義已核可。

既有一般字卡與通用練習可解析 89 個映射身分；圍城沿用既有規則排除待核補充詞，保留兩個已核未映射獨立主詞，共 93 個可玩拼字。

## 啟動包與保留驗證

words 從 2083 增至 2145，共新增 62 個既有單字、66 筆既有字典例句、18 筆詞素、21 筆筆記及 35 筆考試優先序。senses、relations 與 media 未增加；所有先前啟動包資料列相同且完整保留。沒有新增本單元例句核可。

正式母表未修改，SHA-256 仍為 `88fe2590c8b0a70ef48771c722255069a5d517508c9d73bd76a4cf44f991663d`。

`lv3Unit13Text.test.ts` 驗證 45 主詞原書順序、1–33 編號、p131–143 界線、補充詞／用法頁碼、既有字典身分、19 未映射項目、空庫啟動包解析 89 個身分、圍城線索排除，以及內容更新後所有進度表與個人群組名稱／順序保留。

## 重建

```text
python scripts/build_text_unit.py --source scripts/sources/LV3Unit13.json --out src/features/direct/curriculumLV3Unit13.json
python scripts/build_sa_pack.py
npm test
npm run lint
npm run build
```

此文件描述本機可審閱成果；本批尚未推送、合併、部署或上線。U12 p120 的原檔損壞阻塞另記於 U11 交付文件及獨立審閱目錄，沒有以 U13 交付掩蓋 U12 的缺頁。
