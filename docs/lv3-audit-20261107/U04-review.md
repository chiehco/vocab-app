# LV3 U04 全面檢查與修正審閱報告

日期：2026-11-07。此報告記錄教材、正式字庫、例句、註記及圖片的審閱結果，以及文字修正從封存、隔離驗證到本機套用的狀態與驗證邊界。

## 目前交付狀態

文字修正 **173 欄、79 筆資料列**已依同一封存 manifest 完成本機實際套用，寫入 6 個產品檔案；備份與全部 after hash 已驗證，138 個範圍外輸入保持不變，chain 與交易 receipt 均為 committed。重複套用回報 already_applied，產品寫入為 0。這裡的 committed 指修正鏈／交易狀態，不等同 Git 提交或發布。

隔離 fixture 驗證已通過：實際 Python suite 9/9、receipt/artifact checks 2/2，TypeScript／Python 對 79 列與 6 檔的正向／逆向結果一致。**2026-11-07 UTC，U04 本機逐單元審閱與驗收已完成：全卡 after、同一隔離 profile 重開、scoped tests、強制全專案 TypeScript、lint 與 build 均有最終通過證據。尚未推送發布，實體手機未驗。** replace 圖片的既有整合與瀏覽器驗收仍是另列的已完成範圍，本次文字套用後驗收則另有下列完整紀錄。

封存階段歷史：2026-11-07 初稿記錄 manifest readiness=ready、chain=prepared，當時尚未主樹套用、隔離 fixture 正在進行。其 before 證據仍保留；目前進展依下列 fixture 與實際套用紀錄更新，未改寫來源裁示。

- [U04 修正 manifest](U04-patches.json)
- [U04 核准範圍](U04-scope.json)
- [U04 套用前擷取紀錄](U04-before-capture.json)
- [U04 隔離 fixture 驗證結果](U04-fixture-validation.md)
- [U04 本機實際套用紀錄](U04-application.json)
- [U04 實際套用後靜態驗證](U04-validation.md)
- [U04 全卡及重開執行期驗收](U04-runtime-qa.md)
- [修正鏈狀態](chain.json)
- [replace 圖片執行期驗收](U04-replace-runtime-qa.md)
- [驗證流程](PIPELINE.md)及[流程擴充說明](PIPELINE-EXTENSION.md)

U04 canonical manifest hash：cbd33aa366048230b645bb45560892bc50380704f6b0273f275631ce9c465074

上游 U02 manifest hash：3ca25889cb2154233e88b1c543a818a2999e76ed7959bc892633f807490a6c24。套用前擷取覆蓋 144 個輸入，瀏覽器 before 與封存時已確認輸入未變。上述連結指向儲存庫內紀錄，不表示已發布至正式站。

## 審閱母數與修正數量

教材卡共 183 張，由 **122 個詞彙項目及 61 個文法項目**組成。122 個詞彙項目中，106 個有正式字庫對應，16 個為無正式 ID 的教材補充。14 個原為義項待核對的 placeholder 已納入修正；不得把 14、16 或正式字卡數混為同一母數。

正式資料閱讀範圍為 106 張一般字卡、146 筆正式例句、106 筆 notes 及 9 筆 senses。三態補齊 19 筆既有動詞的缺漏結構，另 15 筆原有三態保留。

| 資料集 | 修正欄位 | 涉及資料列 |
| --- | ---: | ---: |
| examples | 16 | 16 |
| curriculum | 98 | 26 |
| words | 56 | 34 |
| notes | 3 | 3 |
| 合計 | 173 | 79 |

逐欄草稿核對結果為 0 before 漂移、0 重覆欄位、0 noop、0 來源缺口；完整 beforeRow 和被較保守裁示取代的初稿均有保留。這是封存前內容及來源核對結果。後續 fixture、主樹實際套用與全卡 after 已另有上列證據；仍不能據此宣稱正式發布、實體手機或全部來源問題已解決。

## 教材與練習邊界

