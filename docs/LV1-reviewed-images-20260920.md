# LV1 已核准圖片先行發布

授權：使用者「把已經弄好的圖先推上去吧」。依 vocab-unit-production 發布流程及 vocab-art-review 核准範圍處理。

## 範圍

- 434 組圖句：U01 38、U02 38、U03 22、U04–15 336。未明確核准的其餘圖句不發布。
- U01 採工作區最終審閱包（5 張 v2、修正後例句），不是生成目錄的舊 manifest。
- U03 的 hen／father／mother／sister、U07 bear、U08 death、U11 floor、U12 zoo 使用核准新版。
- U12-33 採用含 marriage 的核准新句。
- 412 組對應 401 個正式詞條；22 組無獨立 ID 的補充詞只列圖句總覽，不新增虛構詞條。
- WebP 保留原尺寸，quality=85；434 張共約 63.21 MB，按需載入，不加入首次安裝的圖片預下載。

## 接入原則

沿用 approvedCurriculum 共用登錄。圖句核准與字典義項核准分離，不以一張圖批准整列多義字；既有 LV4 圖片優先順序不改，LV1 同詞後續圖片保留在總覽。一般字卡、縮圖、複習、看圖提示共用新版來源；圖說按實際圖片路徑取用，舊圖片 targetHint 不套在新圖上。

公開入口：`wordbeast/lv1-reviewed/index.html`，按 Unit 分組。相關一般字卡也提供總覽連結。

啟動包只增加這些正式詞條及其既有公開關聯資料，895 → 1183 字，約 3.39 MiB。未重新匯入主 Excel、未修改完整 words/senses/examples、SRS、進度資料或既有單元練習。

## 可重用驗收

本批是圖句 manifest，不是含課程與練習的完整 unitN.json；技能 verify_unit.py 的完整單元契約不適用。使用專用機械檢查，不為發布圖片虛構新課程：

- `build_lv1_reviewed_images.py`：核准範圍、MD／manifest 配對、既有 U02 與四張重畫核准雜湊、正式 ID／拼字變體、圖片解碼、全量來源與發行雜湊。
- `lv1ReviewedImages.test.ts`：434 組圖片及文字雜湊、精確圖說、401 詞條啟動包覆蓋、舊單元優先、錯誤 ID／詞形不得錯配、最終 v2 與 marriage 例句。
- `verify_lv1_published_images.py`：正式站全 434 張下載、解碼、雜湊及總覽逐位元組比對。
- 本機 51 個測試檔／249 項通過，lint exit 0、build exit 0；僅既有大型 bundle 警告。
- 桌機字卡與 390×844 手機尺寸總覽目視通過，434 項／434 圖、無橫向溢出。

隔離工作目錄以 origin/main ff56ebd 為基底；原 C:/Code/vocab-app 的未追蹤檔案均保留。部署編號、正式站結果與更新流程另記於工作區發布紀錄。實體手機未實測；不可要求使用者清除網站資料更新。
