# LV3 U07 用法中文顯示修正

## 狀態與範圍

本修正已在本機工作樹套用並完成指定技術檢查，尚未完成第二輪 browser after QA、完整測試套件、全專案 lint 或 build；未 commit、push 或發布。起始 HEAD 為 bbf01624c8aa4299e12d544de5376101b6419f81。

這是共用顯示層修正。產品資料零修改，既有 U07 的 171 欄／64 列、五檔 transaction、sealed manifest、scope、chain、原 source review、獨立 expected、before 與第一輪 after 證據均保留。第一輪 [U07-runtime-qa.md](U07-runtime-qa.md) 的 observe 中文未顯示結果沒有覆寫。

精確修改：
- src/features/vocabulary/usagePattern.ts：保留原 buildUsagePatternItems 實作，新增顯示模型。
- src/features/vocabulary/UsagePatternList.tsx：保留原英文清單與 aligned DOM；不等長時追加獨立中文區塊。
- src/features/vocabulary/usage-pattern.css：只針對新 fallback class 的排版。
- src/features/vocabulary/UsagePatternDisplay.test.tsx、usagePatternConsumers.test.tsx：兩個新增測試檔。
- 本說明文件。未修改任何既有測試、pipeline guard、timeout、預期 hash 或資料欄位。

## 原因與呈現契約

observe（W002582）的英文是「observe N closely; observe a rule/custom/holiday」，有兩段；已批准的中文是「仔細觀察……；遵守規則或習俗；慶祝／紀念節日」，有三段。中文三義正確，原英文把 rule/custom/holiday 合於同一段。舊 renderer 僅在段數相等時顯示中文，因而全部隱藏。

