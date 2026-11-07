# LV3 U02 全面審查與修正摘要

日期：2026-11-07。本文記錄已套用的 U02 文字修正及獨立圖像盤點，不代表整個單元已發布或全部驗收完成。

## 目前狀態與範圍

- [U02-patches.json](U02-patches.json) 已封存為 ready，37 列修正已實際套用，六個產品檔的語意與位元組雜湊已核對。封存 manifest canonical SHA-256：`3ca25889cb2154233e88b1c543a818a2999e76ed7959bc892633f807490a6c24`。
- 37 列分為：23 words、5 examples、1 note、1 curriculum learningItem、7 grammarQuestions。共 64 個精準欄位位置；以整個 options 陣列等頂層欄位計算則是 57 欄。這不是新增 37 張字卡。
- 四個來源檔為 `public/data/v1/words.json`、`examples.json`、`notes.json` 與 `src/features/direct/curriculumUnit2.json`；另同步衍生 `public/data/v1/meta.json`、`sa-pack.json`。同一 curriculum 檔包含 learningItems 和 grammarQuestions 兩個容器。
- U02 套用後的 178 教材項／116 一般卡桌面瀏覽器驗收已完成，詳見 [runtime QA](U02-runtime-qa.md)。合併後 focused 37項、Python 32項、強制TypeScript、lint及build均已通過，詳見 [integrated validation](U02-validation.md)。最終 LV3 全套回歸尚待批次完成後執行；尚不宣稱推送、部署或正式站通過。

## 已完成的審查覆蓋

- 138 詞彙與 40 grammar learningItems，共 178 項；另逐題閱讀 40 grammarQuestions 的題幹、160 個選項與解說。
- 116 個正式一般卡映射、22 個未映射教材補充詞；映射核對未發現 wordId／詞形錯接，沒有為補充詞新增 ID。
- 183 筆正式例句、98 筆筆記、15 筆既有義項已納入文字盤點。這是審查覆蓋數，不是宣稱每個詞的全部歷史義項均已獲得詞典完整驗證。
- 教材照片 p11–22 逐檔 SHA-256 符合來源 manifest，並逐頁目視：p11 明示 Level 3 Unit 02，p11–21 包含 27 個印刷主詞與延伸內容，p22 為空白 Notes 邊界。原照片未修改；審閱縮圖只留本機證據。

## 已套用的主要修正

### 詞性與字典內容

