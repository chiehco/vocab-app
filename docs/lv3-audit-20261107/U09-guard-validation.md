# U09 guard 驗證紀錄

日期：2026-11-08。測試時 HEAD：`c2c02cec2ed7aa8139f129aa2039bc3f7e344961`。
本階段僅完成 7 檔 guard／fixture 支援接入；U09 產品尚未 compile、seal、apply 或發布。本紀錄沒有執行提交。

## 固定範圍與保護

僅接受 `LV3-U09` 的三個完整固定 patch：

- `curriculum`／`src/features/direct/curriculumLV3Unit9.json`／`learningItemId`：`LI-LV3U09-G023` 與 `LI-LV3U09-G055`，各自要求精確的 `pattern`、`explanationZh` 配對。
- `examples`／`public/data/v1/examples.json`／`exampleId`：`EXc9bfeeee`，`sentenceEn`、`sentenceZh`、`blankSentence` 必須一起更新。保留 France 首次成為共和國的十八世紀晚期資訊，不再暗示共和政體從未中斷；完整原列的 word、詞性、答案 republic、status 等維持原值。

兩語驗證均綁定完整 unit、dataset、path、key、id、before、after、reason、evidence、逐欄來源及 finding 身份。來源取自凍結的 `accepted-proposals-source-inline-v3.json`；France 官方原文摘錄已 inline，兩個 grammar 保留照片身份、雜湊及原文。來源 metadata 記錄審查，不自行構成已讀來源的證明；驗證不在執行時讀取 output 來源引用。

通用 allowlist 與保護欄不變。只有精確 France patch 得到 sentenceEn 例外；乾淨的 explanation-only 舊路徑仍合法且專用 guard 為 false。殘留 pattern 證據卻缺 pattern 的契約必須拒絕。

負例涵蓋錯 unit／id／path／key、完整 before 或保護欄變動、缺欄、舊新值混用、未知額外欄、缺少／竄改／重複來源，以及真來源旁附加錯來源。每案重算 scope 與列雜湊，避免僅因舊雜湊而誤判拒絕；正例另驗證精確正向與反向還原。

## 測試與等價依據

- U09 共有 406 案（8 正例、398 負例）。v2 僅將重複 fixture 壓縮成三個 base 與明確 mutations；逐案展開後，完整 patch、unit、名稱及兩種驗證預期均與 v1 語義 SHA256 相同。原 v1 patch 與展開 fixture 保留。
- 主樹 TypeScript scope／guards：608/608；Python smoke：16/16；fixture 身份、路徑及 summary：27/27。
- 完整 Python guard 矩陣 593/593 沿用先前通過結果，23 個相關程式、fixture 與依賴檔逐位元相同；沒有重跑相同完整矩陣。先前 TypeScript 593/593 亦保留，主樹 608 案包含再驗證。
- 強制全專案 tsc、變更 TypeScript 檔 focused lint、git diff --check 均通過。既有 5,000 ms timeout 不變，未縮減測資或重跑完整歷史產品 fixtures。
- U09 fixture 精確登錄 words、examples、notes、curriculumLV3Unit9 四個來源檔，加 meta、sa-pack，共六路徑；預期依獨立候選建立，非觀察實際寫入結果。後續使用獨立 `U09-sealed-capture.json`，原 `U09-before-capture.json` 不改。

首次套用時，Git 將批准的 LF 轉成 CRLF，精確位元斷言因此失敗。逐檔確認僅換行不同後，只將批准的 7 檔寫回原 LF bytes，沒有更改 Git 設定。失敗紀錄保留，修復後全部 raw hashes 與已測候選一致。

## 未變內容與封存

接入前後核對：144 產品輸入、84 份既有 audit 文件、67 份既有 U09 來源審查檔、116 份 source JSON 全部未變，原候選與 before 資料保留。此處數量是新增本紀錄前的保護集合。

`output/playwright/lv3-u09/before-seal-index.json` 保留 805 個 artifact，索引 SHA256 為 `61223283b822f9e6092a74eba054fe5961d48e62555a77fd31acf8bcc45f2dc8`。本次重新核對索引，以及 `U09-before-qa.md`、`U09-before-capture.json` 兩份外部文件的大小與雜湊；805 檔完整掃描沿用剛完成的 persuasive 圖片 QA 結果，本次沒有再掃描全部 805 檔。

## 證據定位

保留證據根目錄為 `../lv3-u09-review-scratch-20261108/contract-support/`（相對儲存庫根目錄）。下列路徑均相對此證據根目錄：
- 最終結果與逐檔身份：`main-validation-v1/final-report.json`、`main-validation-v1/landing-and-reuse-proof.json`。
- 完整證據雜湊索引：`main-validation-v1/final-artifact-hashes.json`；各檢查 log 與換行失敗紀錄同目錄。
- 最終差異：`main-validation-v1/landed-final.patch`，與 `candidate-v2.patch` 相同，SHA256 `1b806058c52efa03033f468cdad75f67e866b31fd2f78adda4b85a4665947142`。
- 壓縮逐案證明：`fixture-expansion-proof-v2.json`；原版：`candidate-v1.patch`、`expanded-mutation-fixtures-v1.json`。

證據檔 SHA256：

- `final-report.json`：`6b04792f354c3de68585f37f5de239177318b7aca57a1b02fa4a257f8477d1f4`
- `landing-and-reuse-proof.json`：`fb33a8aae9245ddf82fac11d1c7b0ac865dbb1ac1fd262403d8a612a0eb6e9ce`
- `final-artifact-hashes.json`：`6cae673b395bcaea7a19cda43fe9a6cecbebd452e83b1ce876254839f984d32e`
