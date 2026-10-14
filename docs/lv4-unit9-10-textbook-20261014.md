# LV4 U9–U10 文字教材候選

獨立 checkout：`C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`，分支 `draft/lv4-u9-u10-textbook`，基底 `539a524764f505e385c983001e9b75c47455eeb6`。前四批固定commit不變；PR、合併與部署交父任務集中處理。

| 項目 | U9 | U10 |
|---|---:|---:|
| 逐頁目視正文 | p91–100 | p101–111 |
| 編號主詞 | 29 | 29 |
| 無編號獨立主詞 | 17 | 16 |
| 主詞合計 | 46 | 45 |
| 補充詞（含印刷註詞） | 73 | 70 |
| 詞彙字卡 | 119 | 115 |
| 用法與搭配 | 35 | 47 |
| 完整群組項目 | 154 | 162 |
| 唯一既有正式ID | 85 | 82 |
| 無正式ID的文字項目 | 32 | 31 |

跨單元165個既有正式ID，63個無映射文字項目保留閱讀。U10照片實際是45個主詞，不以其他單元的46個推補。limitation及不同詞性的limit跨來源卡保留不同learningItemId，一般正式卡依既有ID去重。laboratory沒有精確既有ID；照片的lab縮寫只保留用法，不猜別字映射。

啟動包2,445→2,547字，新增102個已有正式ID詞條；舊2,445列逐欄一致。正式字庫／meta、package-lock、U1–U8來源與教材、U17–20、SRS、13表schema、小鎮金幣程式均未改。集中整合須依整合後全部單元重產啟動包。

## 原件核對

來源JSON `scripts/sources/LV4Unit9.json`、`LV4Unit10.json`含逐頁照片完整路徑／SHA-256、印刷冊別／Unit／編號、主補身分、精確映射與用法中文。

原圖根 `C:/Users/USER/Downloads/Mobile Devices/LV1/LV4/`；p101標Unit10，p112目視為Notes，p113標Unit11。正文無缺頁。輔助初稿為 `C:/Users/USER/OneDrive/桌面/單字APP/書頁快抽/` 的p091–095、096–100、101–105、106–110、111–115；採用文字均對照片重新核對。

修正初稿：U9 consumer、investment／investor、regulation、mechanic／mechanical、dominate、dissatisfaction、translation／translator、authentic、annoyed／annoying均按照片獨立藍字主詞保留；consume不採手寫的「消耗」，continuously不採由例句推導的句型。U10 dignify、lecturer、disturbing、prediction、forecast、ceasefire、ballet、gallery、enforcement、complicated、dependence、dependable、logical、illogical、guilty及housework均核主補身分；complication、admittance為較小黑字補充詞。補回p107 high／low frequency、p108 illogically／irrational／unreasonable、p109 economic／political reform、p110 issue／problem印刷用法。例句本文、手寫記號與待審圖句均未匯入。

## 驗收證據

證據根 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence/`。

- fresh `npm ci`、lint、typecheck、production build均exit0，完整84檔／490項Vitest全部通過（Windows本機30秒timeout，CI維持15秒）：`npm-ci-u9-u10.log`、`lint-u9-u10.log`、`typecheck-u9-u10.log`、`vitest-u9-u10.log`、`build-u9-u10.log`。
- LV3 Python14項、LV4 Python7項全過：`python-lv3-u9-u10.log`、`python-lv4-u9-u10.log`。
- `content-audit-u9-u10.json`驗正文、Notes、下一Unit照片與初稿雜湊、165個既有映射、全部舊啟動包列與U1–U8／U17–20／正式字庫／meta／SRS／schema／金幣程式Git物件一致。
- 新驗收涵蓋空fake IndexedDB一次sa-pack fetch解析U9 85／U10 82正式卡、重複limit／limitation來源卡及正式卡去重；全套同時驗13张非空進度表、SRS與金幣保留。
- 隔離新Chrome於390px驗U9入口119／35、首卡continuous p91、尾卡categorize p100、用法中文、完整154項群組／85正式卡；U10入口115／47、首卡merit p101、尾卡shorten p111、用法中文、完整162項群組／82正式卡，一般練習實際啟動lecture 1／10。無橫向溢出，console errors0：`browser-u9-u10-entry-verified.log`、`browser-u10-verified.log`、`browser-u10-quiz.log`、`browser-u9-u10-console.log`。

本批為text_only／read_only：無圖片、圖說、例句、正式senseId與教材題目。原件／母表／其他工作樹／使用者真實瀏覽器唯讀。實體手機、Safari／Firefox與正式站部署未驗。