- 五筆正式例句詞性：fake 的 faked 改為 v.；accomplishment、achievement 改為 n.；return to normal 的 normal 改為 n.；graphics 改為 n. 並補上電腦圖像／畫面的義項提示。原例句、翻譯、填空與答案保留。
- underlying 的主詞性與 posAll 由 v. 改為 adj.。教材 p19 及現有 underlying cause／reason 等用法均為形容詞；沒有把它當作 underlie 的新動詞 ID。[Collins underlying](https://www.collinsdictionary.com/dictionary/english/underlying)、[Oxford normal](https://www.oxfordlearnersdictionaries.com/definition/english/normal_2)、[Cambridge graphics](https://dictionary.cambridge.org/dictionary/english/graphics) 提供相應詞性依據。
- 修正 prohibit、bore、attain、bankrupt、feedback、analyze 等錯誤或容易誤教的搭配模板；保留合法的 attain to N、bankrupt 名詞義、bore 的冷僻義與技術領域 feedback 用法，不把教學模板簡化寫成普遍禁則。
- imagination 移除未獲來源支持的「聽覺」；immediate family 的用法翻譯不再成為「立即的家人」。timber 的「用木材建造」與 academic 的「大學生」經查證保留並標示所屬詞性，未擅自擴張這兩詞的主詞性欄。
- 四個 meaningEn 家族義拆分為 attain、achievement、accomplishment、achieve：只保留各詞頭對應的既有英文釋義片段，移出的相關詞片段留在研究記錄，不自動轉寫其他詞條。achievement 的相關動詞搭配另明示 related verb。[Collins attain](https://www.collinsdictionary.com/dictionary/english/attain)、[achievement](https://www.collinsdictionary.com/dictionary/english/achievement)、[accomplishment](https://www.collinsdictionary.com/dictionary/english/accomplishment)、[achieve](https://www.collinsdictionary.com/dictionary/english/achieve)。
- hate 筆記把 V-ing 與 to V 的等號改成並列用法，說明語意重點及 would／should hate 後的限制。[Cambridge verb patterns](https://dictionary.cambridge.org/grammar/british-grammar/verbs-followed-by-ing-or-infinitive)。

### 15 組有直接來源的動詞三態

每組均以 Collins 明載的 past tense／past participle 或 conjugation 表核對，不靠字尾規則推算。各組來源 URL 保存在 manifest 的 verbForms.sourceRef。

- achieve／achieved／achieved；bore／bored／bored；fake／faked／faked。
- perform／performed／performed；prevent／prevented／prevented；represent／represented／represented。
- vary／varied／varied；analyze／analyzed／analyzed；bankrupt／bankrupted／bankrupted。
- disadvantage／disadvantaged／disadvantaged；drill／drilled／drilled；strengthen／strengthened／strengthened。
- ban／banned／banned；prohibit／prohibited／prohibited；attain／attained／attained。

bore 不與 bear／bore／borne 混淆；analyze 保留原美式拼字。[Collins bore](https://www.collinsdictionary.com/dictionary/english/bore)、[analyze conjugation](https://www.collinsdictionary.com/conjugation/english/analyze)。

### 文法題的答案唯一性與字形

五題僅調整干擾選項及相關解說，保留原題幹、正解選項與答案 ID：

- Q02：D smoke → to smoking，避免 smoke 的名詞「煙霧」讀法成為另一答案；C 解說不再把 allow 的受詞一概限為動名詞。
- Q05：A consenting → to consent，避免所有格＋動名詞形成另一合法解析。
- Q19：C of → onto，排除 solution of 的語域爭議，不宣稱原 of 在所有語境都錯。
- Q22：D damage → to be damaged，排除名詞解析風險。教材 p15 的 prevent ... from N/V-ing 來源說明保留。
- Q40：B 改為 We walked downtown to after lunch.；解說指出時間片語前多餘的 to。正解解說限定本句 downtown 作副詞，不否認它另有名詞用法。

三處繁體字同步為「項」：G15 explanationZh、Q15 targetMeaningZh、Q21 的 D 選項 rationaleZh。

G10 management 的「教材所示／通常」原已有限定；allow／permissive 的中文精細化屬可選潤飾，未當硬錯，也未套用。downtown 用法模板及 academic／timber 主詞性擴張亦未套用。

## 圖像盤點與已確認邊界

- 138 詞中，47 詞有可達圖像綁定，91 詞沒有可達綁定。共 48 個可達路由綁定／47 個獨立可達圖檔，slender 有兩條路由。這不是 48 個不同詞，也不是全部教材原句均有圖。
- 初始候選盤點另含 weakness 的未映射 alias 圖；它不構成可達一般卡綁定，不納入上述數字，沒有為此補 ID。
- permissible 舊一般卡圖與門口通行圖說不符，已另案替換。新圖在一般卡與 image-clue 題的實際瀏覽器畫面、圖說、HTTP 資產雜湊已核對；詳見 [U01/U02 image runtime QA](U01-U02-image-runtime-qa.md)。新圖 SHA-256：`a5af5eaebfa9058347db55aa708d3c0bf01dc4481bee4000a11661667d5a467d`。教材原本的展覽廳小袋句仍未綁圖，沒有挪用門口圖來冒充。
- achieve 橋圖未找到同圖 prompt／caption，配對仍 **pending**。另一張 doctor 圖雜湊不同，其圖說不能移用到橋圖。
- perform 保留「執行」與安全檢查原句，不能用樂團表演情境取代；slender 既有舞者批准保留。圖像盤點不自動構成新的美術批准。
- 圖像 runtime 證據只覆蓋其報告列出的本機一般卡與 image-clue 路徑，不代表動態 WordBeast、SRS／arena、離線 PWA、實體手機或正式站全部通過。

## 驗證結果與尚待完成項目

[U02 fixture validation](U02-fixture-validation.md) 記錄的是套用前的隔離 fixture 階段，不應把其中「未實際套用」的歷史敘述當成目前狀態：

- U01 Python fixture 11/11、U02 最終 Python fixture 7/7、focused TypeScript 8/8 通過；獨立 144 項 before-input 雜湊比對一致。
- fixture 已驗證六檔寫入、精確反向還原、冪等、第二次替換失敗回復及來源漂移拒絕。首次 harness-only 失敗與修正後重跑均保留記錄，沒有抹除失敗。
- 後續實際工作樹交易已套用37列，六檔語意與位元組雜湊核對符合封存值；這不取代瀏覽器或完整整合驗證。
- 桌面瀏覽器已逐張重開178教材項／116一般卡，核對37列／57個執行中欄位、26詞條頁籤及7題實際文法作答分支。48個圖片呈現成功載入，測試作答關閉重開後完整保留，詳見 [runtime QA](U02-runtime-qa.md)。
- 合併後 scoped 驗證已通過：原命令focused 8檔37項、Python 11＋13＋8項、強制TypeScript、lint、build；全部舊expected hashes保留，原失敗及修補記錄見 [integrated validation](U02-validation.md)。Lint仍有既有與本機QA script warnings。
- **Pending：** 整個LV3批次的完整回歸及正式發布驗收。實際手機、離線PWA與歷史SRS遷移不在本輪桌面驗收範圍。
- **未聲稱：** U02正式發布、正式站驗收、實體手機驗收。U01的原G33仍屬另一待處理項目，本輪未改。

教材原創例句、正式例句、填空、文法題幹、正解與各種既有 IDs 保留；未改母表、SRS或學習紀錄。字典英文釋義與干擾選項確有上述窄幅修改，因此不能概括為「所有英文未改」。

## 證據識別與公開資料邊界

公開的精準 before／after、欄位來源與輸入雜湊以 [U02-patches.json](U02-patches.json)、[U02-scope.json](U02-scope.json)、[U02-before-capture.json](U02-before-capture.json) 為準。照片例：p11 `20260815_091521.jpg` SHA-256 `f700ab1e923f01a37f030c0d0537da15d38d5bf7738f31e49db27ec26b6ffd2e`；p21 `20260815_091828.jpg` SHA-256 `e2920e39c309431a3d8c192e27d4557cbe6934226d4a2104f3f8bc291c19f69d`；p22 `20260815_091837.jpg` SHA-256 `3a59fc72e306617e6c8a79d8dcb14d681dc252d6aaacb1ede2b8398f5bd05ef8`。

逐項研究檔識別為 `u02-source-review`、`u02-dictionary-verification`、`u02-grammar-review`、`u02-verb-forms-verification`、`u02-image-review`，各有 JSON／Markdown版本；實際套用核對為 `U02-actual-application-verification.json`。完整來源照片、本機路徑、私有快照與交易明細僅留 output，不在本文發布。
