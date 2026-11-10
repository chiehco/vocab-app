# LV3 U16 來源審閱

本報告記錄已完成的文字來源審閱與獨立重建，不代表已套用產品、完成圖片審核、瀏覽器驗證或發布。主候選與狀態補充分別保留，不默默取代彼此。

## 原稿與審閱範圍

已逐列核對192張教材卡：134詞彙（45主詞／無編號主詞、89補充詞出現位置）及58文法。96個詞彙出現位置連到95個不同正式word ID，另38個null ID保持原樣。重複surprise的動詞與名詞出現位置保持分開，未建立臆測的映射。

13張教材照片p163–p175均實際開啟可讀預覽核對。U16由p163 amaze開始，p173 hunger／hungry結束；p174為空白Notes，p175為U17 knit邊界，未把U17內容算入U16。原照片未修改，預覽與原照片hash連結保留。

一般資料已讀95詞、137例句、44註記、16義項及15媒體資料列。媒體資料列的讀取不等於圖片像素審閱。母表以唯讀ZIP/XML擷取：64工作表、829公式；mapped擷取854列、全教材擷取886列，95正式主詞均找到。全教材133個不同拼字中109有匹配。母表hash前後均為ba048a3f16b5de935b953fac28b87f07211e53b3ebfce34edaf5aaea5dcf3f25，未回存、重新計算或匯出。比較採精確ID或詞與原句／標題，不以模糊匹配覆蓋既有修正；一個young歷史例句無精確母表匹配，已留待確認。

## 主候選 v3：445欄、184列

- 教材363欄、145列：targetMeaningZh 88、chapterMeaningsZh 88、meaningSource 89、sensePos 41、explanationZh 56、pattern 1。45主詞保持原文；G034與G042保留未決。
- 一般詞庫74欄、31列，包含23組可靠詞典支持的動詞變化，以及有依據的詞義／句型修正。常用swell、shrink、grip形式不排除字典記載的其他形式。
- 7例句僅修正與填空答案一致的詞性：amazement、astonishment、tap、beam、crack、charm、crown。
- 1則since註記修正過度絕對的時態規則，保留註記原例句。

每個欄位含完整beforeRow、明確before/after、來源及來源hash。教材短英文節錄允許引號與空白正規化；中文摘要及編輯解說不冒充原書逐字引文。未採入完整教材例句。

唯一pattern更正是LI-LV3U16-G051，由過度限定now that子句時態的原標題改為「now that...（既然……）」，並說明時態依語境選擇。直接Collins本文有過去式反例，原pattern完整保留在beforeRow。clan限定為有共同興趣／利益的團體而非必然犯罪；mobster修為黑幫成員；crave for確有詞典支持，不誤刪for；communicable限定本課可傳達資訊／感受的意思，與現代communicative健談義區分，未否認字典所列古義。

主v3所有原句、中譯、填空、答案、ID、順序、status、教材review及practiceMode均保持。senses與media完整不變。完整六文件從frozen BEFORE與候選重建，不使用編譯器、applier或實際AFTER反推。獨立工作另行重建並深比較全部六文件一致。

主候選：output/lv3-audit-20261107/u16-source/accepted-proposals-merged-v3.json
SHA256：fa9d5b8a8691d0dacc89843d6a2582e0b6765d9962fe75d46d777b70b100f8c4
主完整預期：independent-expected-after-v3.json
SHA256：a88e2ab1ac933d302497b8fe1263c06be9acfdf153d17f1f9e6e24b4205c114b

## 狀態補充：另案9欄、7列

來源：general/review-status-supplement-v2.json，SHA256 ff151b1b095f4cf8a00f6a696169761860578a89b61e4d129d46ada3b96511b5。

5例句EX3e5b107b（loose）、EX5eeb2ac7（tight）、EXb888b179（amaze）、EXbfadd806（sculpture）、EXdec71249（beam）已實核語義、中譯、詞性及填空答案，候選為draft→reviewed。現有程式把exampleType=exam稱為考點句分類，語言審閱不等於原題認證；4個相關sense的學測年份／題號出處及draft維持未核，不因例句審閱連動通過。

charm義項W002139-1與W002139-2已依直接字典核對名詞與動詞意思，候選各更新needs_check→reviewed及來源註記，共4欄，保留原義項分組。以上不產生任何approved狀態，不代表圖片通過或使用者驗收。

這9欄未混入主v3。獨立覆核另接受，並建立full-independent-expected-with-status-v1.json，合計454欄、191列。套用者必須精確允許這7列status例外及兩列sense.note，不能放寬其他status保護，也不能只刪待審核標記。

## 被撤回候選與未決事項

主v1曾誤提EX2d4dd0c9由n.改v.，但配對句子的實際填空答案是meaning（名詞），原有保護註記也明確說明。母表比較與獨立覆核在產品套用前攔下；v2/v3撤回該候選，原n.保持。rejected-candidate-v1.json明確禁止套用v1，歷史產物保留。

G034「a fountain machine」對應設備仍欠可靠確認；G042對open/close the faucet的絕對禁止規則仍待可靠來源裁決。兩列未改、不算已處理。citizen例句EXcc86060a未指定投票司法管轄地，不認證18歲為普遍法律規則，也未擅改原句。

general/retained-pending-v3.json逐項保留mixed-POS、少見義與背景不足事項，包括rope、champion、statue、knight、hunger、twin、interrupt、ray、cord、gap、youth、relief等。原句未為配圖而改意。該檔是主候選的保留記錄：其中5draft與charm的狀態敘述須連同上節另案補充閱讀，不能當作補充不存在。其他未核義項、考題出處及圖片並不因文字候選通過而全部通過。

## 證據與後續界線

source-review-final-index-v1.json逐項固定原資料、字典本文、母表擷取、照片預覽、候選、完整預期、helper執行前hash及獨立報告。獨立證據在output/lv3-audit-20261107/u16-independent-review。主v3的逐欄來源鏈已修復並核對，不只依賴通用source-index。

本來源工作未套用產品、修改圖片、編譯manifest、提升ledger、提交Git、推送或部署。圖片顯示、圖句一致、實際儲存、各頁面、進度保護及上線均須後續獨立驗證。U16不能僅依本報告標為全面完成。