U04 維持 text_only／read_only。教材卡目前沒有教材原例句、題目或綁定圖片，沒有本輪原創教材題目可宣稱保留或完成答案唯一性驗證。補充詞不捏造正式 word ID，也不把一般字卡圖片強行接到教材卡。

本次不改正式例句 sentenceEn、sentenceZh、blankSentence、answer 或 ID。146 筆既有正式例句的填空重建已核對，但原始考試 PDF 未逐份重新驗證；既有 exam 標示不能擴張成考題來源全面重驗完成。status、review、practiceMode、母表及 SRS 資料也不在內容修正範圍。

## 已採納的內容裁示

- examples 修正 9 筆句中詞性及 7 筆義項提示。signature dish 採形容詞義；family 的 EX3619fa4a、EXee124144 限定名詞提示為「子女」，不把 start／raise a family 的整個片語當成 family 本身詞義。EX1a882ac2 保留「家庭；家人」。
- curriculum 修正補充詞及本課義項。meaningSource 的新值統一為 textbook_source_review，表示依教材核對，不表示所有中文均為逐字抄錄。info、editor-in-chief 的名詞詞性另由 Collins 支持，照片未單獨印出該詞性。
- words 只採較保守的最終字典清單，處理截斷、混入別的 lemma、明確漏掉的詞性或義項，以及必要搭配或翻譯修正。不以較簡潔為由刪除有效廣義或罕義。
- sign 的本課教材確含「表示；信號；簽署；簽名」。sign 與 train 圖已確認符合本課教材義，修的是陳舊詞義欄，不因該舊欄而換掉正確圖片。
- collective 與 express 的本課原印文字保留，包括 collective「企業集團」及 express「用快遞寄送地」。一般字典欄位的補義不冒稱教材逐字轉錄。
- 三筆 notes 修正 continual／continuous 的形容詞與副詞區別、pretend to V 不限未來動作，以及 civil rights 的統稱複數不等於禁止 a civil right。

### 歧視的標準字來源

教材 p39 照片本身印山旁「岐視」。將 W004308.meaningZh 及本課兩個 meaning 欄改用「歧視」，是依教育部校正原書的非標準字形，**不是 OCR 或轉錄錯字修復**。meaningSource 的教材核對標記不構成逐字抄錄宣稱。

