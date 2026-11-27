# LV3 U02 原創填空：permission 詞群五題稽核（待審）

日期：2026-11-27（Asia/Taipei）。基線 main：`41e292bddfd2b7befff53979b4c4bac26e468f74`。
本批交付資料稽核、可機讀案例及直接呼叫 production scorer 的 7 項 Vitest；不是正式題庫修正或內容批准。

## 協作與來源邊界

開始前讀取 Issue #60 全部六則留言、五個開放 PR #62/#61/#59/#55/#52 的 head、變更路徑及討論，以及遠端分支與可見工作階段。12:21 的映射稽核已由 [witch/wizard 後續紀錄](https://github.com/chiehco/vocab-app/issues/60#issuecomment-7210050834) 承接，該批沒有修改 canonical。其下一批建議是 U02 其他填空。
可見工作階段沒有另一個正在執行的此五題批次；參考聊天的新交接即本次工作。這只代表可取得的協作紀錄，不代表能觀測所有私人工作階段。
避開已稽核的 ...-105 / ...-106、#62 的 U12 配合題，以及其他四個 PR；只新增本報告、fixture、test，不改既有分支。

|固定 main 輸入|Git blob SHA|
|---|---|
|src/features/direct/curriculumUnit2.json|`735973323fe6a65c3a0ddb9c85a9b2adc236720c`|
|src/features/direct/model.ts|`81eedb1f6cd2cf8141f3e1884cf7a4aedb0088ba`|
|src/features/direct/choiceOptions.json|`1f991ffad1a5ed39d1dd2a5891e9111814d51aeb`|
|src/features/direct/DirectScreen.tsx|`0e2b2f6596fda00256b1a76ed44cccc841d2afc7`|

這些是 Git blob 指紋，不是最新版母表或原照片的批准依據。U02 共 138 個 vocabulary learningItems，138 列有 originalExample；本批只挑五題，不能外推其餘 133 題通過或不通過。

## 結果：五題都有同單元合理替換候選

以下是人工語言判讀；待獨立語言複核，不是由測試證明自然語言唯一性。題號均為 CLOZE-ORIG-20260912-LV3U02- 加末三碼。

|末碼／指定答案|合理替換候選|判讀|
|---|---|---|
|004 / allow|permit|permit + 受詞 + to V 與 allow 相同，windows permit fresh air to enter 文法、原意均成立。|
|006 / prohibit|ban|ban copying 與 prohibit copying 均可表示禁止抄襲；ban 在本單元另列為名詞，不影響這裡可作動詞的語言事實。|
|007 / permission|consent|ask for consent to record an interview 可自然表達請求錄音同意，沒有題前線索排除 consent。|
|008 / consent|permission|parental permission 與 parental consent 在分享照片情境均自然，中文「同意」也不能唯一區別。|
|009 / agreement|consent|gave their consent to the revised schedule 是合理同意表達；目標 agreement 仍保留，不把同義詞合併成同一教材身分。|

替換後的完整句子：

- 004：These windows permit fresh air to enter the basement.
- 006：The contest rules ban copying another team's design.
- 007：We asked for consent to record the interview.
- 008：The school cannot share these photos without parental permission.
- 009：All members gave their consent to the revised schedule.

五個候選詞都已在同單元列為 displayWord；因此單靠「請填本單元目標詞」不能排除這五個候選。這不表示候選在教材中的詞性、字義、Word ID 或 SRS 身分可以合併。
五題的指定答案仍各被現行 scorer 接受，上述五個候選均被拒絕；原句與 blankSentence 正解還原一致，沒有發現本批的機械填空破損。

### 四選一另有一個候選歧義

006 基礎題現有選項是 drill / remain / prohibit / allow，正解為 prohibit。
原題幹 `The contest rules _____ copying another team's design.` 沒有說明主辦方是否禁止或允許仿作；`The contest rules allow copying another team's design.` 文法及某些比賽規則情境可成立，但選 allow 會被現行評分拒絕。
這是題前語境不足的候選，並非宣稱 allow 與 prohibit 同義。其餘四題只確認正解在選項中，沒有把未出現在四選一的同義候選算成四選一多解；也未宣稱逐選項獨立語言驗收完成。

## 現行產品行為的界線

