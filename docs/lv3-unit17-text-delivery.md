# LV3 Unit 17 本機文字交付

本批基底為 U16 本機提交 `49a52099b498f099543722bf873522849ae7ff2d`，單獨新增 U17；前批 exact commits 與 checkout 保持固定供 QA 驗收。

## 原件與範圍

原照位於 `C:\Users\USER\Downloads\Mobile Devices\LV3`。U17 為 p175–186：p175–185 十一頁內容，p186 為空白 Notes；首詞 knit，末編號主詞為 p185 jeep（33）。p187 為 U18 outdoor 界線。13 張照片皆可完整解碼並已逐頁視讀，檔名與 SHA-256 收錄於 `scripts/sources/LV3Unit17.json`。

33 個編號主詞加 12 個未編號獨立詞框，共 45 主詞；另有 65 補充詞、55 用法，共 110 詞彙、55 用法、165 學習項目。主詞依原書順序，補充詞與用法保留頁碼及印刷標記。

## 映射及待核項目

78 次映射共用 76 個既有 officialWordId；delay 在 p176、p177 各出現一次，mathematics 與 math 依既有明列 wordVariants 映射到同一個 mathematics/math 字卡。只接受完全相同單字或既有明列變體，沒有增加正式母表詞條、義項或別名。

afterward(s)、earplug、belly、regretful、regrettable 五個未映射獨立詞保留已核原書中文。`afterward(s)` 保留完整印刷寫法，未拆開、改名或猜測別名。27 個未映射補充詞維持「教材補充詞；義項待核對。」；包括保留冠詞的 the Arctic、the Antarctic、a tape recorder、a flight data recorder、a black box，以及 user-friendly。

教材全部為 `source_checked_text_only`／`read_only`，沒有採用圖片、原書完整例句（含諺語例句）、教材題目或 officialSenseId。已映射補充詞使用既有字典中文，標記 `meaningSource: existing_dictionary`，不將字典主要義當作原書義項已核可。

76 個字卡身分可解析；一般練習共 76 詞。圍城排除待核補充詞，保留四個已核 ASCII 未映射獨立詞；`afterward(s)` 因不符合既有純字母拼字規則不進入守城，共 81 個拼字。

## 啟動包與保留驗證

words 從 2324 增至 2379，新增 55 個既有單字、36 筆既有字典例句、7 筆詞素、10 筆筆記及 28 筆考試優先序。senses、relations 與 media 未增加；所有先前啟動包資料列完整且相同。沒有新增本單元例句核可。

正式母表未修改，SHA-256 仍為 `88fe2590c8b0a70ef48771c722255069a5d517508c9d73bd76a4cf44f991663d`。

`lv3Unit17Text.test.ts` 驗證原書 45 主詞順序、1–33 編號、十一頁內容／Notes／下一單元界線、原補充詞拼字／用法頁碼、32 未映射項目、空庫解析全部 76 個身分、圍城線索與拼字排除，以及內容更新後所有進度表與個人群組名稱／順序保留。

## 重建

```text
python scripts/build_text_unit.py --source scripts/sources/LV3Unit17.json --out src/features/direct/curriculumLV3Unit17.json
python scripts/build_sa_pack.py
npm test
npm run lint
npm run build
```

本批為本機可審閱成果，尚未推送、合併、部署或上線。U12 p120 與 U18 p193 的壞圖分別隔離；U18 已確認為 p187–196，下一完整單元 U19 為 p197–206，p207 為 U20 界線。未猜字補頁。