- [教育部國語辭典簡編本 歧視](https://dict.concised.moe.edu.tw/dictView.jsp?ID=24436)：字頭「歧視」。
- [教育部異體字字典 歧](https://dict.variants.moe.edu.tw/dictView.jsp?ID=22460&la=1)：正字 A02071，字形說明「左半『止』」。
- 原書字形證據：20260815_092114.jpg，p39；SHA-256 見下表。

### 註記與詞性主要佐證

- [加拿大 Language Portal continual 與 continuous](https://our-languages.canada.ca/en/writing-tips-plus/continual-continuous)： “Continual describes an activity that occurs repeatedly, but with intermittent breaks.” 及 “Continuous describes something that occurs without a break in time or in space.” 保留實際語境可能重疊，不寫成絕對規則。
- [Cornell civil rights](https://www.law.cornell.edu/wex/Civil_rights)： “A civil right is a legally enforceable claim or privilege.” 僅用於單複數語言證據。
- pretend 的 p33 原句 “When I passed by, Peter pretended not to see me.” 支持不定詞不限未來動作。
- [Collins info](https://www.collinsdictionary.com/dictionary/english/info)： “uncountable noun”；[Collins editor-in-chief](https://www.collinsdictionary.com/dictionary/english/editor-in-chief)： “the controlling editor of a publication”。
- [Collins signature](https://www.collinsdictionary.com/dictionary/english/signature)： “adjective [ADJECTIVE noun]”。每筆新增三態均保留對應 Collins 來源，並有明確 past／past participle 摘錄。

## 保留事項及未決問題

沒有在單一詞典找到某義，不等於證明它錯誤。以下仍保留並待進一步分義或來源確認：frequent「快速的」、experiment「實驗儀器」、oven「子宮」、informative「見聞廣博的」、signature「簽名附件」；replacement「放回／歸還」與 scissors／scissor 的 lemma 分義也未直接刪除。

已獲字典支持的罕義保留：foreign「外省的」、tent 的醫療塞條義、stove 的加熱動詞及 stave 詞形來源、familiar 的熟友名詞、shrimp 的捕蝦動詞、elect 的被選者名詞、peanut 的渺小形容詞與 peanuts 的微小金額、the faithful 的信徒／支持者。scissors 的體操／摔角義及部分美式工具用法可有單數一致，不能寫成一律複數。

11 個 optional 欄位延後，不包裝成必改硬錯：civilize.usagePattern／usagePatternZh、nursery.meaningEn、microwave.usagePattern／usagePatternZh、bowling.usagePattern／usagePatternZh、golf.usagePattern／usagePatternZh、familiar.meaningZh、shrimp.meaningZh。保留原有泛用格式或措辭，不復活初稿中已放棄的 elect、bowling、golf、microwave 使用法清理。

G017 的原書斜線分組仍待釐清；保留原標記，不擅自發明平行義項。edit 圖片的具體動作仍不明確，未宣稱圖義驗收完成。feasible 的可行義與 probable／likely 罕義仍須分界，跨章註記未核對原章照片時，不直接刪去 implausible 等內容。

## 圖片與瀏覽器檢查

本次文字套用後已完成 173/173 runtime 欄位、79 列核對；183/183 教材卡、106/106 一般字卡與全部 379 個實際頁籤皆重新開啟。147 組修正欄位的值可在畫面文字找到，另 26 個 meaningSource 僅屬 runtime metadata；這是值存在的證據，不表示畫面有 147 個獨立標示欄位。

30/30 一般字卡圖均成功載入；只有 replace 改圖，其餘 29 張原圖路徑與 HTTP 位元組 hash 不變。390×844 桌面窄視窗子集涵蓋 10 routes、18 views，正常捲動後沒有橫向溢位或取樣文字持續遮擋。同一原隔離 profile 關閉重開後，導覽前的資料筆數、內容 metadata、進度表值及儲存狀態相符，並可正常回到保存路線。

第一次 after 檢查曾看到 starter 字庫的 75 欄舊值，原始失敗記錄保留；之後完成正常啟動同步才取得一致結果。不能宣稱更新按鈕造成更新，也不能保證一重開立即取得新字庫。詳見[執行期時序、驗收與限制](U04-runtime-qa.md)。最終重開核對沒有再跑全部逐列 hash，且此 profile 的 SRS／quiz／reward 表為空，不能等同真實使用者既有學習資料遷移驗收。

套用前瀏覽器覆蓋 183 張教材卡、106 張一般字卡、379 個可見頁籤及 30 張可到達圖片。這是 before 檢查範圍，不能當作文字套用後驗收。

replace 新圖已整合，實際一般字卡、看圖喚名題、正常作答、關閉重開與 390×844 桌面窄視窗子集均已檢查。圖片顯示豆豆替木推車更換破輪；實際回傳位元組的 SHA-256 為 cebee8173ee9d2a633e68212669b6c47178dbbe17cd9a2c69ee7b83e937fe40c。重開後測試進度保留；教材 replace 卡仍無圖片。詳見[完整 replace 執行期報告](U04-replace-runtime-qa.md)。

此窄視窗檢查不是實體手機驗收；每日動態路線未選到 replace，因此該實際消費端仍未驗，不能以 resolver 靜態覆蓋代替。SRS review、arena、正式部署及離線 PWA 也不在這份圖片驗收的完成宣稱內。

## 教材照片及來源範圍

本單元內容為 p33–42。詞彙審閱目視這 10 頁；p43 僅作下一單元邊界的雜湊核對。文法審閱另外目視共 11 張照片，包含 p43 邊界。這兩種覆蓋範圍分別記錄，不將 p43 算成本單元內容頁，也不擴張成所有外部考試來源均已驗證。

| 頁碼 | 照片檔名 | SHA-256 |
| --- | --- | --- |
| 33 | 20260815_092000.jpg | b22e6897a96a7e35b422c00f2544fba58968d385b14f2bb3178fbc7aa51b971e |
| 34 | 20260815_092031.jpg | 8638a7ccb8ec2a633817c57124803f82b4136588cb6ad8446792c0794e175be4 |
| 35 | 20260815_092040.jpg | aa211be7fed11a1795ca807f0fb5d874fd2e0efb0ff034fdd311ad17e384fc35 |
| 36 | 20260815_092047.jpg | 4bc08487a821076e1efce5f472bd82d23d842f11559b04b0691ccf8ae77cf387 |
| 37 | 20260815_092056.jpg | 0345d81229ce24ed9adae8cd7b13c8e7a334a3ee981b95bfec7cfb1cbd5f934a |
| 38 | 20260815_092107.jpg | ab282950d423c82b467e479f0b7d08a83c4d6c0ef2249794dd3ca18f47546a1e |
| 39 | 20260815_092114.jpg | 3a1be6ad13cdf30635a90b2b7db44e22bde912ff756c3025073ca318121f28d3 |
| 40 | 20260815_092125.jpg | 319addefe88f022b8cb98d7c38f960642b6c21abbd761525944968a444f03c03 |
| 41 | 20260815_092135.jpg | 9e0e353517cd47898ff738f605fbcb9e7a92dd2d55e5229d265eef8740b9492d |
| 42 | 20260815_092146.jpg | 3b147c04bbfb1b2d951b5e9f4ec5cce7e97b82255e55ff29880364abf67ec574 |
| 43 邊界 | 20260815_092155.jpg | eb6870cf10493695615342d7c4b07543f6b15f7fe7e1d8d3a13100dbfe785b07 |

## 已完成驗證與後續交付條件

1. 隔離 fixture 已完成：Python 9/9、receipt/artifact 2/2、TypeScript／Python parity 1/1；79 列與 6 檔正逆向相符。其他 focused 檢查與刻意略過項目詳見[fixture 報告](U04-fixture-validation.md)。該報告的「未主樹套用」描述限定於當次隔離測試，不是目前狀態。
2. 主樹實際套用已完成：4 個來源 JSON 加上 metadata／study pack，共 6 檔；備份、after hash 與 138 個未變輸入已驗證，冪等重跑寫入 0。詳見[application 紀錄](U04-application.json)。173 欄與 79 列範圍不變。
3. 實際套用後靜態檢查完成：27 個 TypeScript 測試檔、172 個 unique tests 都有最終通過證據，沒有 skipped tests。這是原始執行加針對性獨立重跑的合併證據，**不是一次全合跑 172 tests 全綠**。原始 timeout、checkpoint assertion 與中間失敗記錄均保留；未提高 timeout 或弱化歷史 hash 期望。Python 48 tests 通過；強制全專案 tsc、lint、build exit code 均為 0。Lint 162 warnings 與 build 的 plugin-timing／large-chunk warnings 保留，未隱藏。完整時序見[靜態驗證報告](U04-validation.md)。
4. 全卡 after、正常窄視窗捲動及同 profile 重開完成，詳見[執行期報告](U04-runtime-qa.md)。本機 U04 審閱完成不等於未知義、罕義、edit 圖動作、G017 來源斜線或所有考題原始來源都已解決；上述保留裁示仍有效。
5. 下一單元依註冊順序為 **U05**。整個 LV3 最後仍需完整測試套件與批次發布驗收；本輪沒有跑完整 2000-plus Vitest suite。尚未推送發布，不宣稱正式站、離線／PWA、實體手機或真實使用者 SRS 遷移驗收通過。

完整逐欄核准內容以[封存 manifest](U04-patches.json)及[scope](U04-scope.json)為準。本機研究記錄包括 U04-accepted-proposals-draft.json、u04-vocabulary-review.json、u04-dictionary-verification.json、u04-verb-forms-verification.json、u04-grammar-review.json 與 u04-supplement-proposals.json；這些檔名僅供稽核定位，不是公開下載連結。
