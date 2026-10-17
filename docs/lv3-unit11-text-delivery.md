# LV3 Unit 11 文字教材交付

基底為 `03cebe42444eef66e26a7f7d1e8be83979ca32c6`。本批新增 U11 的教材入口、原書文字與既有字卡映射；圖片、教材例句及教材題目尚未採用。本批沒有 U12 接入。

## 原件與範圍

- 原件：`C:\Users\USER\Downloads\Mobile Devices\LV3` 的書頁照片。
- U11：p107–118，首詞 forever；編號主詞 1–34，末編號 subtract，之後仍有 minus、multiply 的獨立詞框。
- 下一單元界線：p119 為 U12 capture。13 張來源／界線照片的檔名及 SHA-256 收錄於 `scripts/sources/LV3Unit11.json`。
- 已逐頁視讀 12 頁內容及下一單元界線；舊 MD 不是本次教材範圍或例句核可證據。
- 45 個獨立主詞框、92 個原書補充詞、75 個原書用法標記，共 212 個學習項目。主詞先依原書順序呈現，再依頁序列補充詞。

## 映射與待核項目

113 個映射出現次數共用 112 個既有 officialWordId；只接受既有字典的完全相同單字或明列的 wordVariants。沒有增詞、增義項或建立別名。

4 個未映射獨立主詞 temporarily、steadily、satisfactorily、inefficient 保留已核原書中文。20 個未映射補充詞維持「教材補充詞；義項待核對。」；每筆均保留頁碼與原書標記。

教材項目全部是 `source_checked_text_only`／`read_only`。沒有 illustration、originalExample、officialSenseId 或教材 questions。已映射單字仍可經既有通用字卡與練習入口使用；圍城沿用既有規則排除待核補充詞線索。

## 啟動資料

`build_sa_pack.py` 沿用既有策略收錄此單元的既有映射，words 從 1995 增至 2083。新增 88 個字、94 筆既有字典例句、1 筆關聯、70 筆詞素、42 筆筆記及 56 筆考試優先序；senses 與 media 未增加。這些均取自原有公開資料檔，沒有新增本單元例句核可。所有先前啟動包資料列仍完整且內容相同。

正式母表 SHA-256 為 `88fe2590c8b0a70ef48771c722255069a5d517508c9d73bd76a4cf44f991663d`，本次未修改。其他既有單元及圖片採用檔未變更。

## 重建與驗證

```text
python scripts/build_text_unit.py --source scripts/sources/LV3Unit11.json --out src/features/direct/curriculumLV3Unit11.json
python scripts/build_sa_pack.py
npm test
python -m unittest discover -s scripts -p test_*.py
npm run lint
npm run typecheck
npm run build
```

`lv3Unit11Text.test.ts` 驗證原書主詞順序、編號及頁面界線、補充詞與用法頁碼、既有字典身分、24 個未映射項目、空庫安裝解析 112 個映射、圍城待核線索排除，以及更新後所有進度表／個人群組名稱與順序保留。

## U12 來源阻塞

U12 原書範圍為 p119–130；舊 MD 漏 p129–130 的 bind、dishonest、operation、crane、basement、bet，這些原照已確認可讀。

目前只有 p120 無法完整視讀：原檔 `20260815_101243.jpg`（SHA-256 `bc9c4f4948bb029c5b10884a11400b1a9f8e442df439a2ba373b529aa939641f`）不能由正常 JPEG 解碼器讀取。內嵌縮圖存在，但不足以逐項核清中文與補充詞；嘗試讀取原影像資料只能得到局部畫面。未修改原檔，未用猜測或舊 MD 補詞。

U12 其餘 11 頁的逐頁轉錄保留於本任務獨立審閱目錄，未生成或接入產品。需要一份可完整視讀的 p120 原件後才能完成 U12。

本文件描述本機可審閱成果；提交或通過本機測試不代表已合併、部署或上線。