已核對 [整合來源公報](U07-review.md)、原 vocabulary accepted-proposals、整合 accepted-proposals 與獨立 expected-after。三者對應 U07-VOC-157，沿用 [Collins observe](https://www.collinsdictionary.com/dictionary/english/observe) 的原直接查核記錄；本次未重新開啟字典網站。

規則固定如下：
- English 沒有有效片段（null、undefined、空字串、空白或只有分號）時，保持原本不顯示行為，不增加 Chinese-only 功能。
- English 有內容但 Chinese 沒有有效片段時，只顯示英文，不產生空中文區塊。
- 雙邊有效、段數相等時，沿用原逐項對照；不新增 wrapper 或重複中文。
- 雙邊有效、段數不同時，英文不附臆測配對；以「中文用法說明」一次顯示完整中文，只 trim 兩端空白，保留內部標點、空白與換行。
- 分隔符仍為原有 ;／；，空片段仍忽略。以 React 文字節點輸出，不用 HTML 注入。
- fallback 單一 wrapper 使英文清單與中文說明留在 Review 背面同一個 grid cell。

兩個 runtime consumer 是 WordDetailScreen 的搭配頁與 ReviewScreen 中的 ReviewFlashcard 背面。現有 approvedCurriculumUsage override 只適用 hardware/software，不影響以下四詞。教材 observe 的 source_checked_text_only／read_only、教材義「觀察；遵守」均不變，不新增群組、答題或 SRS 紀錄。

## 目前資料影響

以既有 splitter 規則只讀盤點 6,075 筆雙邊有效資料，排除 null、空白及僅分號後，恰有四筆不等長。新測試保留獨立的完整 EN/ZH 常量。

- if（W000426，3／4）：if + clause; even if; as if。中文「如果……；即使……；彷彿……；在間接問句中表示是否」。
- immediate（W002429，1／3）：immediate + N (action/response/family/need)。中文「立即的行動／回應；最親近的家人；迫切的需求」。
- observe（W002582，2／3）：observe N closely; observe a rule/custom/holiday。中文「仔細觀察……；遵守規則或習俗；慶祝／紀念節日」。
- option（W003698，4／3）：have the option of N/V-ing; have the option to V; have no option but to V; an option to V。中文「有……的選擇權；除了做某事別無選擇；做某事的選擇」。

observe 在 starter pack 也有相同詞列；兩種資料來源共用 renderer，不重建資料包。此修正不宣稱新增審定其他三詞的語義，只如實呈現其已存中文而不強配。

## 實際檢查

以下皆以原候選首次執行通過，沒有修補候選、重寫原測試或調高 timeout：
- 指定 7 檔 Vitest：54／54 tests、7／7 files，exit 0，72.48 秒，單 worker。範圍為新增兩檔、原 UsagePatternList、wordDetailPages、groupCardNavigation、mobileReview、unit19。
- Forced whole-project TypeScript：tsc -b --force --noEmit，exit 0，62.28 秒。
- 四個新增／修改 TS/TSX 檔 focused oxlint：exit 0，0.16 秒；stdout/stderr 無診斷。CSS 未有獨立 lint 項目。
- Working-tree git diff --check：exit 0；Git 提示未來可能將兩個修改檔 LF 轉成 CRLF，並非 whitespace error。本窗口保留原候選 bytes。

測試實際涵蓋 aligned exact DOM、空值／空白／兩種分號、較多及較少中文、內部換行與文字 escape、四詞完整中文只出現一次，以及 rerender 清除舊區塊。使用真實 WordDetailScreen 開啟、離開、重開搭配頁；真實 ReviewFlashcard 前後翻面重繪驗證同一 grid cell，未呼叫 grade／known／flip callback。另固定 U07 教材 read_only identity。

## 完整性與原檢查歷史

套用前與全部檢查後獨立讀取，確認：
- 完整 144 pipeline inputs 的 raw SHA256、CRLF-to-LF SHA256 與 byte count 均等於第一輪 after capture，且窗口前後完全相同。
- before index 的 804 artifacts 與原報告、after1 v2 index 的 1,071 artifacts 與原報告逐檔吻合。
- 原 27 個 source indexed artifacts、canonical／獨立 expected、教材 source、U07 seal／scope／chain／transaction receipt 與備份均保留。
- 合計 2,450 個受保護檔的 raw／LF／bytes snapshot 前後完全相同，包含原有 tests、Python scripts 與既有 LV3 audit docs。

固定辨識：
- U07 manifest：40530f567c4bc3f8f51e592748503fcc6585b11f1698a2c6a4e5bad2be20c0ac。
- U07 scope：2d976360eace86bcc313f40b1edf74264d78ab11ff17e1ea420d1abeea548da9。
- after1 index：66369cb709b94b99f09b888cafefad9234f2469541fa7459d2805ebb90764608。
- 原 U07-runtime-qa.md：0c99e35328ff9ddcf8d155dafb29d66e0886bb074091d442a3f2569d5dda881e。

本輪首次 integrity checker exit 1，原因是錯將 source index 的歷史 publicReview hash 直接比對後來另案補充的公報。原失敗、v1/v2 檢查及輸出均保留。讀取既有 enough-classification-addendum 後，v3 正確核對版本：
- 原 index 對應封存 U07-review-before-enough-classification.md，raw a1d7f0e7665ccdc7791cb46bc9eff1f936e691633cbe3c832fa241d587ec2af0。
- 既有 EX511ba8c4-direct-source-addendum.json raw a0433e903b69fb2b0bef6794bc1abef2fdc103788b73305e904db07eaad21a0b，精確記錄唯一插入句。
- 目前公報 raw 3f7e3980110f4ad3627cad0d2a1a21456feb83d9d501b724bab1399f651f677d，與原提交 d404e2d、HEAD、窗口前後完全一致。
- 逐 bytes 確認現在公報只比封存原件多出該句 Joy/enough 分類說明；不是未知漂移。沒有改舊 index、hash 或任何來源。

## 證據與待辦

本次完整 command、stdout、stderr、exit code、耗時、套用清單及前後 snapshot 存在 [output/lv3-audit-20261107/u07-usage-display-fix-v1](../../output/lv3-audit-20261107/u07-usage-display-fix-v1/)。原候選、report 與 patch 留在原樹外準備目錄，原樣保存。

待第二輪 browser 回開四詞搭配頁，檢查桌面及 390×844 的完整中文、英文原清單、無重複與無 overflow，並查看一筆 aligned 對照。Review 背面只在既有可用入口、不新增持久活動的情況下檢查；否則明列 browser 未驗，保留本次 component coverage。完整測試套件、全專案 lint、build、正式站、實機及 offline matrix 均不在本窗口驗證範圍。
