# LV3 U09 來源審閱摘要

本單元已完成來源審閱及本機 394 欄修正。套用結果見 [application](U09-application.json)、[交易驗證](U09-fixture-validation.md) 與 [精確資料契約](U09-guard-validation.md)。U09 文字修正後的技術回歸及瀏覽器 AFTER 仍待驗收，尚未發布。原來源階段快照、原版與歷次候選完整保留於本機。

## 範圍與來源

逐列核對 108 個教材詞、63 個文法項目、81 個一般詞、115 個例句、30 個筆記及 13 個義項。實際修正共 394 欄／183 列：教材 274／127、一般詞 87／34、例句 29／18、筆記 4／4。

教材為《萬詞譜》LV3 Unit 09，第 83–94 頁；第 95 頁已目視確認為 Unit 10 邊界。13 張原照均逐張查看實像，核對等級、單元、頁碼與相關文字，不以雜湊代替目視。第 83 頁為 20260815_093043.jpg，第 94 頁為 20260815_093348.jpg，邊界為 20260815_093353.jpg。完整照片清單、頁碼及雜湊見 [來源證據](source-manifest-revision-v2.json)；原始轉錄見 [LV3Unit9.json](../../scripts/sources/LV3Unit9.json)。原照片、轉錄及主 Excel 未改。

- 24 個教材占位義已補齊；27 個 null official IDs 仍為 null／read_only，不建立虛構一般詞 ID。教材義限本章，一般詞保留有依據的其他義。11 列僅同義措辭差異未改；6 個名詞片語／縮寫的 n. 是語法正規化，不冒稱原頁另印詞性。
- 63 個 explanation 是依原頁補足教學內容，不是 63 個事實錯誤，也不代表新增教材例句或題目。另修正 8 筆明確例句詞性、9 筆 stop 例句的情境詞性／義項提示、4 個筆記的範圍或被動義，以及 10 詞的 18 個用法欄。
- 16 筆新增 verbForms 為 bang、breathe、bump、freeze、dare、persuade、quit、quote、risk、halt、prey、cotton、flour、loose、cone、hay。均使用 Collins 主詞條或 conjugation 直接明標過去式及過去分詞的證據，不由籠統 inflected forms 推論。逐欄 publisher、URL、精確摘錄、locator、日期及核對方式保留於 [修正紀錄](U09-patches.json)。8 筆既有三態未宣稱本輪全部重新外查；sculpture 缺直接雙標籤證據，未補三態。
- 原 status、review、正式主鍵、完整 beforeRow、欄位存在性及有來源的少見舊義均保留。inferior 的真實名詞義未刪，舊 needs_check 未升級。未無來源補入音標、音節、重音、發音或例句；正式試題來源未逐一外查，既有 exam／reviewed 標記不代表本輪重新認證。

## 五個特別保護欄位

兩個 pattern 屬原書限定詞的轉錄修正，與一般例句的三欄史實修正分開處理；均已經精確完整 patch 契約核對，未放寬一般保護欄位。

1. **G023 pattern，第 86 頁，20260815_093134.jpg**：原「-ior結尾的形容詞表比較，不與than並用，與to並用」漏掉原書的「若干」。修正為「若干以 -ior 結尾的形容詞有比較級意味，與 to 並用，不與 than 並用」。保留原提醒形式，superior／inferior／senior／junior 的具體說明放在 explanation。原照明示「英文中若干以 -ior 結尾的形容詞有比較級的意味」。
2. **G055 pattern，第 92 頁，20260815_093256.jpg**：原「top the charts（chart用在唱片語中恆用複數）」誤讀原書「在上列片語中」。修正為「top the charts（此片語中的 charts 用複數）」，不將此限制泛化為所有 chart 用法。
3. **EXc9bfeeee 的 sentenceEn、sentenceZh、blankSentence**：原「France has been a republic since the late eighteenth century.」及「法國自十八世紀晚期以來一直是共和國。」暗示共和政體未中斷。修正為「France first became a republic in the late eighteenth century.」、「法國在十八世紀晚期首次成為共和國。」及「France first became a _____ in the late eighteenth century.」。答案 republic、例句 ID 與原 reviewed 狀態不變，完整原句保留。原先刪成「France is a republic.」的候選未採，因為會丟失歷史時間資訊。

法國史實依據為 [國民議會報告第 1479 號，Tome I](https://www.assemblee-nationale.fr/dyn/docs/RAPPANR5L17B1479.raw)，明示 1792 年「proclamera pour la première fois en France la République」；[Élysée 保存的 1795 年憲法第 372 條](https://www.elysee.fr/la-presidence/la-constitution-du-5-fructidor-an-iii-22-aout-1795)記錄 1792 年成立日期；[Élysée 共和國總統選舉史](https://www.elysee.fr/en/french-presidency/electing-presidents-of-the-french-republic)明示第二帝國二十年及 1870 年再宣告共和。這是史實修正，不是為配合圖片改變例句意思。

## 圖片範圍與現況

原盤點的 21 張 active 圖均已目視，並對照義項、例句、雙語圖說及跨單元使用位置。81 張一般卡及 278 個實際 tab 的圖像盤點沒有額外 active 圖。

60 個沒有 active 圖的一般詞，依既有 text_only、可空白圖片解析規則、registry、核准素材及既有例句逐筆判定為：明確應有圖而缺失 0、原本允許無圖 60、無法確認 0。因此沒有將 60 筆空白自動視為欠圖。27 個 null-ID 不造正式 ID；quote／release 原缺英文圖說保留，medium 的圖片呈現另一個真實一般義，不當作錯圖刪除。

**persuasive（W003733）已完成修圖**：右側朋友原本收合的傘改為撐開，保留原雙語圖說與句意：

- EN：Doudou's practical demonstration is persuasive, and a friend opens an umbrella too.
- ZH：豆豆用實際示範說服朋友也撐起雨傘。

新圖為 1024×1024，SHA-256 `da5d078153142abfcbdbfadfc330c86bf8e5823067af53050dbd438e8d71d6d4`，原圖保留。正式一般卡為唯一 active 圖片詞條；教材關聯 LI-LV3U09-V089、LI-LV4U01-V042 仍是 text_only，未新增教材插圖或原創例句。圖修補後、U09 文字套用前的 [23 項普通回開檢查](../image-repairs/20261108/W003733-persuasive-v2.runtime.md)已通過，包括一般卡、縮圖、30 詞單元卡及 LV4 關聯。這不是新文字版本 AFTER、正式 PWA 或離線驗收；生成筆觸亦不宣稱未修區域逐像素不變。

## 可追溯性與保留限制

正式套用採 accepted-proposals-source-inline-v3；其產品內容與原獨立 expected-after 一致，France 官方來源改為逐欄直接內嵌。其餘 60 個 evidenceTextRef／22 個唯一 JSON pointers，均可由公開修正紀錄同層的來源副本解析，sourceId／URL 相符。歷史 v2 的 69 個 references 不當作目前數量。

`source-manifest-revision-v2.json` 為 U09 永久不可變證據副本，34938 bytes，SHA-256 `60ef9ccdeaa259865e67531cc3a4635ea7032445f7fc21d3850b8d453614782e`；後續單元不得同名覆寫。每個修正欄位均保留精確 before／after、理由、來源及 stable finding ID。修改前全卡封存與獨立完整文件預期見 [BEFORE 紀錄](U09-before-qa.md)及 [套用驗證](U09-fixture-validation.md)。手機尺寸為桌面瀏覽器模擬，不宣稱實體手機；U09 文字套用後的功能、畫面及發布驗收仍待完成。
