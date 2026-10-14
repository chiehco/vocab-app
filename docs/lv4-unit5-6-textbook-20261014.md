# LV4 U5–U6 文字教材候選

獨立 checkout：`C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`，分支 `draft/lv4-u5-u6-textbook`，基底 `28caaf562d45cff1b3cf83726a15fa2935634e69`。前兩批 exact commit 固定不動；PR、合併與部署交父任務集中處理。

| 項目 | U5 | U6 |
|---|---:|---:|
| 逐頁目視正文範圍 | p43–53 | p55–66 |
| 編號主詞 | 33 | 27 |
| 無編號獨立主詞 | 13 | 19 |
| 主詞合計 | 46 | 46 |
| 補充詞（含印刷註詞） | 88 | 71 |
| 詞彙字卡 | 134 | 117 |
| 用法與搭配 | 45 | 50 |
| 完整群組項目 | 179 | 167 |
| 唯一既有正式ID | 100 | 92 |
| 無正式ID的文字項目 | 34 | 22 |

跨單元189個既有正式ID。U6的intensive保留p55補充詞與p56獨立主詞；contestant保留兩個印刷用途，comment保留vi.／n.兩種詞性卡，正式字卡則去重。所有映射為唯一精確既有詞目；co-worker等未映射詞保留來源字形、詞性與中文，不猜字庫同義對應，不造新 wordId／senseId。

啟動包2,222→2,318字，新增96個已有正式ID的詞條；全部舊2,222列逐欄一致。正式 words.json／meta.json、package-lock、U1–U4來源與教材、U17–20、SRS、13張進度表schema、小鎮金幣程式均未改。集中整合時須按所有整合後單元重產啟動包。

## 原件核對

來源JSON：`scripts/sources/LV4Unit5.json`、`LV4Unit6.json`，含每頁照片完整路徑／SHA-256、印刷冊別／Unit／編號、主詞與補充詞身分、精確wordId映射與用法中文。

照片根為 `C:/Users/USER/Downloads/Mobile Devices/LV1/LV4/`。p54目視為Notes；手寫字未採用。p55標 Unit06，p67標 Unit07。p61時間檔 `20260814_050015.jpg` 僅83bytes損毀，改用同資料夾可讀的 `補拍_P.61.jpg`，實際印刷頁碼／Level4／Unit06已核對。正文無缺頁。

輔助初稿為 `C:/Users/USER/OneDrive/桌面/單字APP/書頁快抽/` 的 p041–045、046–050、051–055、056–060、061–065、066–070以及 `書頁快抽_p061-090_補拍更正_Terra初稿.md`。原稿原為raw_capture，全部採用文字已對照片重新核對。

修正原稿的主補身分與頁碼：occupied／occupational／adequately／slightly／incredibly為較小補充詞；expansion在expand之後；demonstration、demo與相關搭配實際在p48，非p47；eventual印刷為「終究的」。p61 approve為「與介詞of並用」，非補拍初稿的with。獨立藍色詞目與專屬例句／勾選框判定為主詞，例句本文未匯入；印刷星號註詞、屈折及用法保留。

## 驗收證據

證據根 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence/`。

- fresh `npm ci`、lint、typecheck、production build均exit0；lockfile未改。完整82檔／476項Vitest全部通過（Windows本機testTimeout30秒；CI維持15秒）。證據 `npm-ci-u5-u6.log`、`lint-u5-u6.log`、`typecheck-u5-u6.log`、`vitest-u5-u6.log`、`build-u5-u6.log`。
- LV3 Python14項、LV4 Python7項全過。證據 `python-lv3-u5-u6.log`、`python-lv4-u5-u6.log`。
- `content-audit-u5-u6.json`核對正文、Notes、下一Unit照片及初稿全部雜湊；舊啟動包、正式字庫／meta／SRS／schema／金幣程式，以及前批U1–U4與U17–20的Git物件一致。
- 新增驗收包含一次sa-pack fetch的空fake IndexedDB、全映射卡解析、重複詞性／印刷用途去重與p61補拍；全套同時驗既有13张非空進度表、SRS與金幣保留。
- 隔離新Chrome於390px驗U5入口134／43、完整177項群組／100正式卡，首卡occupy p43、尾卡tug-of-war p53與用法中文，依序開啟既有occupy W003692。U6入口117／50、完整167項群組／92正式卡，首卡assistance p55、尾卡lie p66與用法中文，一般練習實際啟動competition 1／10。兩單元無橫向溢出，console errors0。證據 `browser-u5-u6-entry-verified.log`、`browser-u6-verified.log`、`browser-u6-quiz.log`、`browser-u5-u6-console.log`。

本批為 `text_only`／`read_only`：無待審圖句、圖片、圖說、例句、教材題目或正式senseId。56項未映射文字保留供閱讀；原件、母表、其他工作樹與使用者真實瀏覽器唯讀。實體手機、Safari／Firefox與正式站部署未驗。

## p45 獨立來源 QA 修補（2026-10-14）

原批次 `2709621707b5e4d90ab808f203a839f556509d54` 的工程與瀏覽器通過為歷史結果；獨立來源 QA 發現 U5 p45 convinced 詞框漏列 `be convinced of sth`（相信某事）與 `be convinced that...`（相信……）。兩組均為印刷片語，已對完整原照核實後插回 p45 順序，U5 用法 43→45，完整群組 177→179；U6 不變。

修補來源 revision 為 `20261014-text-2`。原 177 個 learningItemId 及其全部欄位逐一保持相同，43 個舊用法 ID 明確固定；新增項目為 `LI-LV4U05-G044`／`LI-LV4U05-G045`，convinced 仍為 `LI-LV4U05-V013`、未映射且可讀。正式 ID、母表、字庫、義項、圖句、教材題、SRS、進度及獎勵程式均未改。教材與 starter 均重產；此修補僅加用法，starter 仍為 3,094 字且逐位元一致。

此獨立修補由已保存 U23／U24 SHA `ab5c3cd246a9afcbc8957181fc2a8a001952fa75` 接續，分支 `fix/lv4-u5-p45-usage`。最終 exact SHA、定向來源／啟動包／工程／正常 PWA 更新與離線證據見交接根 `u5-p45-usage-fix-handoff.json`。後續單元需以此修正版作基底，或採入完整修補提交再重產 starter；舊批3–10的固定 SHA 本身尚未含此修補。
