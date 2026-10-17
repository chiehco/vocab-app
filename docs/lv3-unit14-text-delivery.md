# LV3 Unit 14 本機文字交付

本批基底為 U13 本機提交 `25558d765339d50db3652f83b1f6685eaa0bc8f5`，只新增 U14。U11、U13 的 checkout 與 exact commits 保持固定供獨立 QA 驗收。

## 原件範圍

原照位於 `C:\Users\USER\Downloads\Mobile Devices\LV3`。U14 為 p143–152，內容實際為 p143–151；p152 是空白 Notes，p153 為 U15 dislike 界線。這 11 張照片皆可完整解碼並已逐頁視讀，檔名、頁型及 SHA-256 收錄於 `scripts/sources/LV3Unit14.json`。

首詞 swear，末編號主詞為 p151 的 brunch（26）。26 個編號主詞加 18 個未編號獨立詞框，共 44 主詞；另有 48 補充詞、53 用法。共 92 詞彙、53 用法、145 學習項目。沒有採用固定主詞數或固定頁數的假設。

## 映射與待核項目

68 次映射均對應不同的 68 個既有 officialWordId；僅依完全相同單字或既有明列 wordVariants 映射。正式母表詞條、義項與別名未增加。

casually、doubtless 兩個未映射獨立詞框保留已核原書中文。22 個未映射補充詞維持「教材補充詞；義項待核對。」；a disk drive、a rice cooker 的冠詞及 air-conditioner 的連字號保留原樣，未改成另一詞形以取得映射。

所有教材項目為 `source_checked_text_only`／`read_only`，未採用圖片、原書完整例句、諺語例句、教材題目或 officialSenseId。已映射補充詞的中文來自既有字典，標記 `meaningSource: existing_dictionary`，沒有將其主要義當作原書義項已核可。

68 個身分可在既有一般字卡解析。通用練習沿用功能詞排除，共 67 詞；圍城沿用待核線索排除，包含兩個已核未映射獨立詞，共 70 個拼字。

## 啟動資料與保留驗證

啟動包 words 從 2145 增至 2194，新增 49 個既有單字、46 筆既有字典例句、20 筆詞素、5 筆筆記及 26 筆考試優先序。senses、relations、media 未增加。所有先前啟動包資料列完整且相同；沒有新增本單元例句核可。

正式母表未修改，SHA-256 仍為 `88fe2590c8b0a70ef48771c722255069a5d517508c9d73bd76a4cf44f991663d`。

`lv3Unit14Text.test.ts` 驗證原書 44 主詞順序、1–26 編號、九頁內容／Notes／下一單元界線、原補充詞拼字與用法頁碼、24 個未映射項目、空庫解析全部 68 個身分、圍城線索排除，以及更新後所有進度表與個人群組名稱／順序保留。

## 重建

```text
python scripts/build_text_unit.py --source scripts/sources/LV3Unit14.json --out src/features/direct/curriculumLV3Unit14.json
python scripts/build_sa_pack.py
npm test
npm run lint
npm run build
```

此批是本機可審閱成果，尚未推送、合併、部署或上線。U12 p120 與後續 p193 的損壞原照分開記錄，沒有猜字補頁；缺頁不阻止來源完整單元繼續製作。
