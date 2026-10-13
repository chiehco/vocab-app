# LV4 U3–U4 文字教材候選

獨立 checkout：`C:/Users/USER/Documents/Codex/2026-10-14/task/vocab-app-lv4-local`，分支 `draft/lv4-u3-u4-textbook`，基底 `03bd97ab14e7a2df30b843bdd4ad8996a10ec5b4`。首批 U1／U2 的 exact commit 固定不動，本批只新增 U3／U4；PR、合併與部署交父任務集中處理。

| 項目 | U3 | U4 |
|---|---:|---:|
| 已逐頁目視教材範圍 | p23–32 | p33–42 |
| 編號主詞 | 28 | 25 |
| 無編號獨立主詞 | 18 | 21 |
| 主詞合計 | 46 | 46 |
| 補充詞（含印刷註詞） | 60 | 77 |
| 詞彙字卡 | 106 | 123 |
| 用法與搭配 | 40 | 43 |
| 完整群組項目 | 146 | 166 |
| 映射唯一正式 ID | 89 | 105 |
| 無正式 ID 的文字項目 | 16 | 18 |

跨單元194個既有正式ID；U3 的 create 在不同教材關係下保留兩個 learningItemId，一般字卡去重。所有映射均為唯一精確既有詞目，不造新 wordId／senseId，34個未映射詞保留照片核對的詞性與中文供閱讀。完整清單見 `scripts/sources/LV4Unit3.json`、`LV4Unit4.json`。

啟動包2,099→2,222字，新增123個已有正式 ID 的詞條；全部舊 words 列逐欄一致。正式 words.json／meta.json、U1／U2 來源與教材、U17–20、SRS、13張進度表schema、小鎮金幣程式未改。

## 原件核對

原圖為 `C:/Users/USER/Downloads/Mobile Devices/LV1/LV4/`；逐頁照片檔名、SHA-256、實際 Level／Unit、印刷編號與來源頁碼保留在來源JSON。U3下一單元p33標 Unit04，U4下一單元p43標 Unit05，本批正文無缺頁。轉錄輔助來源為 `C:/Users/USER/OneDrive/桌面/單字APP/書頁快抽/` 的 p021–025、026–030、031–035、**p036–040更正版**、041–045 初稿；原稿原為 raw_capture，本輪僅採用照片逐頁核對過的文字。

已修正初稿的順序／身分問題：U3 anniversary 是p29無編號主詞，frame 印刷19、oppose21、embarrass22；disappointment 從p30開始，objection用法與object在p30。U4 p35印刷 intend（vt.）為主詞7，intent（adj.）為另一補充詞；p36 financial、philosopher、philosophical均為無編號獨立主詞；company、preservative、distinctive、distinction為較小補充詞；minister24與ministry從p42開始。獨立藍色詞目與專屬例句／勾選框判定為主詞，例句本文未匯入。

## 驗收證據

本機證據根 `C:/Users/USER/Documents/Codex/2026-10-14/task/lv4-evidence/`。

- 本批重新 fresh `npm ci` exit0，lockfile未改；安裝後定向重跑U1–U4與13表保留共13項全過。本批空 fake IndexedDB 一次 sa-pack fetch 解析U3全部89／U4全部105正式卡，無全字庫依賴。證據 `npm-ci-u3-u4.log`、`fresh-install-u3-u4.log`。
- 完整81檔／469項Vitest執行：468項通過，既有LV1圖片雜湊測試一次15秒超時；單獨改60秒上限重跑該檔4項全過，實際測試1.65秒。新增本批5項與首批13表非空進度保留測試均通過。證據 `vitest-u3-u4.log`、`lv1-hash-u3-u4-retry.log`。
- lint、typecheck、production build均exit0；LV3 Python14項、LV4 Python7項全過。證據 `lint-u3-u4.log`、`typecheck-u3-u4.log`、`build-u3-u4.log`、`python-lv3-u3-u4.log`、`python-lv4-u3-u4.log`。
- `content-audit-u3-u4.json`核對所有照片雜湊、194個既有映射、舊2,099啟動列、正式字庫／meta／SRS／schema／金幣程式與U17–20的Git物件一致。
- 隔離Playwright Chrome於390px驗U3入口106／40與89一般練習，首卡device p23、尾卡hurt p32、用法中文、完整146項群組／89正式卡；U4入口123／43与105一般練習，首卡devote p33、尾卡center p42、用法中文、完整166項群組／105正式卡。U4一般練習實際顯示accomplish，1／10。無橫向溢出，console errors0。證據 `browser-u3-u4-entry-verified.log`、`browser-u4-verified.log`、`browser-u4-quiz.log`、`browser-u3-u4-console.log`；初次等待錯誤只是測試腳本使用了錯誤首用法／未含query的群組URL，穩定snapshot後已重驗。

本批仍為 `text_only`／`read_only`：無待審圖句、圖片、圖說、例句、教材題目或正式senseId。原件、母表、其他工作樹與使用者真實瀏覽器唯讀。實體手機、Safari／Firefox、正式站部署未驗。後续按完整原件每批兩單元繼續，U17–20跳過既有發布內容。