- model.ts 307–320：U02 原創題從 originalExample 生成，options=[]；isCorrectAnswer 只接受正解或明載 answerForms，未使用 catalog variants。
- model.ts 350–356：基礎題使用 BASIC_PREFIX（實值 CHOICE-）和各題既有四選項，正解為選項 ID。
- DirectScreen.tsx 107–114：可展開的「作答說明」已明示只比對目標詞、不判定其他同義表達。因此五個拒絕結果符合目前「目標詞回憶」設計，不能直接當成評分函式程式錯誤。
- DirectScreen.tsx 128–148：題前顯示英文 stem、輸入與可選首字母提示；targetMeaningZh、sentenceZh 在答後呈現。本批是核讀源碼與 model 實測，未實際操作 UI。查字／首字提示是否使用另記錄，不能假設每個學生都已取得提示。

所以這五題不應以「一般英文填空答案唯一」計入驗收，也不能把本輪七項測試通過算成語義驗收通過。

## 實際驗證與重跑

`npm test -- src/features/direct/lv3U02PermissionAudit.test.ts --maxWorkers=1`

1 檔、7 項通過。直接 import repo 的 practiceQuestions、choiceQuestions、BASIC_PREFIX、isCorrectAnswer；不是複製函式或模擬回傳。
覆蓋五題身分、workExampleId、題幹／中文目標義與固定案例一致、單空還原、候選在同單元、指定答案接受／候選拒絕、基礎正解，以及 006 allow 選項確實存在但被拒絕。額外一項核對樣本為五題而非全單元，且不含 witch/wizard。
這是現況 characterization；未來若正式修正題幹、評分或提示，須連同案例／斷言重新審核，不能為了通過而保留已消除的問題。

首次測試因 Windows 快取重新命名權限失敗，0 tests；正常快取重跑後又發現本批測試的 fixture 相對路徑錯誤，0 tests。已修正路徑並改用 production BASIC_PREFIX，最終 7/7 通過。未把先前失敗計為通過。

本機 lint exit 0（8 則既有警告，新檔無警告），修正 fixture 匯入後完整 typecheck exit 0；第一次 typecheck 在修正前讀到舊路徑而失敗，未當作通過。四個受核輸入的本機 git hash-object 與上表遠端 blob 一致。僅新增稽核文件／fixture／測試，本輪未執行完整 Vitest、build、瀏覽器、PWA 更新、乾淨安裝或實體手機驗收；CI 結果須另查此 PR 的實際 run，不能推定已通過。

## 後續最小批次與阻塞

1. 先查此 PR 是否有人接手，獨立複核這五組替換及 006 四選一的題前情境。未獨立語言複核，所有案例保持待審。
2. 若保留目標詞回憶，下一個獨立批次可針對這五題提供足以辨識目標的限制／線索，檢核同單元競爭答案；只加相同中文義仍可能無法區分 permission/consent。若要把它當一般開放填空，需先確認可接受答案政策，不能無限列舉同義詞假稱唯一。
3. 006 四選一可先加明確禁止仿作的原創題前上下文，再檢查四選項及中譯；本批未擅自套用或批准候選改句。
4. W004001 映射仍需可核最新版母表、source hash、頁18原照片及雙詞形字卡／拼寫／SRS 設計，本批沒有解除此阻塞。

沒有變更 canonical、教材、review 狀態、runtime、主表、學生資料、main 或部署。不以這個小樣報整體完成百分比。

## 2026-11-27 後續獨立修正（待審）

本報告前文及 fixture 保留原始稽核證據，不追溯改寫；後續分支從 PR #63 的固定 head `36179dc92418ce78d2835f2ff07dfd204c5d6068` 建立，僅改 006 原創例句的三個文字欄及同批測試對 live stem 的期望。新語境明確抄襲者取消資格，因此四選一的 allow 不再符合文意；ban 仍是開放填空合理替換，不改評分或答案政策。保留原 Word ID、review、題號、四選項及正式母表資料。四項候選情境解析仍在 [第二輪複核](https://github.com/chiehco/vocab-app/pull/63#issuecomment-7210868239)，未接入 runtime，不算解析功能完成。

本輪使用固定來源做 JavaScript 結構斷言，未在 repo 執行 Vitest、lint、typecheck、build 或實機。新測試等待本提交 CI。此分支依賴 #63，避免在兩個獨立 PR 中分別合併舊測試及新題幹造成失敗；不直接改 #63 分支。若 #63 先合併，由負責人重新定基底並查核 CI。
