# LV4 U7–U8 文字教材候選

獨立 checkout：`C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`，分支 `draft/lv4-u7-u8-textbook`，基底 `2709621707b5e4d90ab808f203a839f556509d54`。前三批exact commit固定不動；PR、合併與部署交父任務集中處理。

| 項目 | U7 | U8 |
|---|---:|---:|
| 逐頁目視正文 | p67–77 | p79–90 |
| 編號主詞 | 32 | 35 |
| 無編號獨立主詞 | 14 | 11 |
| 主詞合計 | 46 | 46 |
| 補充詞（含印刷註詞） | 72 | 75 |
| 詞彙字卡 | 118 | 121 |
| 用法與搭配 | 48 | 54 |
| 完整群組項目 | 166 | 175 |
| 唯一既有正式ID | 95 | 98 |
| 無正式ID的文字項目 | 20 | 23 |

跨單元190個既有正式ID。U7 content保留p67形容詞／名詞／動詞与p68內容名詞的兩張來源卡；comedy、tragedy同時有主詞及跨詞補充用途，獨立learningItemId保留，一般正式卡去重。zip code、advisor／adviser、well-being等未映射詞保留印刷字形與中文，不猜母表別字或造新ID。

啟動包2,318→2,445字，新增127個已有正式ID詞條；舊2,318列逐欄一致。正式字庫／meta、package-lock、U1–U6來源與教材、U17–20、SRS、13表schema、小鎮金幣程式均未改。集中整合須依整合後全部單元重產啟動包。

## 原件核對

來源JSON `scripts/sources/LV4Unit7.json`、`LV4Unit8.json`含逐頁照片完整路徑／SHA-256、印刷冊別／Unit／編號、主補身分、精確映射與用法中文。

原圖根 `C:/Users/USER/Downloads/Mobile Devices/LV1/LV4/`；p78目視為Notes，p79標Unit08，p91標Unit09。p70與p89損毀時間檔改用同資料夾的 `補拍_P.70.jpg`、`補拍_P.89.jpg`，印刷頁碼／Level／Unit已核對，正文無缺頁。輔助初稿為 `C:/Users/USER/OneDrive/桌面/單字APP/書頁快抽/` 的p066–070、071–075、076–080、081–085、086–090與p061–090補拍更正版；所有採用文字對照片重新核對。

修正初稿：discontent是較小黑字補充詞，p72 zip code為獨立藍字主詞；U7 constitute在初稿的句型來自例句，未納入本批用法。U8 p84 attached為較小黑字補充詞，attachment為獨立藍字主詞。advisor／adviser僅保留照片明列的拼法，不造映射。例句本文、手寫記號与待審圖句均未匯入；印刷星號註詞、屈折與用法保留。

## 驗收證據

證據根 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence/`。

- fresh `npm ci`、lint、typecheck、production build均exit0，完整83檔／483項Vitest全部通過（Windows本機30秒timeout，CI維持15秒）。證據 `npm-ci-u7-u8.log`、`lint-u7-u8.log`、`typecheck-u7-u8.log`、`vitest-u7-u8.log`、`build-u7-u8.log`。
- LV3 Python14項、LV4 Python7項全過：`python-lv3-u7-u8.log`、`python-lv4-u7-u8.log`。
- `content-audit-u7-u8.json`驗正文、Notes、下一Unit照片與初稿雜湊、190既有映射、全部舊啟動包列與U1–U6／U17–20／正式字庫／meta／SRS／schema／金幣程式Git物件一致。
- 新增驗收涵蓋空fake IndexedDB一次sa-pack fetch解析全部U7 95／U8 98正式卡，重複content不同詞性／來源卡與正式卡去重；全套同時驗13張非空進度表、SRS與金幣保留。
- 隔離新Chrome於390px驗U7入口118／48、首卡pace p67、content p67（滿足）與p68（內容）各自正確、尾卡shady p77、用法中文、完整166項群組／95正式卡。U8入口121／54、首卡prominent p79、尾卡cement p90、用法中文、完整175項群組／98正式卡，一般練習實際啟動install 1／10。無橫向溢出，console errors0：`browser-u7-u8-entry-verified.log`、`browser-u8-verified.log`、`browser-u8-quiz.log`、`browser-u7-u8-console.log`。

本批仍為text_only／read_only：無圖片、圖說、例句、正式senseId與教材題目。43項未映射文字保留閱讀，原件／母表／其他工作樹／使用者真實瀏覽器唯讀。實體手機、Safari／Firefox與正式站部署未驗。
